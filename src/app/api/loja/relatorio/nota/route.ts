import { prisma } from "@/lib/prisma"
import { comSessao, corpo, ErroDeUso, ok } from "@/lib/api"

/**
 * "Não teve nota": confirma (ou desfaz) que a venda saiu sem nota fiscal. É a
 * saída da venda de quem não pede nota, que senão ficaria pendente para
 * sempre. Nota anexada ou emitida pelo Tino vale mais e não é desfeita aqui.
 */
export const PATCH = comSessao(async (sessao, requisicao) => {
  const dados = await corpo<{ vendaId?: string; semNota?: boolean }>(requisicao)
  if (!dados.vendaId || typeof dados.semNota !== "boolean") throw new ErroDeUso("Informe a venda e se ela teve nota.")
  // A venda tem de ser de um negócio deste lar: o id sozinho não prova isso.
  const venda = await prisma.vendaLoja.findFirst({ where: { id: dados.vendaId, loja: { larId: sessao.larId } }, select: { id: true } })
  if (!venda) throw new ErroDeUso("Venda não encontrada.", 404)
  await prisma.vendaLoja.update({ where: { id: venda.id }, data: { semNota: dados.semNota } })
  return ok({ ok: true })
})
