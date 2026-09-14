import assert from "node:assert/strict"
import { it } from "node:test"
import { orcamentoInicialCentavos } from "../src/lib/orcamento-cartao"

const base = { possuiPlanos: false, mesCorrente: true, orcamentoMensalCentavos: 120_000 }

it("plano salvo do mês sempre vence", () => {
  assert.equal(orcamentoInicialCentavos({ ...base, planoDoMesCentavos: 50_000 }), 50_000)
  assert.equal(orcamentoInicialCentavos({ ...base, planoDoMesCentavos: 0, possuiPlanos: true }), 0)
})

it("o valor legado só aparece no mês corrente e só antes do primeiro plano", () => {
  assert.equal(orcamentoInicialCentavos(base), 120_000)
  assert.equal(orcamentoInicialCentavos({ ...base, mesCorrente: false }), 0)
  assert.equal(orcamentoInicialCentavos({ ...base, possuiPlanos: true }), 0)
})

it("mês futuro sem plano abre vazio — o achado 5 do relatório", () => {
  assert.equal(orcamentoInicialCentavos({ ...base, mesCorrente: false, possuiPlanos: true }), 0)
})

it("sem valor legado, zero — e não NaN", () => {
  assert.equal(orcamentoInicialCentavos({ ...base, orcamentoMensalCentavos: null }), 0)
  assert.equal(orcamentoInicialCentavos({ ...base, orcamentoMensalCentavos: undefined }), 0)
})
