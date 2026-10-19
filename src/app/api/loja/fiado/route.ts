import { prisma } from "@/lib/prisma"
import { comSessao, corpo, ok, ErroDeUso } from "@/lib/api"
import { lojaDoLar } from "@/lib/loja/dados"
import { montarDevedores, resumirFiado } from "@/lib/loja/fiado"

export const dynamic = "force-dynamic"

/** Quem deve para a loja, quanto e há quanto tempo. */
export const GET = comSessao(async (sessao) => {
  const loja = await lojaDoLar(sessao.larId)

  const clientes = await prisma.clienteLoja.findMany({
    where: { lojaId: loja.id },
    include: {
      vendas: {
        where: { cancelada: false },
        include: { pagamentos: true },
        orderBy: { criadoEm: "asc" },
      },
    },
  })

  const devedores = montarDevedores(clientes)

  return ok({ loja: { nome: loja.nome }, devedores, resumo: resumirFiado(devedores) })
})

/**
 * Baixa do fiado.
 *
 * A baixa é por venda, não por valor solto. O cliente que pagou "uns duzentos"
 * sem dizer de qual compra deixaria o app adivinhando qual quitar — e adivinhar
 * aqui é o que faz a conta do cliente e o caderno do dono discordarem.
 */
export const POST = comSessao(async (sessao, requisicao) => {
  const dados = await corpo<{ vendaId: string }>(requisicao)

  const loja = await lojaDoLar(sessao.larId)

  const venda = await prisma.vendaLoja.findFirst({
    where: { id: dados.vendaId, lojaId: loja.id },
    include: { pagamentos: true },
  })
  if (!venda) throw new ErroDeUso("Venda não encontrada nesta loja.", 404)

  const emAberto = venda.pagamentos.filter(
    (pagamento) => pagamento.forma === "FIADO" && pagamento.recebidoEm === null,
  )
  if (emAberto.length === 0) throw new ErroDeUso("Essa compra já estava paga.")

  await prisma.pagamentoVenda.updateMany({
    where: { id: { in: emAberto.map((pagamento) => pagamento.id) } },
    data: { recebidoEm: new Date() },
  })

  return ok({
    pagamentoIds: emAberto.map((pagamento) => pagamento.id),
    recebidoCentavos: emAberto.reduce((soma, pagamento) => soma + pagamento.valorCentavos, 0),
  })
})

/**
 * Desfaz um "Recebi" tocado por engano. Volta só os pagamentos que aquela
 * baixa marcou (a tela guarda os ids), não tudo que a venda já recebeu:
 * reabrir uma parte paga de verdade cobraria o cliente duas vezes.
 */
export const DELETE = comSessao(async (sessao, requisicao) => {
  const dados = await corpo<{ pagamentoIds: string[] }>(requisicao)
  if (!Array.isArray(dados.pagamentoIds) || dados.pagamentoIds.length === 0) throw new ErroDeUso("Diga o que desfazer.")
  const loja = await lojaDoLar(sessao.larId)
  const { count } = await prisma.pagamentoVenda.updateMany({
    where: { id: { in: dados.pagamentoIds.map(String) }, forma: "FIADO", recebidoEm: { not: null }, venda: { lojaId: loja.id } },
    data: { recebidoEm: null },
  })
  return ok({ reabertos: count })
})
