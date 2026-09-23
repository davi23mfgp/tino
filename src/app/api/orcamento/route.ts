import { prisma } from "@/lib/prisma"
import { ErroDeUso, comSessao, corpo, lerCompetencia, ok } from "@/lib/api"
import { campo, validar, z } from "@/lib/validar"
import { competenciaAtual, competenciaMaisMeses, janelaDoMes, ultimasCompetencias } from "@/lib/datas"

export const GET = comSessao(async (sessao, requisicao) => {
  const url = new URL(requisicao.url)
  const competencia = lerCompetencia(url.searchParams.get("competencia"), competenciaAtual())

  const lar = await prisma.lar.findUniqueOrThrow({ where: { id: sessao.larId }, select: { diaInicioMes: true } })
  const janela = janelaDoMes(competencia, lar.diaInicioMes)

  const [orcamentos, gastos, categorias] = await Promise.all([
    prisma.orcamento.findMany({ where: { larId: sessao.larId, competencia }, include: { categoria: true } }),
    prisma.transacao.groupBy({
      by: ["categoriaId"],
      where: { larId: sessao.larId, tipo: "DESPESA", data: { gte: janela.de, lte: janela.ate } },
      _sum: { valorCentavos: true },
    }),
    prisma.categoria.findMany({ where: { larId: sessao.larId, tipo: "DESPESA" }, orderBy: { nome: "asc" } }),
  ])

  const gastoDe = (categoriaId: string) =>
    gastos.find((linha) => linha.categoriaId === categoriaId)?._sum.valorCentavos ?? 0

  const linhas = orcamentos.map((orcamento) => {
    const gasto = gastoDe(orcamento.categoriaId)
    return {
      id: orcamento.id,
      categoriaId: orcamento.categoriaId,
      categoria: orcamento.categoria,
      limiteCentavos: orcamento.limiteCentavos,
      gastoCentavos: gasto,
      restanteCentavos: orcamento.limiteCentavos - gasto,
      percentual: orcamento.limiteCentavos > 0 ? Math.round((gasto / orcamento.limiteCentavos) * 100) : 0,
      estourou: gasto > orcamento.limiteCentavos,
    }
  })

  // Categorias com gasto no mês e sem orçamento definido: são exatamente as
  // que o usuário esqueceu de planejar, e é onde o estouro nasce.
  const semOrcamento = categorias
    .filter((categoria) => !orcamentos.some((orcamento) => orcamento.categoriaId === categoria.id))
    .map((categoria) => ({ categoria, gastoCentavos: gastoDe(categoria.id) }))
    .filter((linha) => linha.gastoCentavos > 0)
    .sort((a, b) => b.gastoCentavos - a.gastoCentavos)

  return ok({
    competencia,
    linhas,
    semOrcamento,
    limiteTotalCentavos: linhas.reduce((soma, linha) => soma + linha.limiteCentavos, 0),
    gastoTotalCentavos: linhas.reduce((soma, linha) => soma + linha.gastoCentavos, 0),
  })
})

export const PUT = comSessao(async (sessao, requisicao) => {
  const dados = await corpo<{
    competencia: string
    linhas: { categoriaId: string; limiteCentavos: number }[]
    /// Repete o orçamento nos próximos N meses — quem monta orçamento uma vez
    /// não quer refazê-lo do zero todo dia 1º.
    repetirMeses?: number
  }>(requisicao)

  const linhasValidas = validar(
    z.array(z.object({ categoriaId: campo.id(), limiteCentavos: campo.centavos() })).max(500),
    dados.linhas ?? [],
  )
  const idsCategoria = [...new Set(linhasValidas.map((linha) => linha.categoriaId))]
  if ((await prisma.categoria.count({ where: { id: { in: idsCategoria }, larId: sessao.larId } })) !== idsCategoria.length) {
    throw new ErroDeUso("Categoria inválida.")
  }
  dados.linhas = linhasValidas

  const competencia = lerCompetencia(dados.competencia, competenciaAtual())
  const meses = Math.max(0, Math.min(dados.repetirMeses ?? 0, 24))

  await prisma.$transaction(
    Array.from({ length: meses + 1 }).flatMap((_, deslocamento) => {
      const alvo = competenciaMaisMeses(competencia, deslocamento)
      return dados.linhas.map((linha) =>
        prisma.orcamento.upsert({
          where: {
            larId_competencia_categoriaId: {
              larId: sessao.larId,
              competencia: alvo,
              categoriaId: linha.categoriaId,
            },
          },
          update: { limiteCentavos: linha.limiteCentavos },
          create: {
            larId: sessao.larId,
            competencia: alvo,
            categoriaId: linha.categoriaId,
            limiteCentavos: linha.limiteCentavos,
          },
        }),
      )
    }),
  )

  return ok({ salvo: true, mesesAfetados: meses + 1 })
})

/**
 * Sugestão de orçamento a partir do histórico.
 * Base é a mediana dos últimos 6 meses, não a média: um mês atípico (viagem,
 * conserto de carro) puxaria a média e inflaria o limite para sempre.
 */
export const POST = comSessao(async (sessao, requisicao) => {
  const url = new URL(requisicao.url)
  const competencia = lerCompetencia(url.searchParams.get("competencia"), competenciaAtual())
  const meses = ultimasCompetencias(6, competenciaMaisMeses(competencia, -1))

  const transacoes = await prisma.transacao.findMany({
    where: { larId: sessao.larId, tipo: "DESPESA", competencia: { in: meses } },
    select: { categoriaId: true, competencia: true, valorCentavos: true },
  })

  const porCategoria = new Map<string, Map<string, number>>()
  for (const transacao of transacoes) {
    if (!transacao.categoriaId) continue
    const porMes = porCategoria.get(transacao.categoriaId) ?? new Map<string, number>()
    porMes.set(transacao.competencia, (porMes.get(transacao.competencia) ?? 0) + transacao.valorCentavos)
    porCategoria.set(transacao.categoriaId, porMes)
  }

  const sugestoes = [...porCategoria.entries()].map(([categoriaId, porMes]) => {
    const valores = [...porMes.values()].sort((a, b) => a - b)
    const mediana =
      valores.length % 2 === 1
        ? valores[(valores.length - 1) / 2]
        : Math.round((valores[valores.length / 2 - 1] + valores[valores.length / 2]) / 2)
    return { categoriaId, sugestaoCentavos: mediana, mesesObservados: valores.length }
  })

  return ok({ competencia, sugestoes: sugestoes.sort((a, b) => b.sugestaoCentavos - a.sugestaoCentavos) })
})
