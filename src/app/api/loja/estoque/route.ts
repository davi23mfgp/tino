import { prisma } from "@/lib/prisma"
import { comSessao, corpo, ok, ErroDeUso } from "@/lib/api"
import { lojaDoLar } from "@/lib/loja/dados"
import { situacaoDoProduto } from "@/lib/loja/estoque"
import { referenciaDaBarra } from "@/lib/loja/prateleira"
import type { Movimento, TipoMovimento } from "@/lib/loja/estoque"
import { desempenhoDosProdutos } from "@/lib/loja/desempenho"
import type { VendaDoProduto } from "@/lib/loja/desempenho"

/**
 * Prateleira: saldo, custo, margem e o que mais/menos vende de cada produto.
 *
 * Custo e margem ficam de fora para `FUNCIONARIO_LOJA` (ver docs/TINO-MEI.md,
 * Fase 7 — "permissão fina" que ficou pendente até alguém precisar de
 * verdade). O corte é aqui, no servidor: esconder só na tela deixaria o
 * número real inteiro na resposta da API, visível em qualquer inspetor de
 * rede. Saldo e preço de venda continuam — são o que decide se tem o produto
 * e por quanto vender, que é a operação do balcão.
 */
export const GET = comSessao(async (sessao) => {
  const loja = await lojaDoLar(sessao.larId)
  const podeVerFinanceiro = sessao.papel !== "FUNCIONARIO_LOJA"

  const [produtos, itensVendidos] = await Promise.all([
    prisma.produtoLoja.findMany({
      where: { lojaId: loja.id, ativo: true },
      orderBy: { nome: "asc" },
      include: { movimentos: { orderBy: { criadoEm: "asc" } } },
    }),
    // Venda cancelada não conta como saída de verdade — mesmo corte do
    // financeiro em resumirLoja: não é isso que decide o que repor.
    prisma.itemVenda.findMany({
      where: { produtoId: { not: null }, venda: { lojaId: loja.id, cancelada: false } },
      select: { produtoId: true, descricao: true, quantidade: true, venda: { select: { criadoEm: true } } },
    }),
  ])

  const prateleira = produtos.map((produto) => {
    const movimentos: Movimento[] = produto.movimentos.map((linha) => ({
      tipo: linha.tipo as TipoMovimento,
      quantidade: linha.quantidade,
      custoUnitarioCentavos: linha.custoUnitarioCentavos,
      criadoEm: linha.criadoEm,
    }))

    const situacao = situacaoDoProduto({ precoCentavos: produto.precoCentavos, movimentos, minimo: produto.estoqueMinimo ?? undefined })

    return {
      id: produto.id,
      nome: produto.nome,
      precoCentavos: produto.precoCentavos,
      ncm: produto.ncm,
      codigoBarras: produto.codigoBarras,
      estoqueMinimo: produto.estoqueMinimo,
      ...situacao,
      referencia: referenciaDaBarra(movimentos, situacao.saldo),
      // Os últimos movimentos, do mais novo para o mais velho: é o que o dono
      // confere quando o saldo parece errado. Custo fora para o funcionário.
      movimentos: produto.movimentos
        .slice(-8)
        .reverse()
        .map((linha) => ({
          id: linha.id,
          tipo: linha.tipo,
          quantidade: linha.quantidade,
          custoUnitarioCentavos: podeVerFinanceiro && linha.custoUnitarioCentavos > 0 ? linha.custoUnitarioCentavos : null,
          motivo: linha.motivo,
          venda: Boolean(linha.vendaId),
          criadoEm: linha.criadoEm,
        })),
      ...(podeVerFinanceiro
        ? {}
        : { custoMedioCentavos: null, margem: { lucroCentavos: null, margemBps: null, markupBps: null } }),
    }
  })

  const vendasPorProduto: VendaDoProduto[] = itensVendidos.map((item) => ({
    produtoId: item.produtoId as string,
    descricao: item.descricao,
    quantidade: item.quantidade,
    criadoEm: item.venda.criadoEm,
  }))

  const desempenho = desempenhoDosProdutos(
    vendasPorProduto,
    prateleira.map((linha) => ({ produtoId: linha.id, descricao: linha.nome, saldo: linha.saldo })),
  )

  return ok({
    prateleira,
    // Contagens prontas para a tela não ter de recalcular e divergir.
    acabando: prateleira.filter((linha) => linha.acabando).length,
    semSaldo: prateleira.filter((linha) => linha.semSaldo).length,
    // Zerado para o funcionário: com custo escondido, contar "sem custo" pela
    // própria linha zerada diria "nada tem custo lançado", que é mentira.
    semCusto: podeVerFinanceiro ? prateleira.filter((linha) => linha.custoMedioCentavos === null).length : 0,
    desempenho,
    podeVerFinanceiro,
  })
})

/**
 * Lança entrada de mercadoria ou contagem física.
 *
 * A saída não entra aqui: ela nasce da venda, no balcão. Deixar registrar saída
 * à mão abriria caminho para o saldo divergir do que foi vendido, e aí a
 * prateleira deixa de servir para conferir a loja.
 */
export const POST = comSessao(async (sessao, requisicao) => {
  const dados = await corpo<{
    produtoId: string
    tipo: "ENTRADA" | "AJUSTE"
    quantidade: number
    custoUnitarioCentavos?: number
    motivo?: string
  }>(requisicao)

  const loja = await lojaDoLar(sessao.larId)

  const produto = await prisma.produtoLoja.findFirst({
    where: { id: dados.produtoId, lojaId: loja.id },
  })
  if (!produto) throw new ErroDeUso("Produto não encontrado nesta loja.", 404)

  if (dados.tipo !== "ENTRADA" && dados.tipo !== "AJUSTE") {
    throw new ErroDeUso("A saída do estoque vem da venda, não do lançamento à mão.")
  }

  const quantidade = Math.trunc(dados.quantidade)
  if (!Number.isFinite(quantidade) || quantidade < 0) {
    throw new ErroDeUso("Informe a quantidade.")
  }
  if (dados.tipo === "ENTRADA" && quantidade === 0) {
    throw new ErroDeUso("Entrada de zero peça não muda nada.")
  }

  const movimento = await prisma.movimentoEstoque.create({
    data: {
      produtoId: produto.id,
      tipo: dados.tipo,
      quantidade,
      custoUnitarioCentavos: dados.tipo === "ENTRADA" ? (dados.custoUnitarioCentavos ?? 0) : 0,
      motivo: dados.motivo ?? null,
    },
  })

  // O custo do produto acompanha a última entrada com custo informado: é o que
  // a tela de venda mostra como referência de margem no momento de dar desconto.
  if (dados.tipo === "ENTRADA" && (dados.custoUnitarioCentavos ?? 0) > 0) {
    await prisma.produtoLoja.update({
      where: { id: produto.id },
      data: { custoCentavos: dados.custoUnitarioCentavos as number },
    })
  }

  return ok({ movimento }, 201)
})
