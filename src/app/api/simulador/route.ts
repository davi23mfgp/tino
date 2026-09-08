import { prisma } from "@/lib/prisma"
import { comSessao, corpo, ok } from "@/lib/api"
import { competenciaAtual } from "@/lib/datas"
import { montarPanorama } from "@/lib/tino/panorama"
import { compromissosFuturos } from "@/lib/parcelamentos"
import { comparar, type Ajuste, type CenarioBase } from "@/lib/tino/simulador"
import { valorVigente } from "@/lib/parametros"

export const dynamic = "force-dynamic"

/**
 * Monta o cenário atual do lar a partir do que está no banco.
 *
 * A base é a mesma do plano de pagamento e da projeção: os três precisam contar
 * a mesma história, senão o usuário vê números diferentes para a mesma pergunta
 * em telas diferentes.
 */
async function montarBase(larId: string, competencia: string): Promise<{ base: CenarioBase; nomes: Record<string, string> }> {
  const [panorama, dividas, compromissos, chequeEspecialPadraoBps] = await Promise.all([
    montarPanorama(larId, competencia),
    prisma.divida.findMany({ where: { larId, quitada: false } }),
    compromissosFuturos(larId, 36),
    // Sem taxa informada, o cheque especial entra no teto legal. O número não
    // fica mais em constante: é parâmetro do sistema, editável em
    // /admin/configuracoes, porque muda por decisão do Banco Central.
    valorVigente("juros.chequeEspecialBps"),
  ])

  const simuladas: CenarioBase["dividas"] = []

  // Fatura de cartão em aberto é dívida de verdade: sai do saldo quando for
  // paga, e não é abatida sozinha por qualquer entrada na conta corrente.
  for (const saldo of panorama.saldoPorConta) {
    if (saldo.tipo !== "CARTAO_CREDITO" || saldo.saldoCentavos >= 0) continue
    simuladas.push({
      id: saldo.id,
      nome: `Fatura ${saldo.nome}`,
      saldoCentavos: Math.abs(saldo.saldoCentavos),
      // Sem juro enquanto for paga integral; virar rotativo é outra dívida.
      jurosMensalBps: 0,
      parcelaCentavos: 0,
    })
  }

  // O cheque especial fica fora da lista de dívidas de propósito: ele é o
  // próprio saldo negativo da conta, e entra no simulador como taxa aplicada
  // sobre esse saldo. A taxa vem da dívida que o onboarding cadastrou.
  const dividaChequeEspecial = dividas.find((divida) => divida.tipo === "CHEQUE_ESPECIAL")

  for (const divida of dividas) {
    if (divida.tipo === "CHEQUE_ESPECIAL") continue
    simuladas.push({
      id: divida.id,
      nome: divida.credor,
      saldoCentavos: divida.saldoDevedorCentavos,
      jurosMensalBps: divida.jurosMensalBps,
      parcelaCentavos: divida.parcelaCentavos,
    })
  }

  const parcelasPorCompetencia = Object.fromEntries(
    compromissos.map((linha) => [linha.competencia, linha.totalCentavos]),
  )

  const renda = panorama.medias.receitaCentavos || panorama.mes.receitasCentavos
  // As parcelas entram por competência; tirá-las do custo de vida evita
  // contar o mesmo dinheiro duas vezes.
  const custoDeVida = Math.max(0, panorama.medias.despesaCentavos - (parcelasPorCompetencia[competencia] ?? 0))

  return {
    base: {
      competenciaInicial: competencia,
      saldoInicialCentavos: panorama.saldoTotalCentavos,
      rendaMensalCentavos: renda,
      custoDeVidaMensalCentavos: custoDeVida,
      parcelasPorCompetencia,
      dividas: simuladas,
      jurosChequeEspecialBps: dividaChequeEspecial?.jurosMensalBps ?? chequeEspecialPadraoBps,
      aporteMetaMensalCentavos: panorama.metas.reduce((soma, meta) => soma + meta.aporteAtualCentavos, 0),
    },
    nomes: Object.fromEntries(simuladas.map((divida) => [divida.id, divida.nome])),
  }
}

/** Cenário atual, sem nenhuma hipótese — é o que a tela mostra ao abrir. */
export const GET = comSessao(async (sessao, requisicao) => {
  const url = new URL(requisicao.url)
  const meses = Math.min(Math.max(Number(url.searchParams.get("meses") ?? 24), 6), 60)
  const { base, nomes } = await montarBase(sessao.larId, competenciaAtual())

  return ok({ ...comparar(base, [], meses), entrada: base, nomesDividas: nomes })
})

/** Roda as hipóteses e devolve a comparação com o cenário atual. */
export const POST = comSessao(async (sessao, requisicao) => {
  const dados = await corpo<{ ajustes: Ajuste[]; meses?: number }>(requisicao)
  const meses = Math.min(Math.max(dados.meses ?? 24, 6), 60)
  const { base, nomes } = await montarBase(sessao.larId, competenciaAtual())

  return ok({ ...comparar(base, dados.ajustes ?? [], meses), entrada: base, nomesDividas: nomes })
})
