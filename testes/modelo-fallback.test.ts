import test from "node:test"
import assert from "node:assert/strict"

import { responderPorRegras } from "../src/lib/tino/chat"
import { modeloDisponivel } from "../src/lib/tino/modelo"
import type { Panorama } from "../src/lib/tino/panorama"

/**
 * Assistente sem chave de modelo.
 *
 * Regra do produto: o motor local responde primeiro e continua respondendo
 * mesmo sem Groq e sem Anthropic. Estes testes provam o portão
 * (`modeloDisponivel`) e provam que a resposta local sai sem rede — nenhuma
 * chamada externa acontece aqui.
 */

function semChaves<T>(execucao: () => T): T {
  const groq = process.env.GROQ_API_KEY
  const anthropic = process.env.ANTHROPIC_API_KEY
  delete process.env.GROQ_API_KEY
  delete process.env.ANTHROPIC_API_KEY
  try {
    return execucao()
  } finally {
    if (groq !== undefined) process.env.GROQ_API_KEY = groq
    if (anthropic !== undefined) process.env.ANTHROPIC_API_KEY = anthropic
  }
}

const PANORAMA = {
  competencia: "2026-09",
  saldoTotalCentavos: 1_658_600,
  saldoPorConta: [
    { id: "c1", nome: "Conta corrente", tipo: "CORRENTE", saldoCentavos: 1_258_600, limiteCentavos: null },
    { id: "c2", nome: "Poupança", tipo: "POUPANCA", saldoCentavos: 400_000, limiteCentavos: null },
    { id: "c3", nome: "Cartão Gold", tipo: "CARTAO_CREDITO", saldoCentavos: -128_430, limiteCentavos: 600_000 },
  ],
  mes: {
    receitasCentavos: 860_000,
    despesasCentavos: 274_400,
    sobraCentavos: 585_600,
    despesasPorCategoria: [],
  },
  medias: { despesaCentavos: 300_000 },
} as unknown as Panorama

test("sem chave nenhuma, o modelo externo fica indisponível", () => {
  assert.equal(
    semChaves(() => modeloDisponivel()),
    false,
  )
})

test("qualquer uma das duas chaves liga o modelo externo", () => {
  semChaves(() => {
    process.env.GROQ_API_KEY = "gsk_teste"
    assert.equal(modeloDisponivel(), true)
    delete process.env.GROQ_API_KEY

    process.env.ANTHROPIC_API_KEY = "sk-ant-teste"
    assert.equal(modeloDisponivel(), true)
    delete process.env.ANTHROPIC_API_KEY
  })
})

test("sem chave, a pergunta de saldo é respondida pelo motor local", () => {
  const resposta = semChaves(() => responderPorRegras("quanto eu tenho hoje?", PANORAMA))
  assert.ok(resposta, "o motor local precisa responder sem chave")
  assert.equal(resposta.fonte, "regras")
  assert.match(resposta.texto, /16\.586,00/)
})

test("o saldo local não soma cartão de crédito", () => {
  const resposta = semChaves(() => responderPorRegras("qual meu saldo?", PANORAMA))!
  assert.doesNotMatch(resposta.texto, /Cartão Gold: /)
  assert.match(resposta.texto, /Conta corrente/)
  assert.match(resposta.texto, /Poupança/)
})

test("pergunta fora do repertório devolve null, e aí é a vez do modelo", () => {
  assert.equal(
    semChaves(() => responderPorRegras("me conte uma piada sobre pinguins", PANORAMA)),
    null,
  )
})
