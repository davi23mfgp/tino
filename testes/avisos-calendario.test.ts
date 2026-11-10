import { test } from "node:test"
import assert from "node:assert/strict"

import { avisosDeCalendario } from "../src/lib/tino/avisos-calendario"

const hoje = new Date("2026-11-10T15:00:00Z")
const vazio = { cartoes: [], dividas: [], recorrencias: [] }

test("fatura que fecha em 3 dias avisa; em 10 dias, não; sem fatura, não", () => {
  const r = avisosDeCalendario({ ...vazio, cartoes: [
    { id: "a", nome: "Itaú Visa", faturaCentavos: 662_759, diaFechamento: 13 },
    { id: "b", nome: "Nubank", faturaCentavos: 50_000, diaFechamento: 20 },
    { id: "c", nome: "Inter", faturaCentavos: 0, diaFechamento: 11 },
  ] }, hoje)
  assert.equal(r.length, 1)
  assert.equal(r[0].titulo, "Fatura do Itaú Visa fecha em 3 dias")
  assert.equal(r[0].chave, "fatura_fecha:a:2026-11")
})

test("fechamento que já passou neste mês conta o do mês seguinte", () => {
  const r = avisosDeCalendario({ ...vazio, cartoes: [{ id: "a", nome: "X", faturaCentavos: 100, diaFechamento: 1 }] }, new Date("2026-11-29T12:00:00Z"))
  assert.equal(r[0]?.titulo, "Fatura do X fecha em 2 dias")
  assert.equal(r[0]?.chave, "fatura_fecha:a:2026-12")
})

test("última parcela avisa quanto sobra por mês; faltando duas, não avisa", () => {
  const r = avisosDeCalendario({ ...vazio, dividas: [
    { id: "p", credor: "Pix parcelado", parcelaCentavos: 93_042, parcelasTotal: 4, parcelasPagas: 3 },
    { id: "q", credor: "Carro", parcelaCentavos: 89_000, parcelasTotal: 48, parcelasPagas: 46 },
    { id: "r", credor: "Cheque especial", parcelaCentavos: 0, parcelasTotal: null, parcelasPagas: 0 },
  ] }, hoje)
  assert.deepEqual(r.map((a) => a.chave), ["parcela_acaba:p"])
  assert.match(r[0].texto, /R\$\s930,42 por mês/)
})

test("renda que termina em até 60 dias pede atenção; conta que termina só informa; depois de 60 dias, nada", () => {
  const r = avisosDeCalendario({ ...vazio, recorrencias: [
    { id: "aj", descricao: "Ajuda", valorCentavos: 60_000, tipo: "RECEITA", fimEm: new Date("2026-12-31T12:00:00Z") },
    { id: "ac", descricao: "Academia", valorCentavos: 10_990, tipo: "DESPESA", fimEm: new Date("2026-12-15T12:00:00Z") },
    { id: "lo", descricao: "Curso", valorCentavos: 10_000, tipo: "DESPESA", fimEm: new Date("2027-06-01T12:00:00Z") },
    { id: "ve", descricao: "Velha", valorCentavos: 10_000, tipo: "DESPESA", fimEm: new Date("2026-10-01T12:00:00Z") },
  ] }, hoje)
  assert.deepEqual(r.map((a) => [a.tipo, a.severidade]), [["renda_termina", "ATENCAO"], ["fixa_termina", "INFO"]])
  assert.equal(r[0].titulo, "Ajuda termina em dezembro de 2026")
})

test("entrega: grave primeiro, informativo comum fica no app, no máximo 2 por dia", async () => {
  const { avisosParaEntregar } = await import("../src/lib/tino/entregar-avisos")
  const d = (n: number) => new Date(2026, 10, n)
  const r = avisosParaEntregar([
    { id: "1", tipo: "sem_categoria", severidade: "INFO", titulo: "a", acaoRota: null, criadoEm: d(1) },
    { id: "2", tipo: "fatura_fecha", severidade: "INFO", titulo: "b", acaoRota: null, criadoEm: d(2) },
    { id: "3", tipo: "renda_termina", severidade: "ATENCAO", titulo: "c", acaoRota: null, criadoEm: d(3) },
    { id: "4", tipo: "caixa_negativo", severidade: "CRITICO", titulo: "d", acaoRota: null, criadoEm: d(4) },
  ])
  assert.deepEqual(r.map((a) => a.id), ["4", "3"])
})
