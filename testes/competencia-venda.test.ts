import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { competenciaDaVenda } from "@/lib/loja/contas"

describe("mês da venda no MEI", () => {
  it("é o mês no fuso do lar, não no relógio do servidor", () => {
    // 31/08 às 22h em Brasília já é 01/09 em UTC
    assert.equal(competenciaDaVenda(new Date("2026-09-01T01:00:00Z"), "America/Sao_Paulo"), "2026-08")
    assert.equal(competenciaDaVenda(new Date("2026-09-01T03:30:00Z"), "America/Sao_Paulo"), "2026-09")
  })
})
