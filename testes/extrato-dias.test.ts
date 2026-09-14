import assert from "node:assert/strict"
import { it } from "node:test"
import { porDia, rotuloDia } from "../src/lib/extrato-dias"

const lancamento = (data: string, tipo: "RECEITA" | "DESPESA" | "TRANSFERENCIA", valorCentavos: number) =>
  ({ data, tipo, valorCentavos })

it("junta o mesmo dia numa lista só e preserva a ordem da API", () => {
  const grupos = porDia([
    lancamento("2026-09-12T00:00:00.000Z", "DESPESA", 1000),
    lancamento("2026-09-12T00:00:00.000Z", "DESPESA", 500),
    lancamento("2026-09-11T00:00:00.000Z", "RECEITA", 900),
  ])
  assert.deepEqual(grupos.map((grupo) => grupo.dia), ["2026-09-12", "2026-09-11"])
  assert.equal(grupos[0].itens.length, 2)
  assert.equal(grupos[0].totalCentavos, -1500)
  assert.equal(grupos[1].totalCentavos, 900)
})

it("transferência aparece na lista mas não mexe no total do dia", () => {
  const [grupo] = porDia([
    lancamento("2026-09-12T00:00:00.000Z", "TRANSFERENCIA", 30000),
    lancamento("2026-09-12T00:00:00.000Z", "DESPESA", 2000),
  ])
  assert.equal(grupo.itens.length, 2)
  assert.equal(grupo.totalCentavos, -2000)
})

it("o mesmo dia separado por outro dia não se funde", () => {
  const grupos = porDia([
    lancamento("2026-09-12T00:00:00.000Z", "DESPESA", 100),
    lancamento("2026-09-11T00:00:00.000Z", "DESPESA", 100),
    lancamento("2026-09-12T00:00:00.000Z", "DESPESA", 100),
  ])
  assert.equal(grupos.length, 3)
})

it("lista vazia não inventa grupo", () => {
  assert.deepEqual(porDia([]), [])
})

it("hoje e ontem ganham nome; o resto vira data curta", () => {
  const hoje = new Date().toISOString().slice(0, 10)
  const ontem = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  assert.equal(rotuloDia(hoje), "Hoje")
  assert.equal(rotuloDia(ontem), "Ontem")
  assert.match(rotuloDia("2026-09-12"), /12/)
})
