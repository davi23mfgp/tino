import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { competenciaDosLimites } from "@/lib/orcamento-herdado"

describe("limites do orçamento passam de um mês para o outro", () => {
  it("mês com limite próprio usa os dele", () => {
    assert.equal(competenciaDosLimites(["2026-08", "2026-10"], "2026-10"), "2026-10")
  })
  it("mês sem limite usa o último mês anterior que tinha", () => {
    assert.equal(competenciaDosLimites(["2026-08", "2026-09"], "2026-11"), "2026-09")
  })
  it("não herda de mês futuro: setembro não muda por causa de dezembro", () => {
    assert.equal(competenciaDosLimites(["2026-12"], "2026-09"), null)
  })
  it("sem nenhum limite, não inventa", () => {
    assert.equal(competenciaDosLimites([], "2026-10"), null)
  })
})
