import { comSessao, ok } from "@/lib/api"
import { competenciaAtual } from "@/lib/datas"
import { montarPanorama } from "@/lib/tino/panorama"
import { dividirRenda, efeitoDoCorte } from "@/lib/tino/investir"
import { valorVigente } from "@/lib/parametros"

export const dynamic = "force-dynamic"

/**
 * Base do planejamento de longo prazo.
 *
 * Devolve os números reais da pessoa — média de receita e despesa, saldo, o que
 * sobra — e a projeção do caixa. A divisão sugerida e o ARCA são cálculo puro,
 * feitos na tela a partir daqui.
 *
 * Os valores vêm da média dos últimos meses, não do mês corrente: um mês com
 * décimo terceiro ou com o IPVA distorce a conta e faria a projeção prometer
 * ou assustar sem motivo.
 */
export const GET = comSessao(async (sessao, requisicao) => {
  const url = new URL(requisicao.url)
  const corteCentavos = Math.max(0, Number(url.searchParams.get("corteCentavos") ?? 0) || 0)
  const meses = Math.min(60, Math.max(6, Number(url.searchParams.get("meses") ?? 24) || 24))

  const [panorama, jurosNegativoMensalBps] = await Promise.all([
    montarPanorama(sessao.larId, competenciaAtual()),
    // O juro do saldo negativo é o mesmo teto do cheque especial usado no plano
    // de pagamento e no simulador: as três telas têm de projetar com a mesma
    // taxa, senão a mesma pergunta recebe três respostas.
    valorVigente("juros.chequeEspecialBps"),
  ])

  const receita = panorama.medias.receitaCentavos
  const despesa = panorama.medias.despesaCentavos
  const sobra = receita - despesa

  const corte = efeitoDoCorte({
    saldoInicialCentavos: panorama.saldoTotalCentavos,
    receitaMensalCentavos: receita,
    despesaMensalCentavos: despesa,
    cortePorMesCentavos: corteCentavos,
    meses,
    jurosNegativoMensalBps,
  })

  return ok({
    receitaMensalCentavos: receita,
    despesaMensalCentavos: despesa,
    sobraMensalCentavos: sobra,
    saldoAtualCentavos: panorama.saldoTotalCentavos,
    // Sem histórico não há média, e média inventada viraria plano inventado.
    temBase: receita > 0,
    divisaoSugerida: dividirRenda(receita),
    corte,
    reserva: panorama.reserva,
    aposentadoria: panorama.aposentadoria,
  })
})
