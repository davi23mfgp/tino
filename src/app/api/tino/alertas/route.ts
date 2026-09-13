import { prisma } from "@/lib/prisma"
import { comSessao, corpo, ok } from "@/lib/api"
import { atualizarAlertas } from "@/lib/tino/alertas"

export const dynamic = "force-dynamic"

export const GET = comSessao(async (sessao) => ok(await atualizarAlertas(sessao.larId)))

/**
 * Marca alertas como lidos. Sem id, marca todos.
 *
 * Com `dispensar: true`, arquiva em vez de so marcar: o aviso sai da lista e
 * nao volta enquanto o motivo dele for o mesmo (ver `atualizarAlertas`).
 * Nada e apagado -- a linha continua no banco, e nenhuma transacao e tocada.
 * O escopo e sempre `larId` da sessao: ninguem limpa aviso de outro lar.
 */
export const PATCH = comSessao(async (sessao, requisicao) => {
  const dados = await corpo<{ ids?: string[]; dispensar?: boolean }>(requisicao)

  await prisma.alerta.updateMany({
    where: { larId: sessao.larId, ...(dados.ids?.length ? { id: { in: dados.ids } } : {}) },
    data: dados.dispensar ? { lido: true, dispensadoEm: new Date() } : { lido: true },
  })

  return ok({ lidos: true, dispensados: Boolean(dados.dispensar) })
})
