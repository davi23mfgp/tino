import test from "node:test"
import assert from "node:assert/strict"

import { anexoAceito, LIMITE_ANEXO_BYTES } from "../src/lib/faturas-email"
import { normalizarDescricao, repeteCapturaDoCelular } from "../src/lib/importar/repeticao"

/**
 * Regras que o webhook e a importação aplicam, testadas fora deles: as duas
 * funções são puras, então não precisam de banco, de rede nem de chave.
 */

// ── Anexo de fatura ────────────────────────────────────────

test("aceita apenas PDF, CSV e OFX", () => {
  for (const nome of ["fatura.pdf", "extrato.csv", "movimento.ofx"]) {
    assert.equal(anexoAceito(nome), true, nome)
  }
})

test("a extensão vale em qualquer caixa", () => {
  assert.equal(anexoAceito("FATURA.PDF"), true)
  assert.equal(anexoAceito("Extrato.Ofx"), true)
})

test("recusa formato que não é fatura", () => {
  for (const nome of ["foto.png", "planilha.xlsx", "pacote.zip", "programa.exe", "sem-extensao"]) {
    assert.equal(anexoAceito(nome), false, nome)
  }
})

test("recusa nome ausente ou vazio", () => {
  assert.equal(anexoAceito(undefined), false)
  assert.equal(anexoAceito(null), false)
  assert.equal(anexoAceito(""), false)
})

test("extensão dupla não engana: vale a última", () => {
  assert.equal(anexoAceito("fatura.pdf.exe"), false)
  assert.equal(anexoAceito("relatorio.exe.pdf"), true)
})

test("o teto por anexo é de 10 MB", () => {
  assert.equal(LIMITE_ANEXO_BYTES, 10 * 1024 * 1024)
})

// ── Repetição entre captura do celular e extrato ───────────

const captura = (descricao: string, valorCentavos: number, dia: string) => ({
  data: new Date(`${dia}T12:00:00.000Z`),
  valorCentavos,
  descricao,
})

test("mesmo dia, mesmo valor e nome contido: é repetição", () => {
  const bruto = captura("PAG*ASSAI ATACADISTA 4412", -7490, "2026-09-12")
  assert.equal(repeteCapturaDoCelular(bruto, [captura("Assaí", 7490, "2026-09-12")]), true)
})

test("dia diferente não é repetição", () => {
  const bruto = captura("PAG*ASSAI ATACADISTA", -7490, "2026-09-12")
  assert.equal(repeteCapturaDoCelular(bruto, [captura("Assaí", 7490, "2026-09-11")]), false)
})

test("valor diferente não é repetição", () => {
  const bruto = captura("PAG*ASSAI ATACADISTA", -7490, "2026-09-12")
  assert.equal(repeteCapturaDoCelular(bruto, [captura("Assaí", 7491, "2026-09-12")]), false)
})

test("o extrato traz o valor com sinal; a comparação usa o absoluto", () => {
  const saida = captura("UBER TRIP", -1840, "2026-09-12")
  assert.equal(repeteCapturaDoCelular(saida, [captura("Uber", 1840, "2026-09-12")]), true)
})

test("acento e pontuação não atrapalham", () => {
  const bruto = captura("PADARIA REAL LTDA", -3200, "2026-09-12")
  assert.equal(repeteCapturaDoCelular(bruto, [captura("Padaria  Réal!", 3200, "2026-09-12")]), true)
})

test("descrição curta demais não casa com tudo", () => {
  const bruto = captura("MERCADO SAO JOSE", -5000, "2026-09-12")
  assert.equal(repeteCapturaDoCelular(bruto, [captura("s/", 5000, "2026-09-12")]), false)
})

test("nome que não aparece na descrição não é repetição", () => {
  const bruto = captura("POSTO IPIRANGA", -20000, "2026-09-12")
  assert.equal(repeteCapturaDoCelular(bruto, [captura("Centauro", 20000, "2026-09-12")]), false)
})

test("sem captura nenhuma, nada é repetição", () => {
  assert.equal(repeteCapturaDoCelular(captura("QUALQUER", -100, "2026-09-12"), []), false)
})

test("basta uma captura casar", () => {
  const bruto = captura("PAG*CENTAURO LOJA 12", -21990, "2026-09-12")
  const capturados = [captura("Uber", 1840, "2026-09-12"), captura("Centauro", 21990, "2026-09-12")]
  assert.equal(repeteCapturaDoCelular(bruto, capturados), true)
})

test("a normalização derruba acento, caixa e pontuação", () => {
  assert.equal(normalizarDescricao("Padaria Réal, Ltda."), "padariarealltda")
})
