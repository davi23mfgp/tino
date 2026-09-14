import assert from "node:assert/strict"
import { it } from "node:test"
import { domingoDa, nomeDoDia, semanaDe, somarDias } from "../src/lib/semana"

it("a semana vai de domingo a sábado e tem sempre sete dias", () => {
  const semana = semanaDe("2026-09-16")
  assert.equal(semana.length, 7)
  assert.equal(semana[0], "2026-09-13")
  assert.equal(semana[6], "2026-09-19")
  assert.equal(nomeDoDia(semana[0]), "dom")
  assert.equal(nomeDoDia(semana[6]), "sáb")
})

it("domingo é o começo da própria semana, não da anterior", () => {
  assert.equal(domingoDa("2026-09-13"), "2026-09-13")
})

it("semana que cruza a virada do mês não perde dia", () => {
  const semana = semanaDe("2026-10-01")
  assert.deepEqual(semana, ["2026-09-27", "2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02", "2026-10-03"])
})

it("semana que cruza a virada do ano também fecha", () => {
  const semana = semanaDe("2027-01-01")
  assert.equal(semana.length, 7)
  assert.ok(semana.includes("2026-12-31"))
  assert.ok(semana.includes("2027-01-01"))
})

it("fevereiro bissexto não some", () => {
  assert.equal(somarDias("2028-02-28", 1), "2028-02-29")
  assert.equal(somarDias("2028-02-29", 1), "2028-03-01")
})

it("andar sete dias para trás e para frente volta ao mesmo lugar", () => {
  assert.equal(somarDias(somarDias("2026-09-14", -7), 7), "2026-09-14")
})
