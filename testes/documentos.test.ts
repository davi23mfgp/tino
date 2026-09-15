import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { ehBuscaDeDocumento, redigirResposta, termoDaBusca, type Achado } from "@/lib/tino/documentos"

describe("é busca de papel, ou é pergunta de dinheiro?", () => {
  it("precisa da coisa e do verbo de procura", () => {
    assert.equal(ehBuscaDeDocumento("você acha o comprovante do aluguel?"), true)
    assert.equal(ehBuscaDeDocumento("cadê a nota fiscal da geladeira"), true)
    assert.equal(ehBuscaDeDocumento("me manda o extrato de agosto"), true)
  })

  it("pergunta sobre dinheiro não vira busca de arquivo", () => {
    // "a fatura fechou?" fala de fatura mas não procura papel nenhum.
    assert.equal(ehBuscaDeDocumento("a fatura fechou?"), false)
    assert.equal(ehBuscaDeDocumento("quanto eu tenho hoje"), false)
    assert.equal(ehBuscaDeDocumento("quanto gastei no mercado"), false)
  })
})

describe("o que está sendo procurado", () => {
  it("tira as palavras que todo mundo usa e sobra o assunto", () => {
    assert.equal(termoDaBusca("você acha o comprovante do aluguel?"), "aluguel")
    assert.equal(termoDaBusca("cadê a nota fiscal da geladeira"), "geladeira")
  })

  it("sem assunto sobrando devolve null, e a busca vira 'os recentes'", () => {
    assert.equal(termoDaBusca("acha o comprovante"), null)
  })
})

describe("a resposta é honesta sobre o que o Tino guarda", () => {
  const lancamento: Achado = {
    tipo: "LANCAMENTO",
    titulo: "Aluguel",
    detalhe: "R$ 1.800,00 em 05/09/2026",
    rota: "/transacoes",
  }

  it("nada achado diz o que existe, em vez de só 'não achei'", () => {
    const texto = redigirResposta("aluguel", [])
    assert.match(texto, /Não achei/)
    assert.match(texto, /ainda não guardo comprovante avulso/)
  })

  it("só lançamento avisa que o comprovante não está guardado", () => {
    const texto = redigirResposta("aluguel", [lancamento])
    assert.match(texto, /Aluguel/)
    // O ponto do teste: não pode deixar a pessoa achar que tem o papel.
    assert.match(texto, /comprovante em si eu não guardo/)
  })

  it("fatura de verdade manda para onde o arquivo está", () => {
    const texto = redigirResposta("nubank", [
      { tipo: "FATURA", titulo: "fatura-nubank.pdf", detalhe: "recebida em 02/09/2026", rota: "/cartoes" },
    ])
    assert.match(texto, /está guardado/)
    assert.match(texto, /Cartões/)
  })
})
