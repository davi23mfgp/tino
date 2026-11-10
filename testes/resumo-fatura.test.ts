import { test } from "node:test"
import assert from "node:assert/strict"

import { resumoDaPrevia } from "../src/lib/importar/resumo-fatura"
import type { PreviaImportacao } from "../src/lib/importar"

const linha = (valorCentavos: number, tipo: "DESPESA" | "RECEITA", duplicada = false) =>
  ({ valorCentavos, tipo, duplicada, data: new Date("2026-11-01"), descricao: "x", descricaoSugerida: "x", hashImport: String(valorCentavos) }) as unknown as PreviaImportacao["lancamentos"][number]

const previa = (extra: Partial<PreviaImportacao>): PreviaImportacao => ({
  formato: "pdf", total: 3, novas: 2, duplicadas: 1, semCategoria: 0, avisos: [], faturaPdf: true,
  lancamentos: [linha(10000, "DESPESA"), linha(2500, "RECEITA"), linha(9900, "DESPESA", true)],
  conferencia: { informadoCentavos: 17400, lidoCentavos: 17400 },
  ...extra,
})

test("fatura que fecha com o total fica pronta, com o total só do que é novo", () => {
  const resumo = resumoDaPrevia(previa({}))
  assert.equal(resumo.situacao, "PRONTA")
  assert.equal(resumo.totalCentavos, 7500)
})

test("soma que não fecha nunca libera o Confirmar", () => {
  assert.equal(resumoDaPrevia(previa({ conferencia: { informadoCentavos: 17400, lidoCentavos: 17000 } })).situacao, "CONFERIR")
})

test("fatura sem total impresso pede conferência", () => {
  assert.equal(resumoDaPrevia(previa({ conferencia: undefined })).situacao, "CONFERIR")
})

test("extrato sem total para conferir não é lançado num toque", () => {
  assert.equal(resumoDaPrevia(previa({ faturaPdf: false, conferencia: undefined })).situacao, "CONFERIR")
})

test("arquivo só com duplicado não oferece nada", () => {
  assert.equal(resumoDaPrevia(previa({ novas: 0 })).situacao, "NADA_NOVO")
})

import { codigoDoGmail } from "../src/lib/faturas-email"

test("código do Gmail sai do assunto, só quando vem do Google", () => {
  const assunto = "(#123456789) Confirmação de encaminhamento do Gmail: receber e-mails de x@gmail.com"
  assert.equal(codigoDoGmail({ from: "Equipe Gmail <forwarding-noreply@google.com>", subject: assunto }), "123456789")
  assert.equal(codigoDoGmail({ from: "golpe@exemplo.com", subject: assunto }), null)
})

test("código do Gmail sai do corpo quando o assunto não traz", () => {
  assert.equal(codigoDoGmail({ from: "forwarding-noreply@google.com", subject: "Gmail", text: "Código de confirmação: 987654321" }), "987654321")
  assert.equal(codigoDoGmail({ from: "forwarding-noreply@google.com", subject: "Gmail", text: "sem código" }), null)
})
