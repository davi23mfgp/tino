import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { aVistaOuParcelado, anteciparParcelas, compararPriceESac, quitarOuInvestir, tabelaSac } from "../src/lib/simulacoes"

describe("contas novas do simulador", () => {
  it("SAC: amortização igual, juros caindo, e fecha em zero", () => {
    // R$ 1.200,00 a 1% ao mês em 12 vezes: amortiza R$ 100,00 por mês e os
    // juros vão de R$ 12,00 a R$ 1,00. Soma dos juros: R$ 78,00.
    const tabela = tabelaSac(120_000, 100, 12)
    assert.equal(tabela[0].prestacaoCentavos, 11_200)
    assert.equal(tabela[11].prestacaoCentavos, 10_100)
    assert.equal(tabela[11].saldoCentavos, 0)
    assert.equal(tabela.reduce((soma, linha) => soma + linha.jurosCentavos, 0), 7_800)
    assert.equal(tabela.reduce((soma, linha) => soma + linha.amortizacaoCentavos, 0), 120_000)
  })
  it("SAC paga menos juros que a Price no mesmo empréstimo", () => {
    const comparacao = compararPriceESac(120_000, 100, 12)
    assert.equal(comparacao.sac.jurosCentavos, 7_800)
    assert.ok(comparacao.price.jurosCentavos > comparacao.sac.jurosCentavos)
    assert.equal(comparacao.sacPoupaCentavos, comparacao.price.jurosCentavos - 7_800)
    assert.ok(comparacao.sac.primeiraCentavos > comparacao.price.primeiraCentavos)
  })
  it("à vista com desconto ganha quando o juro embutido passa do que o dinheiro rende", () => {
    // 10 x R$ 100,00 ou R$ 900,00 à vista, dinheiro rendendo 1% ao mês: as
    // parcelas valem R$ 947,13 hoje, mais que os R$ 900,00.
    const resultado = aVistaOuParcelado({ aVistaCentavos: 90_000, parcelas: 10, parcelaCentavos: 10_000, rendimentoMensalBps: 100 })
    assert.equal(resultado.parceladoHojeCentavos, 94_713)
    assert.equal(resultado.melhor, "a_vista")
    assert.equal(resultado.diferencaCentavos, 4_713)
    assert.equal(resultado.jurosEmbutidosCentavos, 10_000)
    assert.ok((resultado.jurosEmbutidosMensalBps ?? 0) > 100)
  })
  it("sem desconto à vista, parcelar e deixar render ganha; sem juro não inventa taxa", () => {
    const semDesconto = aVistaOuParcelado({ aVistaCentavos: 100_000, parcelas: 10, parcelaCentavos: 10_000, rendimentoMensalBps: 100 })
    assert.equal(semDesconto.melhor, "parcelado")
    assert.equal(semDesconto.diferencaCentavos, 5_287)
    assert.equal(semDesconto.jurosEmbutidosMensalBps, null)
  })
  it("antecipar tira meses e juros; parcela que não cobre os juros não tem prazo", () => {
    // R$ 200,00 a 10% com parcela de R$ 120,00: dois meses, R$ 30,00 de juros.
    // Antecipando R$ 100,00: um mês, R$ 10,00 de juros.
    assert.deepEqual(anteciparParcelas({ saldoCentavos: 20_000, jurosMensalBps: 1000, parcelaCentavos: 12_000, antecipadoCentavos: 10_000 }), { mesesSem: 2, mesesCom: 1, mesesAMenos: 1, jurosPoupadosCentavos: 2_000 })
    assert.equal(anteciparParcelas({ saldoCentavos: 100_000, jurosMensalBps: 1000, parcelaCentavos: 10_000, antecipadoCentavos: 1_000 }), null)
  })
  it("quitar ou investir: ganha a taxa maior, e a diferença aparece", () => {
    // R$ 1.000,00 por 12 meses: dívida a 2% poupa R$ 268,24; investir a 1% rende R$ 126,83.
    const resultado = quitarOuInvestir({ valorCentavos: 100_000, jurosDaDividaMensalBps: 200, rendimentoMensalBps: 100, meses: 12 })
    assert.deepEqual(resultado, { quitarPoupaCentavos: 26_824, investirRendeCentavos: 12_683, melhor: "quitar", diferencaCentavos: 14_141 })
    assert.equal(quitarOuInvestir({ valorCentavos: 100_000, jurosDaDividaMensalBps: 50, rendimentoMensalBps: 100, meses: 12 }).melhor, "investir")
  })
})
