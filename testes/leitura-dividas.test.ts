import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  comprometimentoBps,
  faixaComprometimento,
  jurosEvitadosPorCemReais,
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

describe("juros evitados por R$ 100", () => {
  it("12,90% ao mês sobre R$ 100 são R$ 12,90 no mês seguinte", () => {
    assert.equal(jurosEvitadosPorCemReais(1290), 1290)
    assert.equal(jurosEvitadosPorCemReais(0), 0)
  })
})
