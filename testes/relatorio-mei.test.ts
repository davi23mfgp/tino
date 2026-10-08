import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { ANEXO_TAMANHO_MAXIMO, dividirVenda, pendenciaDaNota, validarAnexo, mesParaFechar, montarRelatorio, prazoDoRelatorio, statusDaNota, type VendaDoMes } from "@/lib/loja/relatorio-mei"

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

describe("pendências de nota", () => {
  it("venda não marcada pede para marcar; marcada com nota e sem a nota em mãos pede para anexar", () => {
    assert.equal(pendenciaDaNota({ status: "naoMarcado", notaEmitida: false, temAnexo: false }), "marcar")
    assert.equal(pendenciaDaNota({ status: "com", notaEmitida: false, temAnexo: false }), "anexar")
  })
  it("nota emitida pelo Tino ou anexada, e venda sem nota, não pedem nada", () => {
    assert.equal(pendenciaDaNota({ status: "com", notaEmitida: true, temAnexo: false }), null)
    assert.equal(pendenciaDaNota({ status: "com", notaEmitida: false, temAnexo: true }), null)
    assert.equal(pendenciaDaNota({ status: "sem", notaEmitida: false, temAnexo: false }), null)
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
