import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { arpuCentavos, churnBps, contarPorStatus, mrrCentavos, mrrEmRiscoCentavos } from "@/lib/metricas"
import type { AssinaturaParaMetrica } from "@/lib/metricas"

const mensal = (valorCentavos: number, status: AssinaturaParaMetrica["status"] = "ATIVA"): AssinaturaParaMetrica => ({
  status,
  ciclo: "MENSAL",
  valorCentavos,
})

const anual = (valorCentavos: number, status: AssinaturaParaMetrica["status"] = "ATIVA"): AssinaturaParaMetrica => ({
  status,
  ciclo: "ANUAL",
  valorCentavos,
})

describe("mrrCentavos", () => {
  it("soma as mensais pelo valor cheio", () => {
    assert.equal(mrrCentavos([mensal(1990), mensal(4990)]), 6980)
  })

  it("traz a anual pelo duodécimo, não pelo valor cheio", () => {
    // R$ 199,00 por ano são R$ 16,58 por mês. Contar os R$ 199 no mês da
    // contratação faria o MRR pular e despencar sem nada ter acontecido.
    assert.equal(mrrCentavos([anual(19900)]), 1658)
  })

  it("conta só assinatura ativa", () => {
    const base = [
      mensal(1990, "ATIVA"),
      mensal(1990, "TESTE"),
      mensal(1990, "PENDENTE"),
      mensal(1990, "INADIMPLENTE"),
      mensal(1990, "CANCELADA"),
    ]
    assert.equal(mrrCentavos(base), 1990)
  })

  it("devolve zero sem assinatura nenhuma", () => {
    assert.equal(mrrCentavos([]), 0)
  })
})

describe("mrrEmRiscoCentavos", () => {
  it("mede só a inadimplência, e não entra no MRR", () => {
    const base = [mensal(1990, "ATIVA"), mensal(4990, "INADIMPLENTE")]
    assert.equal(mrrCentavos(base), 1990)
    assert.equal(mrrEmRiscoCentavos(base), 4990)
  })
})

describe("churnBps", () => {
  it("calcula sobre a base do início do período", () => {
    // 3 de 100 canceladas = 3,00% = 300 bps.
    assert.equal(churnBps(3, 100), 300)
  })

  it("devolve zero quando não havia base, em vez de dividir por zero", () => {
    assert.equal(churnBps(0, 0), 0)
    assert.equal(churnBps(5, 0), 0)
  })
})

describe("arpuCentavos", () => {
  it("divide o MRR pelas ativas", () => {
    assert.equal(arpuCentavos([mensal(1990), mensal(4990)]), 3490)
  })

  it("devolve zero sem nenhuma ativa", () => {
    assert.equal(arpuCentavos([mensal(1990, "CANCELADA")]), 0)
  })
})

describe("contarPorStatus", () => {
  it("conta cada estado e mantém zero nos que não apareceram", () => {
    const contagem = contarPorStatus([{ status: "ATIVA" }, { status: "ATIVA" }, { status: "CANCELADA" }])
    assert.equal(contagem.ATIVA, 2)
    assert.equal(contagem.CANCELADA, 1)
    assert.equal(contagem.TESTE, 0)
    assert.equal(contagem.INADIMPLENTE, 0)
    assert.equal(contagem.PENDENTE, 0)
  })
})
