import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { montarFunil, produtoValido } from "../src/lib/funil"

describe("funil próprio", () => {
  it("põe as etapas na ordem e calcula a passagem da anterior", () => {
    const funil = montarFunil({ VISITA: 200, CLIQUE_COMECAR: 50, CADASTRO_INICIADO: 40, CADASTRO_CRIADO: 10 })
    assert.deepEqual(funil.map((linha) => linha.total), [200, 50, 40, 10, 0, 0])
    assert.equal(funil[0].daAnteriorBps, null)
    assert.equal(funil[1].daAnteriorBps, 2500)
    assert.equal(funil[3].daAnteriorBps, 2500)
  })
  it("não divide por zero quando a etapa anterior não teve ninguém", () => {
    const funil = montarFunil({ ASSINATURA_PAGA: 3 })
    assert.equal(funil[5].daAnteriorBps, null)
    assert.equal(funil[5].total, 3)
  })
  it("só aceita os dois produtos", () => {
    assert.equal(produtoValido("mei"), "mei")
    assert.equal(produtoValido("loja"), null)
    assert.equal(produtoValido(undefined), null)
  })
})
