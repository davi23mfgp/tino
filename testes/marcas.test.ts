import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { MARCAS, marcaDaCompra, siteConhecido } from "@/lib/marcas"

const nome = (descricao: string) => marcaDaCompra(descricao)?.nome ?? null

describe("loja pelo texto da compra", () => {
  it("reconhece o jeito que o banco escreve", () => {
    assert.equal(nome("PAG*IFOOD"), "iFood")
    assert.equal(nome("UBER *TRIP"), "Uber")
    assert.equal(nome("NETFLIX.COM"), "Netflix")
    assert.equal(nome("SUPERMERCADO ASSAI"), "Assaí")
    assert.equal(nome("Drogasil 0123"), "Drogasil")
    assert.equal(nome("MERCADOLIVRE*VENDEDOR"), "Mercado Livre")
  })

  it("compara palavra inteira: Uberlândia não é Uber, Timbó não é TIM", () => {
    // O defeito que a comparação por pedaço traria: logo de marca em compra
    // que não é dela.
    assert.equal(nome("PADARIA UBERLANDIA"), null)
    assert.equal(nome("MERCADINHO TIMBO"), null)
    assert.equal(nome("MERCADO SAO JOSE"), null)
  })

  it("mais palavras ganha; empatado, ganha a que vem primeiro", () => {
    assert.equal(nome("GOOGLE *YOUTUBE PREMIUM"), "YouTube")
    assert.equal(nome("MERCADO PAGO*LOJA"), "Mercado Pago")
    assert.equal(nome("POSTO SHELL IPIRANGA"), "Shell")
  })

  it("cada site do catálogo é único e responde por si", () => {
    const sites = MARCAS.map((marca) => marca.site)
    assert.equal(new Set(sites).size, sites.length)
    assert.equal(siteConhecido("ifood.com.br"), true)
    assert.equal(siteConhecido("exemplo.com"), false)
  })
})
