import { prisma } from "@/lib/prisma"
import { comSessao, corpo, ErroDeUso, ok } from "@/lib/api"

/**
 * Marca se a venda saiu com nota. `null` desmarca: voltar a "ainda não
 * marcado" é uma resposta honesta, e a pessoa pode ter marcado errado. A nota
 * que o Tino emitiu vale por si e não é desfeita por aqui.
 */
export const PATCH = comSessao(async (sessao, requisicao) => {
  const dados = await corpo<{ vendaId?: string; comNota?: boolean | null }>(requisicao)
  if (!dados.vendaId || (dados.comNota !== true && dados.comNota !== false && dados.comNota !== null)) throw new ErroDeUso("Escolha com nota, sem nota ou desmarcar.")
  // A venda tem de ser de um negócio deste lar: o id sozinho não prova isso.
  const venda = await prisma.vendaLoja.findFirst({ where: { id: dados.vendaId, loja: { larId: sessao.larId } }, select: { id: true } })
  if (!venda) throw new ErroDeUso("Venda não encontrada.", 404)
  await prisma.vendaLoja.update({ where: { id: venda.id }, data: { comNota: dados.comNota } })
  return ok({ ok: true })
})
