import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  comprometimentoBps,
  faixaComprometimento,
  composicaoPorPeso,
  pesoDoJuro,
} from "@/lib/tino/leitura-dividas"

describe("peso do juro", () => {
  it("separa caro, médio, leve e sem juro nas fronteiras", () => {
    assert.equal(pesoDoJuro(0), "sem-juro")
    assert.equal(pesoDoJuro(199), "leve")
    assert.equal(pesoDoJuro(200), "medio")
    assert.equal(pesoDoJuro(499), "medio")
    assert.equal(pesoDoJuro(500), "caro")
    assert.equal(pesoDoJuro(1290), "caro")
  })
})

describe("comprometimento da renda", () => {
  it("sem renda conhecida não inventa percentual", () => {
    assert.equal(comprometimentoBps(185_000, 0), null)
  })

  it("parcelas sobre renda em bps, com a faixa de referência", () => {
    assert.equal(comprometimentoBps(185_000, 600_000), 3083)
    assert.equal(faixaComprometimento(2000), "BOM")
    assert.equal(faixaComprometimento(3000), "ATENCAO")
    assert.equal(faixaComprometimento(3083), "CRITICO")
  })
})

describe("composição por peso", () => {
  it("as partes da legenda somam exatamente 100%", () => {
    // Três terços: arredondando cada um, a legenda diria 33+33+33 = 99%.
    const partes = composicaoPorPeso([
      { saldoDevedorCentavos: 100_000, jurosMensalBps: 1290 },
      { saldoDevedorCentavos: 100_000, jurosMensalBps: 349 },
      { saldoDevedorCentavos: 100_000, jurosMensalBps: 139 },
    ])
    assert.deepEqual(partes.map((parte) => parte.peso), ["caro", "medio", "leve"])
    assert.equal(partes.reduce((soma, parte) => soma + parte.percentual, 0), 100)
  })

  it("junta dívidas da mesma faixa e omite faixa vazia", () => {
    assert.deepEqual(
      composicaoPorPeso([
        { saldoDevedorCentavos: 384_000, jurosMensalBps: 1290 },
        { saldoDevedorCentavos: 116_000, jurosMensalBps: 800 },
        { saldoDevedorCentavos: 500_000, jurosMensalBps: 0 },
      ]),
      [
        { peso: "caro", centavos: 500_000, percentual: 50 },
        { peso: "sem-juro", centavos: 500_000, percentual: 50 },
      ],
    )
  })

  it("sem saldo não há composição", () => {
    assert.deepEqual(composicaoPorPeso([]), [])
  })
})
