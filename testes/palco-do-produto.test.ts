import test from "node:test"
import assert from "node:assert/strict"
import { progressoDoPalco, entradaDoPalco, telaDoProgresso, centroDaTela, ajusteDoPalco, FATIA_DE_ENTRADA } from "../src/lib/palco-do-produto"

test("o progresso e zero enquanto o trilho nao chega na dobra", () => {
  assert.equal(progressoDoPalco(500, 2000, 600), 0)
})

test("o progresso vai de zero a um ao longo do curso", () => {
  assert.equal(progressoDoPalco(0, 2000, 600), 0)
  assert.equal(progressoDoPalco(-700, 2000, 600), 0.5)
  assert.equal(progressoDoPalco(-1400, 2000, 600), 1)
})

test("o progresso nao passa de um depois que o trilho acaba", () => {
  assert.equal(progressoDoPalco(-9000, 2000, 600), 1)
})

test("trilho menor que a janela nao trava a pagina em progresso quebrado", () => {
  assert.equal(progressoDoPalco(-50, 400, 600), 0)
})

test("a entrada termina antes das telas comecarem", () => {
  assert.equal(entradaDoPalco(0), 0)
  assert.equal(entradaDoPalco(FATIA_DE_ENTRADA), 1)
  assert.equal(entradaDoPalco(0.9), 1)
})

test("cada tela fica com uma fatia igual do que sobra do trilho", () => {
  assert.equal(telaDoProgresso(0, 3), 0)
  assert.equal(telaDoProgresso(FATIA_DE_ENTRADA, 3), 0)
  assert.equal(telaDoProgresso(0.5, 3), 1)
  assert.equal(telaDoProgresso(0.9, 3), 2)
})

test("no fim do trilho a ultima tela continua sendo a ultima", () => {
  assert.equal(telaDoProgresso(1, 3), 2)
})

test("o centro de cada tela cai dentro da fatia dela", () => {
  for (const indice of [0, 1, 2]) {
    assert.equal(telaDoProgresso(centroDaTela(indice, 3), 3), indice)
  }
})

test("janela alta nao aumenta o palco alem do tamanho de projeto", () => {
  assert.equal(ajusteDoPalco(1400), 1)
})

test("janela baixa encolhe o palco em vez de cortar o aparelho", () => {
  assert.ok(ajusteDoPalco(700) < 1)
  assert.ok(ajusteDoPalco(700) > ajusteDoPalco(600))
})

test("o palco nunca encolhe a ponto de ficar ilegivel", () => {
  assert.equal(ajusteDoPalco(200), 0.55)
})
