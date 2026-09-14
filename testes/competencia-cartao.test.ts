import assert from "node:assert/strict"
import { it } from "node:test"
import { competenciaDoCartao } from "../src/lib/competencia-cartao"
import { saldoDisponivel, patrimonio, aplicado } from "../src/lib/saldo-disponivel"

const cartao = { tipo: "CARTAO_CREDITO", diaFechamento: 28, diaVencimento: 6 }

it("fechamento é inclusivo: comprar no dia do fechamento ainda entra nessa fatura", () => {
  assert.equal(competenciaDoCartao(new Date("2026-09-28T12:00:00Z"), cartao), "2026-10")
  assert.equal(competenciaDoCartao(new Date("2026-09-29T12:00:00Z"), cartao), "2026-11")
})

it("vira o ano sem perder o mês", () => {
  assert.equal(competenciaDoCartao(new Date("2026-12-28T12:00:00Z"), cartao), "2027-01")
  assert.equal(competenciaDoCartao(new Date("2026-12-29T12:00:00Z"), cartao), "2027-02")
})

it("fatura que fecha e vence no mesmo mês não pula um mês", () => {
  const mesmoMes = { tipo: "CARTAO_CREDITO", diaFechamento: 8, diaVencimento: 15 }
  assert.equal(competenciaDoCartao(new Date("2026-09-05T12:00:00Z"), mesmoMes), "2026-09")
  assert.equal(competenciaDoCartao(new Date("2026-09-09T12:00:00Z"), mesmoMes), "2026-10")
})

it("fechamento no dia 31 cai no último dia dos meses curtos", () => {
  const fimDoMes = { tipo: "CARTAO_CREDITO", diaFechamento: 31, diaVencimento: 10 }
  assert.equal(competenciaDoCartao(new Date("2026-02-28T12:00:00Z"), fimDoMes), "2026-03")
})

it("sem calendário completo, ou fora do crédito, não arrisca um palpite", () => {
  assert.equal(competenciaDoCartao(new Date("2026-09-29T12:00:00Z"), { ...cartao, diaFechamento: null }), null)
  assert.equal(competenciaDoCartao(new Date("2026-09-29T12:00:00Z"), { ...cartao, diaVencimento: null }), null)
  assert.equal(competenciaDoCartao(new Date("2026-09-29T12:00:00Z"), { ...cartao, tipo: "CORRENTE" }), null)
})

const contas = [
  { tipo: "CORRENTE", saldoCentavos: 50_000 },
  { tipo: "POUPANCA", saldoCentavos: 20_000 },
  { tipo: "INVESTIMENTO", saldoCentavos: 2_000_000 },
  { tipo: "CARTAO_CREDITO", saldoCentavos: -80_000 },
]

it("o caixa ignora investimento e cartão; o patrimônio mantém o investimento", () => {
  assert.equal(saldoDisponivel(contas), 70_000)
  assert.equal(patrimonio(contas), 2_070_000)
  assert.equal(aplicado(contas), 2_000_000)
})

it("investimento grande não faz o caixa parecer suficiente", () => {
  const pobreEmCaixa = [
    { tipo: "CORRENTE", saldoCentavos: 5_000 },
    { tipo: "INVESTIMENTO", saldoCentavos: 3_000_000 },
  ]
  assert.equal(saldoDisponivel(pobreEmCaixa), 5_000)
  assert.ok(saldoDisponivel(pobreEmCaixa) < 100_000, "não dá para pagar uma conta de mil reais")
})

it("sem contas, zero — e não NaN", () => {
  assert.equal(saldoDisponivel([]), 0)
  assert.equal(patrimonio([]), 0)
})
