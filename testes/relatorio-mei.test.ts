import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { ANEXO_TAMANHO_MAXIMO, dividirVenda, lembreteDoRelatorio, validarAnexo, mesParaFechar, montarRelatorio, prazoDoRelatorio, statusDaNota, type VendaDoMes } from "@/lib/loja/relatorio-mei"

const venda = (total: number, estado: "com" | "sem" | "pendente", servico = false, notaEmitida = false): VendaDoMes => ({ totalCentavos: total, temAnexo: estado === "com" && !notaEmitida, notaEmitida, semNota: estado === "sem", itens: [{ totalCentavos: total, ehServico: servico }] })

describe("com nota, sem nota e pendente", () => {
  it("a nota anexada ou emitida pelo Tino põe a venda em com nota", () => {
    assert.equal(statusDaNota({ notaEmitida: false, temAnexo: true, semNota: false }), "com")
    assert.equal(statusDaNota({ notaEmitida: true, temAnexo: false, semNota: false }), "com")
  })
  it("a nota vale mais que a marca 'não teve nota', que não a esconde", () => {
    assert.equal(statusDaNota({ notaEmitida: false, temAnexo: true, semNota: true }), "com")
  })
  it("'não teve nota' confirmado é sem nota; sem nenhuma resposta é pendente, nunca sem nota por omissão", () => {
    assert.equal(statusDaNota({ notaEmitida: false, temAnexo: false, semNota: true }), "sem")
    assert.equal(statusDaNota({ notaEmitida: false, temAnexo: false, semNota: false }), "pendente")
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
  it("separa com nota, sem nota e pendente, por categoria", () => {
    const r = montarRelatorio([venda(82000, "com"), venda(123000, "sem"), venda(7500, "pendente"), venda(164000, "com", true)], null)
    assert.equal(r.comercio.comCentavos, 82000)
    assert.equal(r.comercio.semCentavos, 123000)
    assert.equal(r.comercio.pendenteCentavos, 7500)
    assert.equal(r.servicos.comCentavos, 164000)
    assert.equal(r.totalCentavos, 82000 + 123000 + 7500 + 164000)
    assert.equal(r.pendenteCentavos, 7500)
  })
  it("o que ninguém resolveu não vira sem nota por omissão", () => {
    const r = montarRelatorio([venda(10000, "pendente")], null)
    assert.equal(r.comercio.semCentavos, 0)
    assert.equal(r.comercio.pendenteCentavos, 10000)
  })
  it("a nota emitida pelo Tino conta como com nota sem anexo", () => {
    const r = montarRelatorio([venda(10000, "com", false, true)], null)
    assert.equal(r.comercio.comCentavos, 10000)
  })
  it("mês lançado à parte vale no lugar do Balcão, sem contar duas vezes, e fica pendente", () => {
    const r = montarRelatorio([venda(99999, "com")], { comercioCentavos: 20000, servicosCentavos: 5000 })
    assert.equal(r.totalCentavos, 25000)
    assert.equal(r.comercio.pendenteCentavos, 20000)
  })
  it("lançamento zerado cai nas vendas do Balcão", () => {
    const r = montarRelatorio([venda(10000, "com")], { comercioCentavos: 0, servicosCentavos: 0 })
    assert.equal(r.comercio.comCentavos, 10000)
  })
})

describe("lembrete do dia 20", () => {
  const base = { competencia: "2026-09", prazo: "20/10/2026", nomeDoMes: "setembro de 2026", vendas: 8, pendentes: 3 }
  it("avisa enquanto há pendente, com a contagem de dias nos últimos cinco", () => {
    assert.match(lembreteDoRelatorio({ ...base, hoje: "2026-10-08" })!.texto, /até 20\/10\./)
    assert.match(lembreteDoRelatorio({ ...base, hoje: "2026-10-18" })!.texto, /2 dias/)
    assert.match(lembreteDoRelatorio({ ...base, hoje: "2026-10-20" })!.texto, /é hoje/)
  })
  it("o título concorda no singular e no plural", () => {
    assert.match(lembreteDoRelatorio({ ...base, hoje: "2026-10-08", pendentes: 1 })!.titulo, /1 venda pendente de nota/)
    assert.match(lembreteDoRelatorio({ ...base, hoje: "2026-10-08", pendentes: 3 })!.titulo, /3 vendas pendentes de nota/)
  })
  it("depois do prazo segue avisando, dizendo que passou", () => {
    assert.match(lembreteDoRelatorio({ ...base, hoje: "2026-10-25" })!.texto, /já passou/)
  })
  it("sem pendência ou sem venda no mês não lembra de nada", () => {
    assert.equal(lembreteDoRelatorio({ ...base, hoje: "2026-10-08", pendentes: 0 }), null)
    assert.equal(lembreteDoRelatorio({ ...base, hoje: "2026-10-08", vendas: 0 }), null)
  })
  it("a chave é uma por mês, para o texto acompanhar o número sem avisar de novo", () => {
    assert.equal(lembreteDoRelatorio({ ...base, hoje: "2026-10-08" })!.chave, lembreteDoRelatorio({ ...base, hoje: "2026-10-09", pendentes: 2 })!.chave)
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
