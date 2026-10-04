import { prisma } from "@/lib/prisma"
import { comSessao, corpo, ok, ErroDeUso } from "@/lib/api"
import { caixaAberto, lojaDoLar, proximoNumero, regrasDeRecebimento } from "@/lib/loja/dados"
import { calcularPagamento, conferirVenda, descontarTroco, dividirFaturamentoMei, totalDaVenda } from "@/lib/loja/venda"
import type { FormaPagamento } from "@/lib/loja/venda"
import { campo, validar, z } from "@/lib/validar"
import { competenciaDaVenda } from "@/lib/loja/contas"

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
            servicoId: campo.id().optional(),
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
  const idsServico = [...new Set(dados.itens.flatMap((item) => (item.servicoId ? [item.servicoId] : [])))]
  if (dados.itens.some((item) => item.produtoId && item.servicoId)) throw new ErroDeUso("Um item não pode ser produto e serviço ao mesmo tempo.")
  if (idsProduto.length > 0) {
    const daLoja = await prisma.produtoLoja.count({ where: { id: { in: idsProduto }, lojaId: loja.id } })
    if (daLoja !== idsProduto.length) throw new ErroDeUso("Produto não encontrado nesta loja.", 404)
  }
  if (idsServico.length > 0) {
    const daLoja = await prisma.servicoLoja.count({ where: { id: { in: idsServico }, lojaId: loja.id, ativo: true } })
    if (daLoja !== idsServico.length) throw new ErroDeUso("Serviço não encontrado nesta loja.", 404)
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

  // Cliente com o mesmo nome é o mesmo cliente. Antes cada venda fiado criava
  // um cadastro novo, e a Dona Cida de duas compras aparecia duas vezes em
  // "quem deve", cada uma com metade da dívida (achado em 28/09/2026).
  const nomeDoCliente = dados.clienteNome?.trim().replace(/\s+/g, " ")
  const existente = nomeDoCliente
    ? await prisma.clienteLoja.findFirst({
        where: { lojaId: loja.id, nome: { equals: nomeDoCliente, mode: "insensitive" } },
        orderBy: { criadoEm: "asc" },
      })
    : null
  const cliente = existente
    ? dados.clienteTelefone && !existente.telefone
      ? await prisma.clienteLoja.update({ where: { id: existente.id }, data: { telefone: dados.clienteTelefone } })
      : existente
    : nomeDoCliente
      ? await prisma.clienteLoja.create({
          data: { lojaId: loja.id, nome: nomeDoCliente, telefone: dados.clienteTelefone ?? null },
        })
      : null

  // O troco sai antes de gravar: ele volta para a mão do cliente e não é
  // receita da loja.
  const calculados = descontarTroco(totalCentavos, dados.pagamentos).map((pagamento) =>
    calcularPagamento(pagamento, regras, vendidoEm),
  )

  // Venda, saída do estoque e competência fiscal precisam nascer juntas.
  // Antes uma falha na segunda ou terceira escrita deixava a venda salva sem
  // baixa ou sem faturamento MEI, e tentar novamente duplicava a receita.
  const [perfilMei, lar] = await Promise.all([
    prisma.meiPerfil.findUnique({ where: { larId: sessao.larId }, select: { larId: true } }),
    prisma.lar.findUnique({ where: { id: sessao.larId }, select: { fusoHorario: true } }),
  ])
  const { servicosCentavos } = dividirFaturamentoMei(dados.itens, totalCentavos)
  const competencia = competenciaDaVenda(vendidoEm, lar?.fusoHorario)
  const venda = await prisma.$transaction(async (transacao) => {
    const criada = await transacao.vendaLoja.create({
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
          servicoId: item.servicoId ?? null,
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
    const comProduto = criada.itens.filter((item) => item.produtoId)
    if (comProduto.length > 0) {
      await transacao.movimentoEstoque.createMany({
      data: comProduto.map((item) => ({
        produtoId: item.produtoId as string,
        tipo: "SAIDA" as const,
        quantidade: item.quantidade,
        vendaId: criada.id,
        motivo: `Venda ${criada.numero}`,
        criadoEm: vendidoEm,
      })),
      })
    }

  // O faturamento do MEI conta a venda, não o recebimento: para o limite anual
  // vale o que foi vendido na competência, mesmo que o cartão caia mês que vem.
  // O desconto de uma venda mista abate as duas atividades proporcionalmente;
  // lançar tudo como comércio faria o DAS mostrar uma composição falsa.
    if (perfilMei) await transacao.meiCompetencia.upsert({
      where: { larId_competencia: { larId: sessao.larId, competencia } },
      update: { receitaComercioCentavos: { increment: totalCentavos - servicosCentavos }, receitaServicosCentavos: { increment: servicosCentavos } },
      create: { larId: sessao.larId, competencia, receitaComercioCentavos: totalCentavos - servicosCentavos, receitaServicosCentavos: servicosCentavos },
    })
    return criada
  })

  return ok({ venda, troco: conferencia.trocoCentavos }, 201)
})
