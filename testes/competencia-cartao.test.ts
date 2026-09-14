import assert from "node:assert/strict"
import { it } from "node:test"
import { competenciaDoCartao } from "../src/lib/competencia-cartao"
import { saldoDisponivel } from "../src/lib/saldo-disponivel"

const cartao = { tipo: "CARTAO_CREDITO", diaFechamento: 28, diaVencimento: 6 }
it("atribui ao vencimento e mantém fechamento inclusivo", () => {
  assert.equal(competenciaDoCartao(new Date("2026-09-28"), cartao), "2026-10")
  assert.equal(competenciaDoCartao(new Date("2026-09-29"), cartao), "2026-11")
  assert.equal(competenciaDoCartao(new Date("2026-12-29"), cartao), "2027-02")
})
it("trata fechamento no fim do mês e vencimento no mesmo mês", () => {
  assert.equal(competenciaDoCartao(new Date("2026-02-28"), { ...cartao, diaFechamento: 31 }), "2026-03")
  assert.equal(competenciaDoCartao(new Date("2026-09-05"), { ...cartao, diaFechamento: 8, diaVencimento: 15 }), "2026-09")
  assert.equal(competenciaDoCartao(new Date("2026-09-09"), { ...cartao, diaFechamento: 8, diaVencimento: 15 }), "2026-10")
})
it("preserva mês sem calendário completo e não atribui fatura a débito", () => {
  assert.equal(competenciaDoCartao(new Date("2026-09-29"), { ...cartao, diaFechamento: null }), "2026-09")
  assert.equal(competenciaDoCartao(new Date("2026-09-29"), { ...cartao, tipo: "CORRENTE" }), null)
})
it("investimentos não ocultam déficit; resgate muda disponibilidade", () => {
  assert.equal(saldoDisponivel([{ tipo: "CORRENTE", saldoCentavos: -5000 }, { tipo: "INVESTIMENTO", saldoCentavos: 100000 }, { tipo: "CARTAO_CREDITO", saldoCentavos: 50000 }]), -5000)
  assert.equal(saldoDisponivel([{ tipo: "CORRENTE", saldoCentavos: 5000 }, { tipo: "INVESTIMENTO", saldoCentavos: 90000 }]), 5000)
})
