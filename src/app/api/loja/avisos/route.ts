import { prisma } from "@/lib/prisma"
import { comSessao, corpo, ok } from "@/lib/api"
import { lojaDoLar } from "@/lib/loja/dados"
import { avisosDaLoja } from "@/lib/loja/ordens"
import { campo, validar, z } from "@/lib/validar"

export const dynamic = "force-dynamic"

/** O sino do MEI: grava os lembretes do dia e devolve os avisos recentes. */
export const GET = comSessao(async (sessao) => {
  const loja = await lojaDoLar(sessao.larId)
  const lar = await prisma.lar.findUnique({ where: { id: sessao.larId }, select: { fusoHorario: true } })
  return ok({ avisos: await avisosDaLoja(loja.id, lar?.fusoHorario) })
})

/** Marca como lidos os avisos indicados, ou todos. */
export const PATCH = comSessao(async (sessao, requisicao) => {
  const { ids } = validar(z.object({ ids: z.array(campo.id()).max(100).optional() }), await corpo(requisicao))
  const loja = await lojaDoLar(sessao.larId)
  const feitos = await prisma.avisoLoja.updateMany({ where: { lojaId: loja.id, lidoEm: null, ...(ids ? { id: { in: ids } } : {}) }, data: { lidoEm: new Date() } })
  return ok({ lidos: feitos.count })
})
