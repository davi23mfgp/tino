import { prisma } from "@/lib/prisma"
import { comSessao, corpo, ErroDeUso, exigir, ok } from "@/lib/api"
import { competenciaAtual } from "@/lib/datas"
import { analisarEmprestimo } from "@/lib/financeiro"
import { montarPanorama } from "@/lib/tino/panorama"

export const GET = comSessao(async (sessao) =>
  ok(
    await prisma.simulacaoEmprestimo.findMany({
      where: { larId: sessao.larId },
      orderBy: { criadoEm: "desc" },
      take: 20,
    }),
  ),
)

/**
 * Simula e dá o veredito. A simulação é gravada para o usuário comparar
 * propostas de bancos diferentes lado a lado depois.
 */
export const POST = comSessao(async (sessao, requisicao) => {
  const dados = await corpo<{
    titulo?: string
    valorCentavos: number
    parcelas: number
    jurosMensalBps: number
    custosExtrasCentavos?: number
    salvar?: boolean
  }>(requisicao)

  // Valor zero e parcela zero passavam e devolviam 200 com uma simulação sem
  // sentido — parcela de R$ 0,00 e CET de 450%. Resposta plausível para
  // entrada impossível é pior do que recusar: a pessoa acredita no número.
  const valorCentavos = Math.abs(Number(exigir(dados.valorCentavos, "Informe o valor do empréstimo")))
  if (!Number.isFinite(valorCentavos) || valorCentavos < 100) {
    throw new ErroDeUso("Informe o valor do empréstimo, a partir de R$ 1,00.")
  }

  const parcelas = Math.trunc(Number(exigir(dados.parcelas, "Informe o número de parcelas")))
  if (!Number.isFinite(parcelas) || parcelas < 1 || parcelas > 480) {
    throw new ErroDeUso("Número de parcelas: use de 1 a 480.")
  }

  const panorama = await montarPanorama(sessao.larId, competenciaAtual())

  const analise = analisarEmprestimo({
    valorCentavos,
    parcelas,
    jurosMensalBps: Number(dados.jurosMensalBps ?? 0),
    custosExtrasCentavos: dados.custosExtrasCentavos ?? 0,
    rendaMensalCentavos: panorama.medias.receitaCentavos || panorama.mes.receitasCentavos || 1,
    parcelasAtuaisCentavos: panorama.dividas.parcelaMensalCentavos,
    sobraMensalCentavos: panorama.medias.sobraCentavos,
    reservaCentavos: panorama.reserva.atualCentavos,
    maiorJurosAtualBps: Math.max(0, ...panorama.dividas.lista.map((divida) => divida.jurosMensalBps)),
  })

  if (dados.salvar) {
    await prisma.simulacaoEmprestimo.create({
      data: {
        larId: sessao.larId,
        titulo: dados.titulo?.trim() || `${parcelas}x de empréstimo`,
        valorCentavos,
        parcelas,
        jurosMensalBps: Number(dados.jurosMensalBps ?? 0),
        custosExtrasCentavos: dados.custosExtrasCentavos ?? 0,
        // A tabela de amortização completa fica fora do JSON gravado: são
        // centenas de linhas recalculáveis a qualquer momento pela simulação.
        resultado: {
          parcelaCentavos: analise.parcelaCentavos,
          totalPagoCentavos: analise.totalPagoCentavos,
          totalJurosCentavos: analise.totalJurosCentavos,
          cetMensalBps: analise.cetMensalBps,
          cetAnualBps: analise.cetAnualBps,
          comprometimentoBps: analise.comprometimentoBps,
        },
        veredito: analise.veredito,
      },
    })
  }

  return ok(analise)
})
