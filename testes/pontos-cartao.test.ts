import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { calcularPontos, configuracaoPontos, type ConfiguracaoPontos } from "../src/lib/pontos-cartao"
const regra: ConfiguracaoPontos = { programa: "Livelo", unidade: "pontos", moeda: "real", taxaMilesimos: 2200, saldoAtual: 18000, cambioMilesimos: null }
describe("pontos e milhas por cartão", () => {
  it("desconta créditos e arredonda para baixo sem alterar o saldo informado", () => {
    assert.equal(calcularPontos(100000, 10000, regra, null), 1980)
    assert.equal(calcularPontos(101, 0, regra, null), 2)
    assert.equal(regra.saldoAtual, 18000)
    assert.equal(calcularPontos(100, 200, regra, null), 0)
  })
  it("converte gastos para dólar e exige câmbio válido", () => {
    const dolar = { ...regra, moeda: "dolar" as const }
    assert.equal(calcularPontos(100000, 10000, dolar, 5), 396)
    for (const cambio of [null, 0, -1, NaN, Infinity]) assert.equal(calcularPontos(100000, 0, dolar, cambio), null)
  })
  it("valida limites, inteiros, programa e moeda da configuração persistida", () => {
    assert.equal(configuracaoPontos.safeParse(regra).success, true)
    for (const invalida of [{ ...regra, taxaMilesimos: -1 }, { ...regra, taxaMilesimos: Infinity }, { ...regra, saldoAtual: 1.5 }, { ...regra, saldoAtual: 2147483648 }, { ...regra, moeda: "euro" }, { ...regra, programa: "" }, { ...regra, cambioMilesimos: 0 }]) assert.equal(configuracaoPontos.safeParse(invalida).success, false)
  })
})
