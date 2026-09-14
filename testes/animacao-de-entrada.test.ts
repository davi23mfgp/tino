import test from "node:test"
import assert from "node:assert/strict"
import { atrasoDaPalavra, suavizar, valorDaContagem, duracaoDaContagem } from "../src/lib/animacao-de-entrada"

test("a primeira palavra chega na hora e as seguintes escalonam", () => {
  assert.equal(atrasoDaPalavra(0), 0)
  assert.equal(atrasoDaPalavra(2), 90)
})

test("titulo longo nao arrasta a ultima palavra para fora da tela", () => {
  assert.equal(atrasoDaPalavra(40), 520)
})

test("a suavizacao comeca em zero, termina em um e nunca volta", () => {
  assert.equal(suavizar(0), 0)
  assert.equal(suavizar(1), 1)
  let anterior = -1
  for (let i = 0; i <= 10; i++) {
    const agora = suavizar(i / 10)
    assert.ok(agora >= anterior)
    anterior = agora
  }
})

test("a suavizacao aguenta valor fora da faixa", () => {
  assert.equal(suavizar(-3), 0)
  assert.equal(suavizar(9), 1)
})

test("o contador fecha no alvo exato", () => {
  assert.equal(valorDaContagem(860000, 1), 860000)
  assert.equal(valorDaContagem(860000, 2), 860000)
})

test("o contador comeca do zero e sobe", () => {
  assert.equal(valorDaContagem(860000, 0), 0)
  assert.ok(valorDaContagem(860000, 0.5) > 0)
  assert.ok(valorDaContagem(860000, 0.5) < 860000)
})

test("o contador nunca passa do alvo no meio do caminho", () => {
  for (let i = 0; i <= 20; i++) {
    assert.ok(valorDaContagem(12345, i / 20) <= 12345)
  }
})

test("numero maior conta por mais tempo, ate um teto", () => {
  assert.ok(duracaoDaContagem(99) < duracaoDaContagem(999999))
  assert.ok(duracaoDaContagem(99999999999) <= 1100)
})
