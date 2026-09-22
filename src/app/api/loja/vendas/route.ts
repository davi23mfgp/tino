import { prisma } from "@/lib/prisma"
import { comSessao, corpo, ok, ErroDeUso } from "@/lib/api"
import { caixaAberto, lojaDoLar, proximoNumero, regrasDeRecebimento, somarNoFaturamentoMei } from "@/lib/loja/dados"
import { calcularPagamento, conferirVenda, descontarTroco, totalDaVenda } from "@/lib/loja/venda"
import type { FormaPagamento } from "@/lib/loja/venda"
import { campo, validar, z } from "@/lib/validar"

export const GET = comSessao(async (sessao, requisicao) => {
  const loja = await lojaDoLar(sessao.larId)
  const url = new URL(requisicao.url)
  const limite = Math.min(200, Number(url.searchParams.get("limite") ?? 50) || 50)

  const vendas = await prisma.vendaLoja.findMany({
    where: { lojaId: loja.id },
    orderBy: { criadoEm: "desc" },
    take: limite,
    include: { itens: true, pagamentos: true, cliente: true },
  })

  return ok({ vendas })
})

/**
 * Registra a venda do balcão.
 *
 * O cálculo inteiro é refeito aqui a partir dos itens e das regras gravadas —
 * nada de confiar em total que veio da tela. Cliente adultera requisição, e
 * numa loja isso seria venda registrada por menos do que foi cobrado.
 */
export const POST = comSessao(async (sessao, requisicao) => {
  // Preço negativo ou quantidade fracionária virariam venda que abate o total
  // ou estoque com casa decimal; tudo é conferido antes de qualquer cálculo.
  const dados = validar(
    z.object({
      itens: z
        .array(
          z.object({
            produtoId: campo.id().optional(),
            descricao: campo.textoObrigatorio(120),
            quantidade: campo.inteiro(1, 100_000),
            precoUnitarioCentavos: campo.centavos(),
          }),
        )
        .min(1)
        .max(200),
      pagamentos: z
        .array(
          z.object({
            forma: z.enum(["DINHEIRO", "PIX", "DEBITO", "CREDITO_VISTA", "CREDITO_PARCELADO", "FIADO"]),
            valorCentavos: campo.centavos(),
            parcelas: campo.inteiro(1, 24).optional(),
          }),
        )
        .min(1)
        .max(10),
      descontoCentavos: campo.centavos().optional(),
      clienteNome: campo.texto(80).optional(),
      clienteTelefone: campo.texto(20).optional(),
      observacao: campo.texto(500).optional(),
    }),
    await corpo(requisicao),
  )

  const loja = await lojaDoLar(sessao.larId)

  // Produto de outra loja não pode entrar: a baixa de estoque mais abaixo
  // descontaria da prateleira de outra pessoa.
  const idsProduto = [...new Set(dados.itens.flatMap((item) => (item.produtoId ? [item.produtoId] : [])))]
  if (idsProduto.length > 0) {
    const daLoja = await prisma.produtoLoja.count({ where: { id: { in: idsProduto }, lojaId: loja.id } })
    if (daLoja !== idsProduto.length) throw new ErroDeUso("Produto não encontrado nesta loja.", 404)
  }
  const [regras, caixa] = await Promise.all([regrasDeRecebimento(loja.id), caixaAberto(loja.id)])

  const totalCentavos = totalDaVenda(dados.itens, dados.descontoCentavos ?? 0)
  const conferencia = conferirVenda(totalCentavos, dados.pagamentos)

  if (!conferencia.fechada) {
    throw new ErroDeUso(
      `Falta ${(conferencia.faltaCentavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} para fechar a venda.`,
    )
  }

  const temFiado = dados.pagamentos.some((pagamento) => pagamento.forma === "FIADO")
  if (temFiado && !dados.clienteNome) {
    // Fiado sem nome é o caderno de novo: dívida que ninguém sabe cobrar.
    throw new ErroDeUso("Fiado precisa do nome de quem levou.")
  }

  const vendidoEm = new Date()

  const cliente = dados.clienteNome
    ? await prisma.clienteLoja.create({
        data: { lojaId: loja.id, nome: dados.clienteNome, telefone: dados.clienteTelefone ?? null },
      })
    : null

  // O troco sai antes de gravar: ele volta para a mão do cliente e não é
  // receita da loja.
  const calculados = descontarTroco(totalCentavos, dados.pagamentos).map((pagamento) =>
    calcularPagamento(pagamento, regras, vendidoEm),
  )

  const venda = await prisma.vendaLoja.create({
    data: {
      lojaId: loja.id,
      caixaId: caixa?.id ?? null,
      clienteId: cliente?.id ?? null,
      numero: await proximoNumero(loja.id),
      totalCentavos,
      descontoCentavos: dados.descontoCentavos ?? 0,
      observacao: dados.observacao ?? null,
      criadoEm: vendidoEm,
      itens: {
        create: dados.itens.map((item) => ({
          produtoId: item.produtoId ?? null,
          descricao: item.descricao,
          quantidade: Math.max(1, Math.trunc(item.quantidade)),
          precoUnitarioCentavos: item.precoUnitarioCentavos,
          totalCentavos: Math.max(1, Math.trunc(item.quantidade)) * item.precoUnitarioCentavos,
        })),
      },
      pagamentos: {
        create: calculados.map((pagamento) => ({
          forma: pagamento.forma as FormaPagamento,
          valorCentavos: pagamento.valorCentavos,
          taxaBps: pagamento.taxaBps,
          valorLiquidoCentavos: pagamento.valorLiquidoCentavos,
          previsaoRecebimentoEm: pagamento.previsaoRecebimentoEm,
          parcelas: pagamento.parcelas,
        })),
      },
    },
    include: { itens: true, pagamentos: true, cliente: true },
  })

  // Baixa do estoque. Só para item que aponta para produto cadastrado — item
  // avulso não tem prateleira para descontar, e inventar um produto a partir da
  // descrição digitada criaria cadastro duplicado a cada venda.
  const comProduto = venda.itens.filter((item) => item.produtoId)
  if (comProduto.length > 0) {
    await prisma.movimentoEstoque.createMany({
      data: comProduto.map((item) => ({
        produtoId: item.produtoId as string,
        tipo: "SAIDA" as const,
        quantidade: item.quantidade,
        vendaId: venda.id,
        motivo: `Venda ${venda.numero}`,
        criadoEm: vendidoEm,
      })),
    })
  }

  // O faturamento do MEI conta a venda, não o recebimento: para o limite anual
  // vale o que foi vendido na competência, mesmo que o cartão caia mês que vem.
  await somarNoFaturamentoMei(sessao.larId, vendidoEm, totalCentavos)

  return ok({ venda, troco: conferencia.trocoCentavos }, 201)
})
