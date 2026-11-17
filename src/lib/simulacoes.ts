import { parcelaPrice, tabelaPrice, taxaInternaMensalBps, type LinhaAmortizacao } from "@/lib/financeiro"

/**
 * As contas que o Simulador ainda não fazia (revisão de 16/11/2026): SAC, à
 * vista contra parcelado, antecipar parcelas e quitar dívida contra investir.
 *
 * Tudo aqui é função pura, em centavos inteiros e taxa em pontos-base, para a
 * tela e o assistente usarem a mesma conta que o teste confere. Nenhuma
 * função decide pela pessoa: devolve os números e quem compara é ela.
 */
const taxa = (bps: number) => bps / 10_000

/**
 * Tabela SAC: amortização igual todo mês, juros sobre o saldo, então a
 * prestação começa mais alta que na Price e cai. A última absorve o resíduo
 * do arredondamento, como em `tabelaPrice`.
 */
export function tabelaSac(principalCentavos: number, jurosMensalBps: number, parcelas: number): LinhaAmortizacao[] {
  const amortizacaoFixa = Math.round(principalCentavos / parcelas)
  const linhas: LinhaAmortizacao[] = []
  let saldo = principalCentavos
  for (let n = 1; n <= parcelas; n += 1) {
    const juros = Math.round(saldo * taxa(jurosMensalBps))
    const amortizacao = n === parcelas ? saldo : amortizacaoFixa
    saldo -= amortizacao
    linhas.push({ parcela: n, jurosCentavos: juros, amortizacaoCentavos: amortizacao, prestacaoCentavos: amortizacao + juros, saldoCentavos: Math.max(0, saldo) })
  }
  return linhas
}

export interface ResumoDoFinanciamento { primeiraCentavos: number; ultimaCentavos: number; totalPagoCentavos: number; jurosCentavos: number }

function resumir(tabela: LinhaAmortizacao[], principalCentavos: number): ResumoDoFinanciamento {
  const total = tabela.reduce((soma, linha) => soma + linha.prestacaoCentavos, 0)
  return { primeiraCentavos: tabela[0].prestacaoCentavos, ultimaCentavos: tabela[tabela.length - 1].prestacaoCentavos, totalPagoCentavos: total, jurosCentavos: total - principalCentavos }
}

/** Os dois sistemas lado a lado, e quanto de juros o SAC poupa. */
export function compararPriceESac(principalCentavos: number, jurosMensalBps: number, parcelas: number) {
  const price = resumir(tabelaPrice(principalCentavos, jurosMensalBps, parcelas), principalCentavos)
  const sac = resumir(tabelaSac(principalCentavos, jurosMensalBps, parcelas), principalCentavos)
  return { price, sac, sacPoupaCentavos: price.jurosCentavos - sac.jurosCentavos }
}

/**
 * À vista ou parcelado.
 *
 * Parcelar "sem juros" com desconto à vista tem juro escondido: a diferença
 * entre a soma das parcelas e o preço à vista. A conta honesta é trazer as
 * parcelas a valor de hoje pela taxa que o dinheiro da pessoa rende: se o
 * valor de hoje das parcelas for menor que o preço à vista, parcelar e deixar
 * o dinheiro rendendo sai mais barato.
 *
 * A primeira parcela é em 30 dias. `jurosEmbutidosMensalBps` é nulo quando não
 * há juro (parcelas somam o preço à vista ou menos).
 */
export function aVistaOuParcelado(entrada: { aVistaCentavos: number; parcelas: number; parcelaCentavos: number; rendimentoMensalBps: number }) {
  const { aVistaCentavos, parcelas, parcelaCentavos, rendimentoMensalBps } = entrada
  const r = taxa(rendimentoMensalBps)
  let valorDeHoje = 0
  for (let n = 1; n <= parcelas; n += 1) valorDeHoje += parcelaCentavos / Math.pow(1 + r, n)
  const parceladoHojeCentavos = Math.round(valorDeHoje)
  const totalParceladoCentavos = parcelaCentavos * parcelas
  return {
    totalParceladoCentavos,
    parceladoHojeCentavos,
    jurosEmbutidosCentavos: Math.max(0, totalParceladoCentavos - aVistaCentavos),
    jurosEmbutidosMensalBps: totalParceladoCentavos > aVistaCentavos ? taxaInternaMensalBps([aVistaCentavos, ...Array.from({ length: parcelas }, () => -parcelaCentavos)]) : null,
    melhor: parceladoHojeCentavos < aVistaCentavos ? ("parcelado" as const) : ("a_vista" as const),
    diferencaCentavos: Math.abs(aVistaCentavos - parceladoHojeCentavos),
  }
}

/**
 * Antecipar: pagar um valor a mais agora, mantendo a parcela, e ver quantos
 * meses e quanto de juros isso tira. Devolve nulo quando a parcela não cobre
 * nem os juros do mês (a dívida não acaba), em vez de inventar um prazo.
 */
export function anteciparParcelas(entrada: { saldoCentavos: number; jurosMensalBps: number; parcelaCentavos: number; antecipadoCentavos: number }) {
  const correr = (saldoInicial: number) => {
    let saldo = saldoInicial
    let meses = 0
    let juros = 0
    while (saldo > 0 && meses < 1200) {
      const jurosDoMes = Math.round(saldo * taxa(entrada.jurosMensalBps))
      if (entrada.parcelaCentavos <= jurosDoMes) return null
      juros += jurosDoMes
      saldo = saldo + jurosDoMes - Math.min(entrada.parcelaCentavos, saldo + jurosDoMes)
      meses += 1
    }
    return { meses, jurosCentavos: juros }
  }
  const sem = correr(entrada.saldoCentavos)
  const com = correr(Math.max(0, entrada.saldoCentavos - entrada.antecipadoCentavos))
  if (!sem || !com) return null
  return { mesesSem: sem.meses, mesesCom: com.meses, mesesAMenos: sem.meses - com.meses, jurosPoupadosCentavos: sem.jurosCentavos - com.jurosCentavos }
}

/**
 * Quitar dívida ou investir o mesmo valor, pelo mesmo prazo. Quitar "rende" o
 * juro que deixa de ser pago; investir rende a taxa informada, já líquida de
 * imposto. Ganha a taxa maior, e a função mostra por quanto.
 */
export function quitarOuInvestir(entrada: { valorCentavos: number; jurosDaDividaMensalBps: number; rendimentoMensalBps: number; meses: number }) {
  const juros = (bps: number) => Math.round(entrada.valorCentavos * (Math.pow(1 + taxa(bps), entrada.meses) - 1))
  const quitarPoupaCentavos = juros(entrada.jurosDaDividaMensalBps)
  const investirRendeCentavos = juros(entrada.rendimentoMensalBps)
  return {
    quitarPoupaCentavos,
    investirRendeCentavos,
    melhor: quitarPoupaCentavos >= investirRendeCentavos ? ("quitar" as const) : ("investir" as const),
    diferencaCentavos: Math.abs(quitarPoupaCentavos - investirRendeCentavos),
  }
}

export { parcelaPrice }
