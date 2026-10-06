import { prisma } from "@/lib/prisma"
import { comSessao, corpo, ErroDeUso, ok } from "@/lib/api"
import { lojaDoLar } from "@/lib/loja/dados"
import { validar, z } from "@/lib/validar"

type Contexto = { params: Promise<{ id: string }> }

async function doLoja(larId: string, id: string) {
  const loja = await lojaDoLar(larId)
  const compromisso = await prisma.compromissoLoja.findFirst({ where: { id, lojaId: loja.id }, select: { id: true } })
  if (!compromisso) throw new ErroDeUso("Compromisso não encontrado.", 404)
  return compromisso
}

/** Feito ou não feito. O que foi feito fica riscado na agenda, não some. */
export const PATCH = comSessao<Contexto>(async (sessao, requisicao, contexto) => {
  const { id } = await contexto.params
  const { feito } = validar(z.object({ feito: z.boolean() }), await corpo(requisicao))
  await doLoja(sessao.larId, id)
  const compromisso = await prisma.compromissoLoja.update({ where: { id }, data: { feitoEm: feito ? new Date() : null } })
  return ok({ compromisso })
})

export const DELETE = comSessao<Contexto>(async (sessao, _requisicao, contexto) => {
  const { id } = await contexto.params
  await doLoja(sessao.larId, id)
  await prisma.compromissoLoja.delete({ where: { id } })
  return ok({ apagado: true })
})
