import { prisma } from "@/lib/prisma"
import { comSessao, corpo, ok, ErroDeUso } from "@/lib/api"
import { VIGIAS } from "@/lib/tino/alertas"

export const dynamic = "force-dynamic"

/**
 * A lista dos vigias com o estado de cada um (ligado por padrão) e quantos
 * disparos ele já fez nos últimos 30 dias — a "histórico de disparos" que o
 * brief pediu, sem precisar de tabela nova: cada disparo já é uma linha em
 * `Alerta`, então contar por tipo já responde a pergunta.
 */
export const GET = comSessao(async (sessao) => {
  const DESDE = new Date(Date.now() - 30 * 86_400_000)

  const [configs, contagens] = await Promise.all([
    prisma.vigiaConfig.findMany({ where: { larId: sessao.larId } }),
    prisma.alerta.groupBy({
      by: ["tipo"],
      where: { larId: sessao.larId, criadoEm: { gte: DESDE } },
      _count: { _all: true },
    }),
  ])

  const ativoPorTipo = new Map(configs.map((c) => [c.tipo, c.ativo]))
  const contagemPorTipo = new Map(contagens.map((c) => [c.tipo, c._count._all]))

  const vigias = VIGIAS.map((v) => ({
    ...v,
    ativo: ativoPorTipo.get(v.tipo) ?? true,
    disparos30dias: contagemPorTipo.get(v.tipo) ?? 0,
  }))

  return ok(vigias)
})

export const PATCH = comSessao(async (sessao, requisicao) => {
  const dados = await corpo<{ tipo?: unknown; ativo?: unknown }>(requisicao)
  if (typeof dados.tipo !== "string" || typeof dados.ativo !== "boolean") {
    throw new ErroDeUso("Dado inválido.")
  }
  if (!VIGIAS.some((v) => v.tipo === dados.tipo)) throw new ErroDeUso("Vigia desconhecido.")

  await prisma.vigiaConfig.upsert({
    where: { larId_tipo: { larId: sessao.larId, tipo: dados.tipo } },
    create: { larId: sessao.larId, tipo: dados.tipo, ativo: dados.ativo },
    update: { ativo: dados.ativo },
  })

  return ok({ ok: true })
})
