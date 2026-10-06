import { prisma } from "@/lib/prisma"
import { comSessao, corpo, ErroDeUso, ok } from "@/lib/api"
import { lojaDoLar } from "@/lib/loja/dados"
import { escolhaValida } from "@/lib/loja/areas"
import { validar, z } from "@/lib/validar"

/** A área do negócio aberto (passo 38). Trocar depois não apaga nada: só muda o que o app destaca. */
export const GET = comSessao(async (sessao) => {
  const loja = await lojaDoLar(sessao.larId)
  return ok({ nome: loja.nome, area: loja.area, subarea: loja.subarea })
})

export const PUT = comSessao(async (sessao, requisicao) => {
  const dados = validar(z.object({ area: z.string().max(30), subarea: z.string().max(60).nullable() }), await corpo(requisicao))
  const subarea = dados.subarea?.trim() || null
  if (!escolhaValida(dados.area, subarea)) throw new ErroDeUso("Escolha a área e o tipo do seu negócio.")
  const loja = await lojaDoLar(sessao.larId)
  await prisma.loja.update({ where: { id: loja.id }, data: { area: dados.area, subarea } })
  return ok({ area: dados.area, subarea })
})
