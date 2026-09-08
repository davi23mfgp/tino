/**
 * Monta o plano de pagamento de um lar a partir do banco.
 *
 * Extraído de `/plano` em 07/09/2026 porque a tela Hoje (`/painel`) passou a
 * precisar da MESMA conta — "a conta que mais dói" e "o que fazer agora" —
 * e copiar a lógica de montagem de alvos pra dois arquivos é como as duas
 * versões desandam sem ninguém perceber. Uma função, dois chamadores.
 */
import { prisma } from "@/lib/prisma"
import { montarPanorama, type Panorama } from "@/lib/tino/panorama"
import { compromissosFuturos } from "@/lib/parcelamentos"
import { montarPlanoPagamento, type AlvoPagamento, type PlanoPagamento } from "@/lib/tino/plano-pagamento"
import { valoresVigentes } from "@/lib/parametros"

export interface PlanoDoLar {
  panorama: Panorama
  alvos: AlvoPagamento[]
  plano: PlanoPagamento
  /** O que sobra pra atacar dívida todo mês — renda menos custo de vida. */
  capacidadeMensalCentavos: number
}

export async function montarPlanoDoLar(larId: string, competencia: string): Promise<PlanoDoLar> {
  const [panorama, dividas, compromissos, parametros] = await Promise.all([
    montarPanorama(larId, competencia),
    prisma.divida.findMany({ where: { larId, quitada: false } }),
    compromissosFuturos(larId, 36),
    valoresVigentes(),
  ])

  const JUROS_PADRAO = {
    chequeEspecial: parametros["juros.chequeEspecialBps"],
    rotativo: parametros["juros.rotativoBps"],
  }

  const alvos: AlvoPagamento[] = []

  // Contas com dívida vinculada (cheque especial cadastrado) entram só uma vez:
  // o saldo negativo da conta e a dívida são o mesmo dinheiro, e somar os dois
  // dobraria o valor a pagar.
  const contasComDivida = new Set(dividas.map((divida) => divida.contaId).filter(Boolean))

  for (const saldo of panorama.saldoPorConta) {
    if (saldo.saldoCentavos >= 0 || contasComDivida.has(saldo.id)) continue
    const cartao = saldo.tipo === "CARTAO_CREDITO"
    alvos.push({
      id: saldo.id,
      nome: cartao ? `Fatura ${saldo.nome}` : `${saldo.nome} (cheque especial)`,
      tipo: cartao ? "FATURA" : "CHEQUE_ESPECIAL",
      saldoCentavos: Math.abs(saldo.saldoCentavos),
      jurosMensalBps: cartao ? 0 : JUROS_PADRAO.chequeEspecial,
      minimoMensalCentavos: 0,
    })
  }

  for (const divida of dividas) {
    alvos.push({
      id: divida.id,
      nome: divida.credor,
      tipo: divida.tipo === "CARTAO_ROTATIVO" ? "ROTATIVO" : "EMPRESTIMO",
      saldoCentavos: divida.saldoDevedorCentavos,
      jurosMensalBps: divida.jurosMensalBps || (divida.tipo === "CARTAO_ROTATIVO" ? JUROS_PADRAO.rotativo : 0),
      minimoMensalCentavos: divida.parcelaCentavos,
    })
  }

  const parcelasPorCompetencia = Object.fromEntries(
    compromissos.map((linha) => [linha.competencia, linha.totalCentavos]),
  )

  const renda = panorama.medias.receitaCentavos || panorama.mes.receitasCentavos
  const custoDeVida = Math.max(0, panorama.medias.despesaCentavos - (parcelasPorCompetencia[competencia] ?? 0))

  const plano = montarPlanoPagamento({
    competenciaInicial: competencia,
    alvos,
    rendaMensalCentavos: renda,
    custoDeVidaMensalCentavos: custoDeVida,
    parcelasPorCompetencia,
  })

  return { panorama, alvos, plano, capacidadeMensalCentavos: renda - custoDeVida }
}
