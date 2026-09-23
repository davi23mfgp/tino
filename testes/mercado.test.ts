import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { lerGrafico, resultadoNoPeriodoCentavos, serieDaCarteira, simboloNoYahoo } from "../src/lib/mercado"

// Forma da resposta do gráfico do Yahoo, reduzida ao que o leitor usa.
const resposta = (close: (number | null)[], meta: Record<string, unknown> = {}) => ({
  chart: { result: [{ meta: { currency: "BRL", shortName: "PETROBRAS PN", regularMarketPrice: 40, chartPreviousClose: 38, regularMarketTime: 1_790_000_000, ...meta }, timestamp: close.map((_, i) => i), indicators: { quote: [{ close }] } }], error: null },
})

describe("símbolo no Yahoo", () => {
  it("código da B3 ganha .SA, fracionário perde o F", () => {
    assert.equal(simboloNoYahoo("petr4"), "PETR4.SA")
    assert.equal(simboloNoYahoo("HGLG11"), "HGLG11.SA")
    assert.equal(simboloNoYahoo("BOVA11F"), "BOVA11.SA")
  })

  it("bolsa americana, índice e moeda passam como vieram", () => {
    assert.equal(simboloNoYahoo("AAPL"), "AAPL")
    assert.equal(simboloNoYahoo("^BVSP"), "^BVSP")
    assert.equal(simboloNoYahoo("USDBRL=X"), "USDBRL=X")
  })
})

describe("leitura do gráfico", () => {
  it("no mês, a variação vai do primeiro fechamento ao preço atual e ignora buracos", () => {
    const serie = lerGrafico("PETR4", resposta([32, null, 36, 40]), "1mo")!
    assert.deepEqual(serie.serie, [32, 36, 40])
    assert.equal(serie.precoInicial, 32)
    assert.equal(serie.variacaoPercentual, 25)
    assert.equal(serie.nome, "PETROBRAS PN")
  })

  it("no dia, a base é o fechamento anterior, não a abertura", () => {
    const serie = lerGrafico("PETR4", resposta([39, 39.5, 40]), "1d")!
    assert.equal(serie.precoInicial, 38)
    assert.ok(Math.abs(serie.variacaoPercentual - (2 / 38) * 100) < 1e-9)
  })

  it("preço atual entra no fim da série quando o último fechamento ainda não é ele", () => {
    assert.deepEqual(lerGrafico("PETR4", resposta([38, 39]), "1mo")!.serie, [38, 39, 40])
  })

  it("resposta sem resultado não vira preço", () => {
    assert.equal(lerGrafico("XXXX3", { chart: { result: [], error: { code: "Not Found" } } }, "1mo"), null)
    assert.equal(lerGrafico("XXXX3", resposta([], { regularMarketPrice: undefined }), "1mo"), null)
  })
})

describe("resultado no período", () => {
  it("com quantidade: cotas × diferença de preço × câmbio", () => {
    // 2 ações de US$ 200 para US$ 209,16 com dólar a 5 → 2 × 9,16 × 5 = R$ 91,60.
    assert.equal(resultadoNoPeriodoCentavos({ valorCentavos: 0, quantidadeMilesimos: 2000, preco: 209.16, precoInicial: 200, cambio: 5 }), 9160)
  })

  it("sem quantidade: a variação aplicada ao valor da posição", () => {
    // Valor de hoje R$ 1.250 depois de subir 25% → começou em R$ 1.000.
    assert.equal(resultadoNoPeriodoCentavos({ valorCentavos: 125_000, quantidadeMilesimos: null, preco: 50, precoInicial: 40, cambio: 1 }), 25_000)
  })

  it("sem preço de base não inventa resultado", () => {
    assert.equal(resultadoNoPeriodoCentavos({ valorCentavos: 100_000, quantidadeMilesimos: 1000, preco: 10, precoInicial: 0, cambio: 1 }), 0)
  })
})

describe("linha da carteira", () => {
  it("soma cotados ponto a ponto e renda fixa constante", () => {
    const linha = serieDaCarteira(
      [
        { valorCentavos: 0, quantidadeMilesimos: 2000, serie: [10, 11, 12], preco: 12, cambio: 1 },
        { valorCentavos: 50_000, quantidadeMilesimos: null, serie: null, preco: null, cambio: 1 },
      ],
      3,
    )
    // 2 × 10 = R$ 20 + R$ 500; 2 × 11 + 500; 2 × 12 + 500.
    assert.deepEqual(linha, [52_000, 52_200, 52_400])
  })

  it("séries de tamanhos diferentes são lidas pela posição relativa", () => {
    const linha = serieDaCarteira(
      [
        { valorCentavos: 0, quantidadeMilesimos: 1000, serie: [10, 20], preco: 20, cambio: 1 },
        { valorCentavos: 0, quantidadeMilesimos: 1000, serie: [1, 2, 3, 4, 5], preco: 5, cambio: 1 },
      ],
      2,
    )
    assert.deepEqual(linha, [1_100, 2_500])
  })

  it("sem quantidade, escala o valor de hoje pelo preço de cada ponto", () => {
    assert.deepEqual(serieDaCarteira([{ valorCentavos: 10_000, quantidadeMilesimos: null, serie: [50, 100], preco: 100, cambio: 1 }], 2), [5_000, 10_000])
  })
})
