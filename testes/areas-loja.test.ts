import assert from "node:assert/strict"
import { test } from "node:test"

import { AREAS, areaPorId, escolhaValida, negocioAtivo, oQueVem, rotuloDaArea } from "../src/lib/loja/areas"

test("as 10 áreas do plano, sem repetir", () => {
  assert.equal(AREAS.length, 10)
  assert.equal(new Set(AREAS.map((area) => area.id)).size, 10)
  assert.equal(AREAS[0].id, "assistencia")
})

test("escolha só vale com área e subárea da lista", () => {
  assert.equal(escolhaValida("assistencia", "Celular"), true)
  assert.equal(escolhaValida("assistencia", "Outro"), true)
  assert.equal(escolhaValida("assistencia", "Cabeleireiro"), false)
  assert.equal(escolhaValida("assistencia", null), false)
  assert.equal(escolhaValida("inventada", "Celular"), false)
  assert.equal(escolhaValida("outra", "Fotografia de casamento"), true)
  assert.equal(escolhaValida("outra", null), true)
})

test("o que vem pronto só lista o que o Tino já tem para o tipo da área", () => {
  const comercio = oQueVem("mercadinho").map((item) => item.texto).join(" | ")
  assert.doesNotMatch(comercio, /Ordem de serviço|Orçamento|Agenda/)
  assert.match(comercio, /Prateleira/)
  const servico = oQueVem("obras").map((item) => item.texto).join(" | ")
  assert.match(servico, /Ordem de serviço/)
  assert.doesNotMatch(servico, /Prateleira|Fiado/)
  // Só a área que vende e presta serviço fala em separar as duas no DAS.
  assert.match(oQueVem("assistencia").at(-1)!.texto, /separando produto/)
  assert.doesNotMatch(oQueVem("obras").at(-1)!.texto, /separando/)
  assert.deepEqual(oQueVem("inventada"), [])
})

test("rótulo do negócio na lista", () => {
  assert.equal(rotuloDaArea("assistencia", "Celular"), "Assistência técnica · Celular")
  assert.equal(rotuloDaArea("assistencia", "Outro"), "Assistência técnica")
  assert.equal(rotuloDaArea("outra", "Fotografia"), "Fotografia")
  assert.equal(rotuloDaArea(null, null), null)
  assert.equal(areaPorId("beleza")?.curto, "Beleza")
})

test("negócio ativo: o escolhido, se for do lar; senão o mais antigo", () => {
  const lojas = [{ id: "a" }, { id: "b" }]
  assert.equal(negocioAtivo(lojas, "b")?.id, "b")
  // Cookie com loja de outro lar não abre nada dele.
  assert.equal(negocioAtivo(lojas, "de-outro-lar")?.id, "a")
  assert.equal(negocioAtivo(lojas, undefined)?.id, "a")
  assert.equal(negocioAtivo([], "a"), null)
})
