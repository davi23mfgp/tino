import { comSessao, corpo, ok } from "@/lib/api"
import { prisma } from "@/lib/prisma"
import { competenciaAtual } from "@/lib/datas"

export const dynamic = "force-dynamic"

/**
 * O retrato mensal da carteira.
 *
 * GET devolve a série guardada, para o gráfico de evolução. POST grava o
 * retrato do mês corrente com o que a tela está mostrando agora.
 *
 * Por que a tela é quem manda o número, e não o servidor que recalcula: o valor
 * de mercado depende da cotação do dia, que quem buscou foi o cliente. Pedir de
 * novo aqui dobraria a chamada à fonte externa e poderia gravar um valor
 * diferente do que a pessoa está vendo na tela — e retrato que não bate com o
 * que se viu é pior do que retrato nenhum.
 *
 * O mês corrente é reescrito a cada visita, porque a posição ainda está
 * mudando. Mês fechado nunca é tocado: é isso que faz a série ser história e
 * não recálculo.
 */

interface Retrato {
  totalCentavos: number
  aportadoCentavos: number
  porClasse: Record<string, number>
}

export const GET = comSessao(async (sessao) => {
  const retratos = await prisma.retratoCarteira.findMany({
    where: { larId: sessao.larId },
    orderBy: { competencia: "asc" },
    take: 24,
    select: { competencia: true, totalCentavos: true, aportadoCentavos: true, porClasse: true },
  })

  return ok(retratos)
})

export const POST = comSessao(async (sessao, requisicao) => {
  const dados = await corpo<Retrato>(requisicao)

  const totalCentavos = Math.max(0, Math.trunc(Number(dados.totalCentavos) || 0))
  const aportadoCentavos = Math.max(0, Math.trunc(Number(dados.aportadoCentavos) || 0))

  // Carteira vazia não vira retrato: uma linha de zero no meio da série faria
  // o gráfico mostrar uma queda a pico que nunca aconteceu — é só alguém que
  // abriu a tela antes de cadastrar.
  if (totalCentavos <= 0) return ok({ gravado: false })

  const competencia = competenciaAtual()

  await prisma.retratoCarteira.upsert({
    where: { larId_competencia: { larId: sessao.larId, competencia } },
    create: {
      larId: sessao.larId,
      competencia,
      totalCentavos,
      aportadoCentavos,
      porClasse: dados.porClasse ?? {},
    },
    update: { totalCentavos, aportadoCentavos, porClasse: dados.porClasse ?? {} },
  })

  return ok({ gravado: true, competencia })
})
