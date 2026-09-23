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

const ORDEM_DOS_PESOS: PesoDoJuro[] = ["caro", "medio", "leve", "sem-juro"]

/**
 * Quanto do saldo devedor está em cada faixa de juro, do mais caro ao sem
 * juro. Faixa vazia não aparece.
 *
 * As partes somam exatamente 10.000 bps (maior resto): arredondar cada uma
 * por conta própria dava 99% ou 101% na legenda, e a pessoa desconfia do
 * resto da tela quando a soma não fecha.
 */
export function composicaoPorPeso(dividas: { saldoDevedorCentavos: number; jurosMensalBps: number }[]) {
  const total = dividas.reduce((soma, divida) => soma + Math.max(0, divida.saldoDevedorCentavos), 0)
  if (total <= 0) return []

  const partes = ORDEM_DOS_PESOS.map((peso) => {
    const centavos = dividas
      .filter((divida) => pesoDoJuro(divida.jurosMensalBps) === peso)
      .reduce((soma, divida) => soma + Math.max(0, divida.saldoDevedorCentavos), 0)
    const exato = (centavos / total) * 100
    return { peso, centavos, pontos: Math.floor(exato), resto: exato - Math.floor(exato) }
  }).filter((parte) => parte.centavos > 0)

  let falta = 100 - partes.reduce((soma, parte) => soma + parte.pontos, 0)
  for (const parte of [...partes].sort((a, b) => b.resto - a.resto)) {
    if (falta <= 0) break
    parte.pontos += 1
    falta -= 1
  }
  return partes.map(({ peso, centavos, pontos }) => ({ peso, centavos, percentual: pontos }))
}
