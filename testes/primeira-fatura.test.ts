import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { primeiraFaturaDaCompra } from "@/lib/competencia-cartao"

const platinum = { tipo: "CARTAO_CREDITO", diaFechamento: 28, diaVencimento: 6 }
const dia = (iso: string) => new Date(`${iso}T12:00:00Z`)

describe("primeira parcela da compra parcelada", () => {
  it("antes do fechamento cai na fatura que vence no mês seguinte", () => {
    assert.equal(primeiraFaturaDaCompra(dia("2026-10-19"), platinum), "2026-11")
  })
  it("depois do fechamento pula uma fatura, como a compra à vista", () => {
    assert.equal(primeiraFaturaDaCompra(dia("2026-10-29"), platinum), "2026-12")
  })
  it("o mês informado à mão vale quando a pessoa diz que caiu em outra fatura", () => {
    assert.equal(primeiraFaturaDaCompra(dia("2026-10-19"), platinum, "2026-10"), "2026-10")
  })
  it("cartão sem fechamento cadastrado usa o mês da compra, sem chutar", () => {
    assert.equal(primeiraFaturaDaCompra(dia("2026-10-19"), { tipo: "CARTAO_CREDITO" }), "2026-10")
  })
})
