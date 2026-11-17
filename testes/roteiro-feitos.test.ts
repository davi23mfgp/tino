import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { feitosDoRoteiro } from "../src/lib/roteiro-feitos"

const vazio = { contas: [{ tipo: "CORRENTE", instituicao: null }, { tipo: "DINHEIRO", instituicao: null }], rendasFixas: 0, rendaDeclaradaCentavos: 0, contasFixas: 0, limitesDoMes: 0, lancamentos: 0 }

describe("o que já foi feito no Montar o seu Tino", () => {
  it("conta nova não tem nenhum passo feito, mesmo com as contas que o cadastro cria", () => {
    assert.deepEqual(feitosDoRoteiro(vazio), [false, false, false, false, false])
  })
  it("cartão ou conta com banco fecha o passo 1; renda declarada fecha o 2", () => {
    assert.deepEqual(feitosDoRoteiro({ ...vazio, contas: [{ tipo: "CARTAO_CREDITO", instituicao: null }], rendaDeclaradaCentavos: 420000 }), [true, true, false, false, false])
    assert.equal(feitosDoRoteiro({ ...vazio, contas: [{ tipo: "CORRENTE", instituicao: "Nubank" }] })[0], true)
  })
  it("cada passo depende só do seu dado", () => {
    assert.deepEqual(feitosDoRoteiro({ ...vazio, contasFixas: 2, lancamentos: 1 }), [false, false, true, false, true])
  })
})
