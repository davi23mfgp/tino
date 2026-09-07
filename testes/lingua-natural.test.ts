import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { lerDivida, lerMeta } from "@/lib/tino/lingua-natural"

const HOJE = new Date(Date.UTC(2026, 8, 7)) // 07/09/2026

describe("lerDivida", () => {
  it("lê credor e saldo do jeito mais simples", () => {
    const lida = lerDivida("Nubank 3200")
    assert.equal(lida.credor, "Nubank")
    assert.equal(lida.saldoDevedorCentavos, 320000)
    assert.equal(lida.jurosMensalBps, null)
    assert.equal(lida.parcelaCentavos, null)
  })

  it("lê juros, parcela e dia de vencimento juntos", () => {
    const lida = lerDivida("Nubank 3200, juros 2,5% ao mês, parcela 350, vence dia 10")
    assert.equal(lida.credor, "Nubank")
    assert.equal(lida.saldoDevedorCentavos, 320000)
    assert.equal(lida.jurosMensalBps, 250)
    assert.equal(lida.parcelaCentavos, 35000)
    assert.equal(lida.diaVencimento, 10)
  })

  it("lê parcelas pagas e total no formato 'X de Y'", () => {
    const lida = lerDivida("Financiamento carro 45000, 10 de 60 parcelas")
    assert.equal(lida.parcelasPagas, 10)
    assert.equal(lida.parcelasTotal, 60)
    assert.equal(lida.tipo, "FINANCIAMENTO_VEICULO")
  })

  it("lê só o total de parcelas quando não há 'pagas'", () => {
    const lida = lerDivida("Magazine Luiza 900, 24 parcelas")
    assert.equal(lida.parcelasTotal, 24)
    assert.equal(lida.parcelasPagas, null)
  })

  it("reconhece o tipo pela palavra-chave", () => {
    assert.equal(lerDivida("Cartão Itaú 1800").tipo, "CARTAO_ROTATIVO")
    assert.equal(lerDivida("Cheque especial 400").tipo, "CHEQUE_ESPECIAL")
    assert.equal(lerDivida("Consignado Caixa 12000").tipo, "CONSIGNADO")
    assert.equal(lerDivida("Empréstimo pessoal 5000").tipo, "EMPRESTIMO_PESSOAL")
    assert.equal(lerDivida("Algo sem tipo reconhecível 500").tipo, null)
  })

  it("tira 'devo' do começo do credor", () => {
    const lida = lerDivida("devo pro Carlos 500")
    assert.equal(lida.credor, "pro Carlos")
  })
})

describe("lerMeta", () => {
  it("lê nome e valor alvo", () => {
    const lida = lerMeta("Viagem 8000", HOJE)
    assert.equal(lida.nome, "Viagem")
    assert.equal(lida.alvoCentavos, 800000)
    assert.equal(lida.saldoCentavos, null)
    assert.equal(lida.dataAlvo, null)
  })

  it("lê quanto já tem guardado", () => {
    const lida = lerMeta("Viagem 8000, já tenho 1200", HOJE)
    assert.equal(lida.alvoCentavos, 800000)
    assert.equal(lida.saldoCentavos, 120000)
  })

  it("lê o mês-alvo e assume o ano seguinte quando o mês já passou", () => {
    // Hoje é setembro/2026; "até março" tem de cair em 2027, não neste ano.
    const lida = lerMeta("Viagem 8000 até março", HOJE)
    assert.equal(lida.dataAlvo, "2027-03-01")
  })

  it("lê o mês-alvo ainda dentro do ano quando ele não passou", () => {
    const lida = lerMeta("Viagem 8000 até dezembro", HOJE)
    assert.equal(lida.dataAlvo, "2026-12-01")
  })

  it("aceita ano explícito no prazo", () => {
    const lida = lerMeta("Reserva 15000 até dezembro de 2028", HOJE)
    assert.equal(lida.dataAlvo, "2028-12-01")
  })
})
