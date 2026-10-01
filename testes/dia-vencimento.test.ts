import assert from "node:assert/strict"
import { test } from "node:test"
import { lerDiaVencimento } from "@/lib/dia-vencimento"

test("cadastro aceita Dia 10 e todos os dias mensais, inclusive 29 a 31", () => {
  for (let dia = 1; dia <= 31; dia++) assert.equal(lerDiaVencimento(String(dia)), dia)
})

test("dia não informado permanece opcional", () => {
  assert.equal(lerDiaVencimento(""), undefined)
})

test("cadastro recusa data completa e dias fora do intervalo", () => {
  for (const valor of ["2026-10-10", "0", "32", "-1", "1.5", "abc"]) {
    assert.throws(() => lerDiaVencimento(valor), /entre 1 e 31/)
  }
})
