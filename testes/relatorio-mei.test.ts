import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { ANEXO_TAMANHO_MAXIMO, dividirVenda, validarAnexo, mesParaFechar, montarRelatorio, prazoDoRelatorio, statusDaNota, type VendaDoMes } from "@/lib/loja/relatorio-mei"

const venda = (total: number, temAnexo: boolean, notaEmitida = false, servico = false): VendaDoMes => ({ totalCentavos: total, temAnexo, notaEmitida, itens: [{ totalCentavos: total, ehServico: servico }] })

describe("com nota e pendente de nota", () => {
  it("a nota anexada ou emitida pelo Tino põe a venda do lado do com nota", () => {
    assert.equal(statusDaNota({ notaEmitida: false, temAnexo: true }), "com")
    assert.equal(statusDaNota({ notaEmitida: true, temAnexo: false }), "com")
  })
  it("toda venda sem a nota em mãos é pendente, não existe um 'sem nota' dito pela pessoa", () => {
    assert.equal(statusDaNota({ notaEmitida: false, temAnexo: false }), "pendente")
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
  it("separa com nota e pendente, por categoria", () => {
    const r = montarRelatorio([venda(82000, true), venda(123000, false), venda(7500, false), venda(164000, true, false, true)], null)
    assert.equal(r.comercio.comCentavos, 82000)
    assert.equal(r.comercio.pendenteCentavos, 123000 + 7500)
    assert.equal(r.servicos.comCentavos, 164000)
    assert.equal(r.totalCentavos, 82000 + 123000 + 7500 + 164000)
    assert.equal(r.pendenteCentavos, 123000 + 7500)
  })
  it("a nota emitida pelo Tino conta como com nota sem anexo", () => {
    const r = montarRelatorio([venda(10000, false, true)], null)
    assert.equal(r.comercio.comCentavos, 10000)
    assert.equal(r.pendenteCentavos, 0)
  })
  it("mês lançado à parte vale no lugar do Balcão, sem contar duas vezes, e fica pendente: não há venda onde anexar", () => {
    const r = montarRelatorio([venda(99999, true)], { comercioCentavos: 20000, servicosCentavos: 5000 })
    assert.equal(r.totalCentavos, 25000)
    assert.equal(r.comercio.pendenteCentavos, 20000)
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

describe("arquivo da nota anexada", () => {
  it("aceita PDF, XML e foto com a extensão certa", () => {
    assert.equal(validarAnexo({ nome: "nota-123.pdf", tipo: "application/pdf", tamanho: 90_000 }).ok, true)
    assert.equal(validarAnexo({ nome: "NFe.XML", tipo: "text/xml", tamanho: 4_000 }).ok, true)
    assert.equal(validarAnexo({ nome: "foto.jpeg", tipo: "image/jpeg", tamanho: 400_000 }).ok, true)
  })
  it("recusa vazio, grande demais, tipo de fora e extensão que não combina", () => {
    assert.equal(validarAnexo({ nome: "a.pdf", tipo: "application/pdf", tamanho: 0 }).ok, false)
    assert.equal(validarAnexo({ nome: "a.pdf", tipo: "application/pdf", tamanho: ANEXO_TAMANHO_MAXIMO + 1 }).ok, false)
    assert.equal(validarAnexo({ nome: "a.exe", tipo: "application/x-msdownload", tamanho: 100 }).ok, false)
    assert.equal(validarAnexo({ nome: "a.html", tipo: "application/pdf", tamanho: 100 }).ok, false)
  })
  it("limpa o nome: sem barra, aspas nem quebra de linha", () => {
    const lido = validarAnexo({ nome: '../x"\n.pdf', tipo: "application/pdf", tamanho: 10 })
    assert.equal(lido.ok && /[\\/"\r\n]/.test(lido.valor.nome), false)
  })
})
