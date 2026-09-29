import { prisma } from "@/lib/prisma"
import { comSessao, corpo, ok } from "@/lib/api"
import { validar, z } from "@/lib/validar"

/**
 * Tira ou devolve uma linha do fluxo de caixa. A chave vem da própria linha
 * ("conta:<id>", "recorrencia:<id>", "cartao:<id>", "detectada:<nome>",
 * "outras-entradas", "gasto-variavel", "dividas"); o formato é conferido para
 * a lista não virar depósito de texto qualquer.
 */
export const PUT = comSessao(async (sessao, requisicao) => {
  const dados = validar(
    z.object({
      chave: z.string().max(160).regex(/^(conta|recorrencia|cartao|detectada):.+$|^(outras-entradas|gasto-variavel|dividas)$/),
      fora: z.boolean(),
    }),
    await corpo(requisicao),
  )
  const lar = await prisma.lar.findUniqueOrThrow({ where: { id: sessao.larId }, select: { fluxoForaChaves: true } })
  const semEla = lar.fluxoForaChaves.filter((chave) => chave !== dados.chave)
  const fluxoForaChaves = dados.fora ? [...semEla, dados.chave] : semEla
  await prisma.lar.update({ where: { id: sessao.larId }, data: { fluxoForaChaves } })
  return ok({ fora: fluxoForaChaves })
})
