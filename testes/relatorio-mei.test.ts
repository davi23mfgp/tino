import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { dividirVenda, mesParaFechar, montarRelatorio, prazoDoRelatorio, statusDaNota, type VendaDoMes } from "@/lib/loja/relatorio-mei"

const venda = (total: number, comNota: boolean | null, notaEmitida = false, servico = false): VendaDoMes => ({ totalCentavos: total, comNota, notaEmitida, itens: [{ totalCentavos: total, ehServico: servico }] })

describe("status da nota da venda", () => {
  it("nota emitida pelo Tino vale por si, mesmo marcada como sem nota", () => {
    assert.equal(statusDaNota({ comNota: false, notaEmitida: true }), "com")
  })
  it("sem nota emitida vale a marcação; nulo é ainda não marcado, nunca sem nota", () => {
    assert.equal(statusDaNota({ comNota: true, notaEmitida: false }), "com")
    assert.equal(statusDaNota({ comNota: false, notaEmitida: false }), "sem")
    assert.equal(statusDaNota({ comNota: null, notaEmitida: false }), "naoMarcado")
  })
})

describe("dividir a venda entre comércio e serviço", () => {
  it("a soma das duas partes é sempre o total, com desconto e arredondamento", () => {
    const itens = [{ totalCentavos: 3333, ehServico: false }, { totalCentavos: 3333, ehServico: true }, { totalCentavos: 3334, ehServico: true }]
    const { comercioCentavos, servicosCentavos } = dividirVenda(9001, itens)
    assert.equal(comercioCentavos + servicosCentavos, 9001)
    assert.ok(servicosCentavos > comercioCentavos)
  })
  it("venda só de produto fica toda no comércio", () => {
    assert.deepEqual(dividirVenda(500, [{ totalCentavos: 500, ehServico: false }]), { comercioCentavos: 500, servicosCentavos: 0 })
  })
})

describe("relatório mensal", () => {
  it("separa com nota, sem nota e não marcado, por categoria", () => {
    const r = montarRelatorio([venda(82000, true), venda(123000, false), venda(7500, null), venda(164000, true, false, true)], null)
    assert.equal(r.comercio.comCentavos, 82000)
    assert.equal(r.comercio.semCentavos, 123000)
    assert.equal(r.comercio.naoMarcadoCentavos, 7500)
    assert.equal(r.servicos.comCentavos, 164000)
    assert.equal(r.totalCentavos, 82000 + 123000 + 7500 + 164000)
    assert.equal(r.naoMarcadoCentavos, 7500)
  })
  it("o que não foi marcado não vira sem nota por omissão", () => {
    const r = montarRelatorio([venda(10000, null)], null)
    assert.equal(r.comercio.semCentavos, 0)
    assert.equal(r.comercio.naoMarcadoCentavos, 10000)
  })
  it("mês lançado à parte vale no lugar do Balcão, sem contar duas vezes", () => {
    const r = montarRelatorio([venda(99999, true)], { comercioCentavos: 20000, servicosCentavos: 5000 })
    assert.equal(r.totalCentavos, 25000)
    assert.equal(r.comercio.naoMarcadoCentavos, 20000)
  })
  it("lançamento zerado cai nas vendas do Balcão", () => {
    const r = montarRelatorio([venda(10000, true)], { comercioCentavos: 0, servicosCentavos: 0 })
    assert.equal(r.comercio.comCentavos, 10000)
  })
})

describe("prazo e mês a fechar", () => {
  it("o prazo é o dia 20 do mês seguinte, inclusive na virada do ano", () => {
    assert.equal(prazoDoRelatorio("2026-09"), "20/10/2026")
    assert.equal(prazoDoRelatorio("2026-12"), "20/01/2027")
  })
  it("o mês a fechar é o anterior ao de hoje", () => {
    assert.equal(mesParaFechar("2026-10-08"), "2026-09")
    assert.equal(mesParaFechar("2027-01-03"), "2026-12")
  })
})
