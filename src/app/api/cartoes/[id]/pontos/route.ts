import { prisma } from "@/lib/prisma"
import { comSessao, corpo, ok, ErroDeUso } from "@/lib/api"
import { configuracaoPontos } from "@/lib/pontos-cartao"

type Contexto = { params: Promise<{ id: string }> }
export const GET = comSessao<Contexto>(async (sessao, _req, contexto) => {
  const { id } = await contexto.params
  const cartao = await prisma.conta.findFirst({ where: { id, larId: sessao.larId, tipo: "CARTAO_CREDITO", arquivada: false }, select: { pontosConfiguracao: true } })
  if (!cartao) throw new ErroDeUso("Cartão não encontrado.", 404)
  return ok(cartao.pontosConfiguracao)
})
export const PUT = comSessao<Contexto>(async (sessao, req, contexto) => {
  const { id } = await contexto.params
  const resultado = configuracaoPontos.safeParse(await corpo(req))
  if (!resultado.success) throw new ErroDeUso("Revise a regra de pontos e o saldo informado.")
  const atualizado = await prisma.conta.updateMany({ where: { id, larId: sessao.larId, tipo: "CARTAO_CREDITO", arquivada: false }, data: { pontosConfiguracao: resultado.data } })
  if (!atualizado.count) throw new ErroDeUso("Cartão não encontrado.", 404)
  return ok({ salvo: true })
})
