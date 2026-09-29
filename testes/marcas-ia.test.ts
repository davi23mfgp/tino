import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { chaveDaDescricao } from "@/lib/marcas"
import { COTA_POR_DIA, decidir, lerResposta, montarPergunta, vaiParaIA } from "@/lib/marcas-ia"

const semLogo = async () => false
const comLogo = async () => true

describe("IA das lojas: o que vai para a IA", () => {
  it("só compra em loja desconhecida; Pix, tarifa e loja do catálogo ficam de fora", () => {
    assert.equal(vaiParaIA("SUPERM BOA ESPERANCA 0123"), true)
    assert.equal(vaiParaIA("PIX JOAO DA SILVA"), false)
    assert.equal(vaiParaIA("Transferência para Maria"), false)
    assert.equal(vaiParaIA("TARIFA PACOTE"), false)
    assert.equal(vaiParaIA("NETFLIX.COM"), false)
    assert.equal(vaiParaIA("IFD*BURGER DO ZE"), false)
    assert.equal(vaiParaIA("MP*12"), false)
  })

  it("a mesma loja com número e intermediário diferentes é uma chave só", () => {
    assert.equal(chaveDaDescricao("MP*SUPERM BOA ESPERANCA 0123"), chaveDaDescricao("SUPERM BOA ESPERANCA 0456"))
  })

  it("a pergunta leva cada descrição com o índice e pede null quando não souber", () => {
    const pergunta = montarPergunta(["SUPERM A", "LOJA B"])
    assert.match(pergunta, /0: SUPERM A/)
    assert.match(pergunta, /1: LOJA B/)
    assert.match(pergunta, /null/)
    assert.ok(COTA_POR_DIA <= 50)
  })
})

describe("IA das lojas: ler a resposta sem confiar nela", () => {
  it("aceita JSON com texto em volta e descarta item fora do formato", () => {
    const texto = 'Claro: {"itens":[{"i":0,"marca":"Assaí","site":"assai.com.br","confianca":95},{"i":7,"marca":"X"},{"i":1,"marca":null,"confianca":10},{"i":0,"marca":"repetido"}]} fim'
    const lidas = lerResposta(texto, 2)
    assert.equal(lidas.length, 2)
    assert.equal(lidas[0].marca, "Assaí")
    assert.equal(lidas[1].marca, null)
  })

  it("resposta quebrada vira lista vazia, não erro", () => {
    assert.deepEqual(lerResposta("não sei", 3), [])
    assert.deepEqual(lerResposta("{quebrado", 3), [])
  })
})

describe("IA das lojas: quando o palpite vira logo", () => {
  it("marca do catálogo com confiança vira logo, com o nome e o site do catálogo", async () => {
    const decisao = await decidir({ i: 0, marca: "assai atacadista", site: "www.assai.com.br", confianca: 90 }, semLogo)
    assert.equal(decisao.situacao, "IDENTIFICADA")
    assert.equal(decisao.marcaNome, "Assaí")
  })

  it("marca do catálogo com pouca confiança fica só como sugestão", async () => {
    assert.equal((await decidir({ i: 0, marca: "Assaí", site: null, confianca: 60 }, comLogo)).situacao, "SUGERIDA")
  })

  it("fora do catálogo, só vira logo com confiança alta E logo de verdade no site", async () => {
    const palpite = { i: 0, marca: "Supermercado Boa Esperança", site: "boaesperanca.com.br", confianca: 92 }
    assert.equal((await decidir(palpite, comLogo)).situacao, "IDENTIFICADA")
    assert.equal((await decidir(palpite, semLogo)).situacao, "SUGERIDA")
    assert.equal((await decidir({ ...palpite, confianca: 80 }, comLogo)).situacao, "SUGERIDA")
  })

  it("sem marca ou com confiança baixa, a IA não sabe", async () => {
    assert.equal((await decidir({ i: 0, marca: null, site: null, confianca: 0 }, comLogo)).situacao, "DESCONHECIDA")
    assert.equal((await decidir({ i: 0, marca: "Loja X", site: "x.com.br", confianca: 30 }, comLogo)).situacao, "DESCONHECIDA")
  })

  it("site inválido não é consultado", async () => {
    let consultou = false
    const decisao = await decidir({ i: 0, marca: "Loja X", site: "localhost", confianca: 99 }, async () => ((consultou = true), true))
    assert.equal(consultou, false)
    assert.equal(decisao.situacao, "SUGERIDA")
  })
})
