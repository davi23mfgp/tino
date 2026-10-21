import { test } from "node:test"
import assert from "node:assert/strict"

import { movimentosInternos } from "../src/lib/importar/movimento-interno"

const d = (s: string) => new Date(s + "T00:00:00Z")

test("fatura: pagamento da fatura anterior fica fora, compras ficam", () => {
  const r = movimentosInternos([
    { data: d("2026-09-08"), descricao: "PAGAMENTO DEB AUTOMATIC", valorCentavos: 670_082, tipo: "RECEITA" },
    { data: d("2026-08-05"), descricao: "PAGAMENTO ON LINE", valorCentavos: 470_735, tipo: "RECEITA" },
    { data: d("2026-09-10"), descricao: "COMPRE MIX", valorCentavos: 31_447, tipo: "DESPESA" },
    { data: d("2026-09-12"), descricao: "CANCELAMENTO PARCIAL DE COMPRA", valorCentavos: 39_599, tipo: "RECEITA" },
  ], true)
  assert.deepEqual([...r.keys()].sort(), [0, 1])
})

test("extrato: par do Pix no crédito sai inteiro; Pix comum fica", () => {
  const r = movimentosInternos([
    { data: d("2026-06-05"), descricao: "CREDITO LIBERAD PIX 2381", valorCentavos: 127_073, tipo: "RECEITA" },
    { data: d("2026-06-05"), descricao: "PIX CARTAO PJBANK05/06", valorCentavos: 127_073, tipo: "DESPESA" },
    { data: d("2026-06-05"), descricao: "PIX TRANSF MARIA", valorCentavos: 30_000, tipo: "DESPESA" },
    { data: d("2026-06-01"), descricao: "CREDITO LIBERAD PIX 2381", valorCentavos: 17_000, tipo: "RECEITA" },
  ], false)
  assert.deepEqual([...r.keys()].sort(), [0, 1])
  assert.equal(r.get(1)?.acao, "fora")
})

test("extrato: boleto da fatura do Nubank vira transferência, não gasto", () => {
  const r = movimentosInternos([
    { data: d("2026-02-06"), descricao: "PAG BOLETO NU PAGAMENTOS SA", valorCentavos: 135_031, tipo: "DESPESA" },
    { data: d("2026-03-10"), descricao: "PAG BOLETO PJBANK PAGAMENTOS S.A.", valorCentavos: 127_074, tipo: "DESPESA" },
  ], false)
  assert.equal(r.get(0)?.acao, "transferencia")
  assert.equal(r.has(1), false)
})
