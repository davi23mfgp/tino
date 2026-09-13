import { prisma } from "@/lib/prisma"
import { comSessao, corpo, ok } from "@/lib/api"
import { acompanharMetas, validarDadosMeta } from "@/lib/metas"

export const GET = comSessao(async (sessao) => ok(await acompanharMetas(sessao.larId)))

export const POST = comSessao(async (sessao, requisicao) => {
  const dados = await validarDadosMeta(sessao.larId, await corpo<unknown>(requisicao))
  return ok(await prisma.meta.create({ data: { larId: sessao.larId, ...dados } }), 201)
})
