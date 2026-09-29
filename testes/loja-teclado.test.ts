import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { digitar, TETO_DO_VISOR, type Tecla } from "@/lib/loja/teclado"

const digitarTudo = (teclas: Tecla[]) => teclas.reduce((atual, tecla) => digitar(atual, tecla), 0)

describe("teclado do Balcão", () => {
  it("cada dígito entra pela direita, nos centavos, como na maquininha", () => {
    assert.equal(digitarTudo(["3", "5"]), 35) // R$ 0,35
    assert.equal(digitarTudo(["3", "5", "00"]), 3500) // R$ 35,00
    assert.equal(digitarTudo(["1", "2", "3", "4", "5"]), 12345) // R$ 123,45
  })

  it("apagar tira o último dígito, e em zero continua zero", () => {
    assert.equal(digitarTudo(["3", "5", "00", "apagar"]), 350)
    assert.equal(digitar(0, "apagar"), 0)
  })

  it("zero à esquerda não muda o valor", () => {
    assert.equal(digitarTudo(["0", "0", "7"]), 7)
  })

  it("não passa do teto: o dígito a mais é ignorado", () => {
    assert.equal(digitar(TETO_DO_VISOR, "9"), TETO_DO_VISOR)
    assert.equal(digitar(1_000_000, "00"), 1_000_000)
    assert.ok(Number.isInteger(digitarTudo(["9", "9", "9", "9", "9", "9", "9", "9", "9", "9"])))
  })
})
