import { test } from "node:test"
import assert from "node:assert/strict"

import { ehDiaDoResumo, textoDoResumo } from "../src/lib/tino/resumo-semana"

const base = { gastoCentavos: 0, gastoSemanaAnteriorCentavos: 0, categorias: [], vencimentos: [], esperandoConferir: 0 }

test("semana sem nada não vira resumo de zero", () => {
  assert.equal(textoDoResumo(base), null)
})

test("gasto vem com a semana anterior como referência", () => {
  const texto = textoDoResumo({ ...base, gastoCentavos: 50000, gastoSemanaAnteriorCentavos: 42000, categorias: [{ nome: "Supermercado", centavos: 30000 }] })!
  assert.match(texto, /Você gastou R\$\s?500,00, R\$\s?80,00 a mais que na semana anterior\./)
  assert.match(texto, /Para onde foi: Supermercado R\$\s?300,00\./)
})

test("sem semana anterior, o gasto vai sem comparação inventada", () => {
  const texto = textoDoResumo({ ...base, gastoCentavos: 50000 })!
  assert.doesNotMatch(texto, /semana anterior/)
})

test("só conta a vencer: diz que não há gasto anotado, não que gastou zero", () => {
  const texto = textoDoResumo({ ...base, vencimentos: [{ descricao: "Aluguel", centavos: 150000, dia: "10/11" }], esperandoConferir: 2 })!
  assert.match(texto, /Nenhum gasto anotado nesta semana\./)
  assert.match(texto, /10\/11: Aluguel, R\$\s?1\.500,00/)
  assert.match(texto, /Há 2 compras esperando/)
  assert.doesNotMatch(texto, /Você gastou/)
})

test("o resumo sai no domingo de São Paulo, mesmo já sendo segunda em UTC", () => {
  assert.equal(ehDiaDoResumo(new Date("2026-11-15T23:00:00Z")), true)
  assert.equal(ehDiaDoResumo(new Date("2026-11-16T01:30:00Z")), true)
  assert.equal(ehDiaDoResumo(new Date("2026-11-16T23:00:00Z")), false)
})
