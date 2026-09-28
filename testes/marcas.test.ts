import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import { join } from "node:path"
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

  it("reconhece mercado, farmácia e assinatura novos, sem pegar palavra comum", () => {
    assert.equal(nome("SUPERMERCADO EXTRA 123"), "Extra")
    assert.equal(nome("DOMINOS PIZZA"), "Domino's")
    assert.equal(nome("DROGARIA PACHECO 45"), "Pacheco")
    assert.equal(nome("OPENAI *CHATGPT SUBSCR"), "ChatGPT")
    assert.equal(nome("APPLE.COM/BILL ICLOUD"), "iCloud")
    // "Extra", "Dia" e "Oi" sozinhos são palavras comuns: sem a companhia
    // certa, não são a marca.
    assert.equal(nome("PAGAMENTO EXTRA"), null)
    assert.equal(nome("PADARIA BOM DIA"), null)
    assert.equal(nome("OI TUDO BEM"), null)
  })

  it("todo logo guardado no app existe em public/", () => {
    const comLogo = MARCAS.filter((marca) => marca.logo)
    assert.ok(comLogo.length > 50)
    for (const marca of comLogo) assert.ok(existsSync(join("public", marca.logo!)), marca.logo)
  })

  it("com intermediário na frente, a loja é o que vem depois do asterisco", () => {
    assert.equal(nome("PAYPAL *NETFLIX"), "Netflix")
    assert.equal(nome("EBW*SPOTIFY"), "Spotify")
    assert.equal(nome("DL*GOOGLE YOUTUBE"), "YouTube")
    // Loja desconhecida dentro do iFood: o pedido é do iFood.
    assert.equal(nome("IFD*BURGER DO ZE"), "iFood")
    assert.equal(nome("PAYPAL *LOJINHA123"), "PayPal")
    // Maquininha não é a loja: sem logo, em vez do logo do Mercado Pago.
    assert.equal(nome("MP*PADARIAPAOQUENTE"), null)
    assert.equal(nome("PAG*MERCADINHOSAOJOSE"), null)
    assert.equal(nome("EC *DROGASIL 123"), "Drogasil")
  })
})
