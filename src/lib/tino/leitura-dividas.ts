/**
 * Como ler as dívidas de uma olhada: o peso de cada juro e quanto as parcelas
 * tomam da renda.
 *
 * Fica fora da tela porque são regras com referência, e referência espalhada
 * como número mágico vira duas regras diferentes para a mesma pergunta — o
 * diagnóstico e a tela de dívidas precisam chamar de "caro" a mesma dívida.
 */

export type PesoDoJuro = "caro" | "medio" | "leve" | "sem-juro"

/**
 * Faixas de juro ao mês, em bps.
 *
 * Abaixo de 2% a.m. ficam as linhas com garantia (consignado, veículo,
 * imóvel); entre 2% e 5%, crédito pessoal comum; de 5% para cima só chega o
 * crédito sem garantia nenhuma — rotativo do cartão e cheque especial
 * passam de 8%. É referência de mercado, não regra legal.
 */
export const REFERENCIA_JURO_MENSAL = { medio: 200, caro: 500 }

/**
 * Parcelas de dívida sobre a renda, em bps. Até 20% é confortável; 30% é o
 * teto que os bancos usam no consignado.
 */
export const REFERENCIA_COMPROMETIMENTO = { bom: 2000, atencao: 3000 }

export function pesoDoJuro(jurosMensalBps: number): PesoDoJuro {
  if (jurosMensalBps <= 0) return "sem-juro"
  if (jurosMensalBps >= REFERENCIA_JURO_MENSAL.caro) return "caro"
  if (jurosMensalBps >= REFERENCIA_JURO_MENSAL.medio) return "medio"
  return "leve"
}

/**
 * Quanto das parcelas pesa na renda.
 *
 * Sem renda conhecida devolve `null`, e não zero nem 100%: dividir por um
 * número inventado daria um indicador com cara de fato. A tela pede para
 * cadastrar a renda.
 */
export function comprometimentoBps(parcelaMensalCentavos: number, rendaMensalCentavos: number): number | null {
  if (rendaMensalCentavos <= 0) return null
  return Math.round((parcelaMensalCentavos / rendaMensalCentavos) * 10_000)
}

export function faixaComprometimento(valorBps: number): "BOM" | "ATENCAO" | "CRITICO" {
  if (valorBps <= REFERENCIA_COMPROMETIMENTO.bom) return "BOM"
  if (valorBps <= REFERENCIA_COMPROMETIMENTO.atencao) return "ATENCAO"
  return "CRITICO"
}

/**
 * Juros que R$ 100 pagos a mais nesta dívida deixam de gerar no mês seguinte.
 *
 * É a conta de um mês só, de propósito: o efeito acumulado depende do plano
 * inteiro e aparece na simulação de pagar mais, que é onde ele é calculado.
 */
export function jurosEvitadosPorCemReais(jurosMensalBps: number): number {
  return Math.round((10_000 * Math.max(0, jurosMensalBps)) / 10_000)
}
