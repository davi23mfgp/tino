import { prisma } from "@/lib/prisma"
import { ErroDeUso, comSessao, corpo, lerCompetencia, ok } from "@/lib/api"
import { campo, validar, z } from "@/lib/validar"
import { competenciaAtual, competenciaMaisMeses, janelaDoMes, ultimasCompetencias } from "@/lib/datas"
import { competenciaDosLimites } from "@/lib/orcamento-herdado"

export const GET = comSessao(async (sessao, requisicao) => {
  const url = new URL(requisicao.url)
  const competencia = lerCompetencia(url.searchParams.get("competencia"), competenciaAtual())

  const lar = await prisma.lar.findUniqueOrThrow({ where: { id: sessao.larId }, select: { diaInicioMes: true } })
  const janela = janelaDoMes(competencia, lar.diaInicioMes)

  // O mês sem limite próprio mostra os do último mês que tinha (ver
  // `competenciaDosLimites`). `herdadoDe` diz de onde vieram, para a tela avisar.
  const meses = await prisma.orcamento.findMany({ where: { larId: sessao.larId, competencia: { lte: competencia } }, distinct: ["competencia"], select: { competencia: true } })
  const base = competenciaDosLimites(meses.map((linha) => linha.competencia), competencia)
  const herdadoDe = base && base !== competencia ? base : null

  const [orcamentos, gastos, categorias] = await Promise.all([
    base ? prisma.orcamento.findMany({ where: { larId: sessao.larId, competencia: base }, include: { categoria: true } }) : Promise.resolve([]),
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
    herdadoDe,
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

  // O mês sem limite próprio mostra os herdados (GET). Salvar uma linha só
  // criaria o mês com ela e apagaria da tela todas as outras: antes, o mês
  // ganha cópia do que herdava, e a linha nova muda por cima.
  const comLinhas = await prisma.orcamento.findMany({ where: { larId: sessao.larId, competencia: { lte: competencia } }, distinct: ["competencia"], select: { competencia: true } })
  const base = competenciaDosLimites(comLinhas.map((linha) => linha.competencia), competencia)
  if (base && base !== competencia) {
    const herdadas = await prisma.orcamento.findMany({ where: { larId: sessao.larId, competencia: base }, select: { categoriaId: true, limiteCentavos: true } })
    await prisma.orcamento.createMany({ data: herdadas.map((linha) => ({ larId: sessao.larId, competencia, categoriaId: linha.categoriaId, limiteCentavos: linha.limiteCentavos })), skipDuplicates: true })
  }

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

  // Mudar um limite vale daqui em diante: os meses seguintes que já tinham
  // limite próprio (de um "Repetir" antigo) mudam junto, senão a pessoa mudaria
  // o mercado em outubro e em novembro voltaria o valor velho.
  const depois = competenciaMaisMeses(competencia, meses)
  await prisma.$transaction(dados.linhas.map((linha) =>
    prisma.orcamento.updateMany({ where: { larId: sessao.larId, categoriaId: linha.categoriaId, competencia: { gt: depois } }, data: { limiteCentavos: linha.limiteCentavos } }),
  ))

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

/**
 * Tirar o limite de uma categoria, deste mês em diante. Antes não existia:
 * apagar o valor no campo não mudava nada, porque o salvamento ignora vazio.
 */
export const DELETE = comSessao(async (sessao, requisicao) => {
  const url = new URL(requisicao.url)
  const competencia = lerCompetencia(url.searchParams.get("competencia"), competenciaAtual())
  const categoriaId = url.searchParams.get("categoriaId")
  if (!categoriaId) throw new ErroDeUso("Informe a categoria.")
  const { count } = await prisma.orcamento.deleteMany({ where: { larId: sessao.larId, categoriaId, competencia: { gte: competencia } } })
  return ok({ removidos: count })
})
