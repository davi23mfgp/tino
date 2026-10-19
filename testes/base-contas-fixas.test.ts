import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { BASE_CONTAS_FIXAS } from "@/lib/base-contas-fixas"
import { CATEGORIAS_PADRAO } from "@/lib/semear"

describe("lista pronta de Contas fixas", () => {
  it("nenhum item traz valor: o valor é da pessoa (regra 3)", () => {
    for (const item of BASE_CONTAS_FIXAS) {
      assert.equal(Object.keys(item).some((chave) => /centavos|valor/i.test(chave)), false, item.id)
    }
  })

  it("toda categoria existe entre as que o app cria, senão a conta entraria sem categoria", () => {
    const nomes = new Set(CATEGORIAS_PADRAO.map((categoria) => categoria.nome))
    for (const item of BASE_CONTAS_FIXAS) assert.ok(nomes.has(item.categoria), `${item.id}: ${item.categoria}`)
  })

  it("os ids não se repetem", () => {
    assert.equal(new Set(BASE_CONTAS_FIXAS.map((item) => item.id)).size, BASE_CONTAS_FIXAS.length)
  })
})
