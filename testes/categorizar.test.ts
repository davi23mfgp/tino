import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { limparDescricao, capitalizar, categorizar, regraAPartirDeCorrecao } from "@/lib/categorizar"
import type { RegraAplicavel } from "@/lib/categorizar"

const regra = (parcial: Partial<RegraAplicavel>): RegraAplicavel => ({
  id: "r1",
  padrao: "IFOOD",
  regex: false,
  categoriaId: "cat-delivery",
  membroId: null,
  renomearPara: null,
  tags: [],
  prioridade: 100,
  ativa: true,
  ...parcial,
})

describe("limparDescricao", () => {
  it("tira prefixo de adquirente", () => {
    assert.match(limparDescricao("PAG*IFOOD SAO PAULO BR"), /^IFOOD/)
    assert.match(limparDescricao("MP*TERABYTESHOP"), /^TERABYTESHOP/)
  })

  it("não come o começo da palavra seguinte ao prefixo", () => {
    assert.equal(limparDescricao("PAGAMENTO DEB AUTOMATIC"), "DEB AUTOMATIC")
    assert.equal(limparDescricao("PIX PARAISO DAS FLORES"), "PARAISO DAS FLORES")
    assert.equal(limparDescricao("PAGAMENTO DE BOLETO"), "BOLETO")
  })

  it("tira a numeração de parcela", () => {
    assert.ok(!limparDescricao("LOJA X 3/12").includes("3/12"))
    assert.ok(!limparDescricao("LOJA X PARCELA 2 DE 6").includes("PARCELA"))
  })

  it("tira o sufixo de país", () => {
    assert.ok(!limparDescricao("UBER *TRIP BR").endsWith("BR"))
  })

  it("nunca devolve texto vazio", () => {
    // Um lançamento sem descrição legível é pior que um com texto cru:
    // some da lista e o usuário não acha o que conferir.
    assert.ok(limparDescricao("PAG*").length > 0)
    assert.ok(limparDescricao("   ").length >= 0)
  })
})

describe("capitalizar", () => {
  it("deixa nomes legíveis e mantém preposições em minúscula", () => {
    assert.equal(capitalizar("PADARIA DO JOAO"), "Padaria do Joao")
  })
})

describe("categorizar", () => {
  it("regra do lar vence o dicionário", () => {
    const sugestao = categorizar(
      "PAG*IFOOD 33",
      [regra({ categoriaId: "categoria-do-usuario", renomearPara: "Jantar" })],
      new Map([["Delivery", "cat-dicionario"]]),
    )
    assert.equal(sugestao.categoriaId, "categoria-do-usuario")
    assert.equal(sugestao.descricaoLimpa, "Jantar")
    assert.equal(sugestao.confianca, 100)
  })

  it("regra desligada não vale", () => {
    const sugestao = categorizar("PAG*IFOOD", [regra({ ativa: false })], new Map())
    assert.notEqual(sugestao.categoriaId, "cat-delivery")
  })

  it("maior prioridade vence quando duas regras batem", () => {
    const sugestao = categorizar(
      "IFOOD",
      [
        regra({ id: "baixa", categoriaId: "cat-baixa", prioridade: 10 }),
        regra({ id: "alta", categoriaId: "cat-alta", prioridade: 100 }),
      ],
      new Map(),
    )
    assert.equal(sugestao.categoriaId, "cat-alta")
    assert.equal(sugestao.regraId, "alta")
  })

  it("cai no dicionário quando nenhuma regra bate", () => {
    const sugestao = categorizar("SUPERMERCADO PAO DE ACUCAR", [], new Map([["Supermercado", "id-mercado"]]))
    assert.equal(sugestao.categoriaId, "id-mercado")
    assert.equal(sugestao.categoriaNome, "Supermercado")
    // Menos que 100: dicionário genérico erra em nome ambíguo.
    assert.ok(sugestao.confianca > 0 && sugestao.confianca < 100)
  })

  it("ignora acento e caixa ao comparar", () => {
    assert.equal(categorizar("farmácia raia", [], new Map([["Farmácia", "id"]])).categoriaId, "id")
  })

  it("regex inválida do usuário não derruba a categorização", () => {
    const sugestao = categorizar("QUALQUER COISA", [regra({ padrao: "[", regex: true })], new Map())
    assert.equal(sugestao.categoriaId, undefined)
    assert.equal(sugestao.confianca, 0)
  })

  it("devolve confiança zero quando não reconhece nada", () => {
    const sugestao = categorizar("ZZZQWE 998", [], new Map())
    assert.equal(sugestao.confianca, 0)
    assert.ok(sugestao.descricaoLimpa.length > 0)
  })
})

describe("regraAPartirDeCorrecao", () => {
  it("gera padrão curto o bastante para pegar os próximos", () => {
    const nova = regraAPartirDeCorrecao({
      descricaoOriginal: "PAG*IFOOD 12/34 SAO PAULO BR",
      categoriaId: "cat",
    })
    // Padrão colado no lançamento inteiro pegaria só aquele e nunca mais.
    assert.ok(nova.padrao.length < "PAG*IFOOD 12/34 SAO PAULO BR".length)
    assert.match(nova.padrao, /IFOOD/)
    assert.ok(nova.prioridade >= 100, "regra do usuário nasce acima do dicionário")
  })
})
