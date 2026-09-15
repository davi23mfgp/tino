import { prisma } from "@/lib/prisma"
import { ErroDeUso, comSessao, corpo, exigir, ok } from "@/lib/api"
import { compararEstrategias, ordenarDividas, planejarQuitacao } from "@/lib/financeiro"

export const GET = comSessao(async (sessao, requisicao) => {
  const url = new URL(requisicao.url)
  const extra = Math.max(0, Number(url.searchParams.get("extraMensalCentavos") ?? 0))

  const [lar, dividas] = await Promise.all([
    prisma.lar.findUniqueOrThrow({ where: { id: sessao.larId }, select: { estrategiaDivida: true } }),
    prisma.divida.findMany({ where: { larId: sessao.larId }, orderBy: { criadoEm: "asc" } }),
  ])

  const abertas = dividas
    .filter((divida) => !divida.quitada)
    .map((divida) => ({
      id: divida.id,
      credor: divida.credor,
      saldoDevedorCentavos: divida.saldoDevedorCentavos,
      jurosMensalBps: divida.jurosMensalBps,
      parcelaCentavos: divida.parcelaCentavos,
    }))

  return ok({
    dividas,
    estrategia: lar.estrategiaDivida,
    ordem: ordenarDividas(abertas, lar.estrategiaDivida),
    plano: abertas.length > 0 ? planejarQuitacao(abertas, extra, lar.estrategiaDivida) : null,
    comparativo: abertas.length > 0 ? compararEstrategias(abertas, extra) : null,
    totalCentavos: abertas.reduce((soma, divida) => soma + divida.saldoDevedorCentavos, 0),
    parcelaMensalCentavos: abertas.reduce((soma, divida) => soma + divida.parcelaCentavos, 0),
  })
})

/**
 * Centavos vindos do cliente.
 *
 * `Number("muito")` é `NaN`, e `Math.abs(NaN)` continua `NaN`: o valor chegava
 * inteiro no Prisma, o Postgres recusava e a pessoa via "algo deu errado" com
 * status 500 — erro de servidor para um dado que ela digitou. Agora é 400 com
 * o nome do campo.
 */
function inteiroDeDinheiro(valor: unknown, rotulo: string) {
  const numero = Math.abs(Number(exigir(valor, rotulo)))
  if (!Number.isFinite(numero) || !Number.isSafeInteger(numero) || numero > 2_147_483_647) {
    throw new ErroDeUso(`${rotulo}: use um valor em centavos.`)
  }
  return numero
}

export const POST = comSessao(async (sessao, requisicao) => {
  const dados = await corpo<{
    credor: string
    tipo?: string
    saldoDevedorCentavos: number
    jurosMensalBps?: number
    parcelaCentavos?: number
    parcelasTotal?: number
    parcelasPagas?: number
    diaVencimento?: number
    observacao?: string
  }>(requisicao)

  const divida = await prisma.divida.create({
    data: {
      larId: sessao.larId,
      credor: exigir(dados.credor, "Informe para quem você deve").trim(),
      tipo: (dados.tipo ?? "OUTRO") as never,
      saldoDevedorCentavos: inteiroDeDinheiro(dados.saldoDevedorCentavos, "Informe o saldo devedor"),
      jurosMensalBps: dados.jurosMensalBps ?? 0,
      parcelaCentavos: dados.parcelaCentavos ?? 0,
      parcelasTotal: dados.parcelasTotal ?? null,
      parcelasPagas: dados.parcelasPagas ?? 0,
      diaVencimento: dados.diaVencimento ?? 10,
      observacao: dados.observacao ?? null,
    },
  })

  return ok(divida, 201)
})
