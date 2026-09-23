import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { dataAteQuandoAguenta, planoDeJuntar } from "../src/lib/tino/reserva"

describe("até quando a reserva aguenta", () => {
  it("anda meses no calendário e a fração em dias do mês seguinte", () => {
    // 1,2 mês a partir de 23/09: 23/10 mais 20% dos 31 dias até 23/11 = 6 dias.
    assert.equal(dataAteQuandoAguenta("2026-09-23", 12_000, 10_000), "2026-10-29")
  })

  it("mês inteiro cai no mesmo dia do mês seguinte", () => {
    assert.equal(dataAteQuandoAguenta("2026-09-23", 60_000, 10_000), "2027-03-23")
  })

  it("dia 31 mais um mês vira o último dia do mês curto", () => {
    assert.equal(dataAteQuandoAguenta("2026-01-31", 10_000, 10_000), "2026-02-28")
  })

  it("não conta em dias corridos: meio mês depois de fevereiro é metade de março", () => {
    // 45 dias corridos a partir de 31/01 dariam 17/03; no calendário é 28/02
    // mais metade dos 31 dias até 31/03.
    assert.equal(dataAteQuandoAguenta("2026-01-31", 15_000, 10_000), "2026-03-15")
  })

  it("sem reserva, aguenta até hoje", () => {
    assert.equal(dataAteQuandoAguenta("2026-09-23", 0, 10_000), "2026-09-23")
  })

  it("sem custo essencial não inventa data", () => {
    assert.equal(dataAteQuandoAguenta("2026-09-23", 50_000, 0), null)
  })
})

describe("formas de juntar", () => {
  const falta = 2_736_302

  it("por mês: arredonda os meses para cima", () => {
    assert.deepEqual(planoDeJuntar(falta, { forma: "POR_MES", porMesCentavos: 40_000 }), { porMesCentavos: 40_000, meses: 69, restanteCentavos: falta })
  })

  it("até uma data: arredonda o valor para cima e fecha o alvo", () => {
    const plano = planoDeJuntar(falta, { forma: "ATE_DATA", meses: 24 })
    assert.equal(plano.porMesCentavos, 114_013)
    assert.ok(plano.porMesCentavos * 24 >= falta)
  })

  it("percentual da renda em bps", () => {
    assert.equal(planoDeJuntar(falta, { forma: "PERCENTUAL", bps: 1000, rendaMensalCentavos: 800_000 }).porMesCentavos, 80_000)
  })

  it("sobra negativa não vira plano", () => {
    assert.deepEqual(planoDeJuntar(falta, { forma: "SOBRA", sobraMensalCentavos: -5_000 }), { porMesCentavos: 0, meses: null, restanteCentavos: falta })
  })

  it("de uma vez: diz o que ainda falta", () => {
    assert.deepEqual(planoDeJuntar(100_000, { forma: "DE_UMA_VEZ", valorCentavos: 30_000 }), { porMesCentavos: 0, meses: null, restanteCentavos: 70_000 })
    assert.equal(planoDeJuntar(100_000, { forma: "DE_UMA_VEZ", valorCentavos: 150_000 }).meses, 0)
  })

  it("alvo já alcançado não pede nada", () => {
    assert.deepEqual(planoDeJuntar(0, { forma: "POR_MES", porMesCentavos: 40_000 }), { porMesCentavos: 0, meses: 0, restanteCentavos: 0 })
  })
})
