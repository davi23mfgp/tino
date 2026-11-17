import { test } from "node:test"
import assert from "node:assert/strict"

import { lerBuscaDoYahoo, rendaFixaDoCatalogo } from "../src/lib/catalogo-ativos"
import { lerSerieDoCdi, valorPeloCdi } from "../src/lib/renda-fixa"
import { avisosDeMilhas, custoPorMilheiroCentavos, saldoDesatualizado } from "../src/lib/milhas"
import { comprasRepetidas, fixasQueSubiram } from "../src/lib/tino/avisos-de-conferencia"

test("catálogo: busca do Yahoo vira lista, B3 primeiro, sem opção nem índice", () => {
  const itens = lerBuscaDoYahoo({ quotes: [
    { symbol: "PBR", longname: "Petróleo Brasileiro S.A.", quoteType: "EQUITY", exchange: "NYQ" },
    { symbol: "PETR4.SA", longname: "Petróleo Brasileiro S.A. - Petrobras", quoteType: "EQUITY", exchange: "SAO" },
    { symbol: "PETR4.SA", shortname: "repetida", quoteType: "EQUITY" },
    { symbol: "HGLG11.SA", shortname: "FII CSHG LOG", quoteType: "EQUITY" },
    { symbol: "BOVA11.SA", shortname: "ISHARES BOVA", quoteType: "ETF" },
    { symbol: "BTC-USD", shortname: "Bitcoin USD", quoteType: "CRYPTOCURRENCY" },
    { symbol: "^BVSP", shortname: "IBOVESPA", quoteType: "INDEX" },
    { symbol: "PETRA1.SA", shortname: "opção", quoteType: "OPTION" },
    { symbol: "SEMNOME.SA", quoteType: "EQUITY" },
  ] })
  assert.deepEqual(itens.map((i) => [i.ticker, i.classe]), [
    ["PETR4", "ACOES"], ["HGLG11", "FII"], ["BOVA11", "ACOES"], ["PBR", "INTERNACIONAL"], ["BTC-USD", "CRIPTO"],
  ])
  assert.equal(itens[0].descricao, "Ação · B3")
  assert.equal(itens[2].descricao, "ETF · B3")
  assert.deepEqual(lerBuscaDoYahoo({}), [])
})

test("catálogo: renda fixa entra por tipo, sem taxa, e diz o que o Tino calcula", () => {
  assert.deepEqual(rendaFixaDoCatalogo("cdb").map((i) => i.nome), ["CDB"])
  assert.deepEqual(rendaFixaDoCatalogo("Tesouro").map((i) => i.nome), ["Tesouro Selic", "Tesouro IPCA+", "Tesouro Prefixado"])
  assert.equal(rendaFixaDoCatalogo("poupança")[0].rendimento, "manual")
  assert.equal(rendaFixaDoCatalogo("caixinha")[0].rendimento, "cdi")
  assert.deepEqual(rendaFixaDoCatalogo("p"), [])
  for (const item of rendaFixaDoCatalogo("tesouro")) assert.doesNotMatch(item.descricao, /\d+ ?%/)
})

// Três dias úteis a 0,05% ao dia. À mão, para R$ 10.000,00 a 100% do CDI:
// 1.000.000 × 1,0005³ = 1.001.500,75 centavos → 1.001.501.
const taxas = [
  { data: "2026-11-02", percentual: 0.05 },
  { data: "2026-11-03", percentual: 0.05 },
  { data: "2026-11-04", percentual: 0.05 },
]

test("CDI: 100% rende a taxa cheia; 110% rende 10% a mais sobre a taxa", () => {
  const cem = valorPeloCdi([{ data: "2026-11-02", valorCentavos: 1_000_000 }], 10_000, taxas)
  assert.equal(cem.valorBrutoCentavos, 1_001_501)
  assert.equal(cem.rendimentoBrutoCentavos, 1_501)
  assert.equal(cem.ate, "2026-11-04")
  // 1.000.000 × 1,00055³ = 1.001.650,91
  assert.equal(valorPeloCdi([{ data: "2026-11-02", valorCentavos: 1_000_000 }], 11_000, taxas).valorBrutoCentavos, 1_001_651)
})

test("CDI: cada aplicação rende desde o seu dia; fim de semana entra no próximo dia útil", () => {
  // A de domingo (dia 01) pega os dias 02, 03 e 04; a do dia 04 rende um dia só.
  // 1.000.000 × 1,0005² = 1.001.000,25; + 500.000 = 1.501.000,25; × 1,0005 = 1.501.750,75.
  const r = valorPeloCdi([
    { data: "2026-11-04", valorCentavos: 500_000 },
    { data: "2026-11-01", valorCentavos: 1_000_000 },
  ], 10_000, taxas)
  assert.equal(r.valorBrutoCentavos, 1_501_751)
  assert.equal(r.aplicadoCentavos, 1_500_000)
})

test("CDI: resgate sai do saldo; aplicação depois da última taxa não rende; sem taxa, sem rendimento", () => {
  // 1.000.000 × 1,0005 = 1.000.500; resgata 400.000 no dia 03: 600.500 × 1,0005² = 601.100,65.
  const r = valorPeloCdi([{ data: "2026-11-02", valorCentavos: 1_000_000 }, { data: "2026-11-03", valorCentavos: -400_000 }], 10_000, taxas)
  assert.equal(r.valorBrutoCentavos, 601_101)
  assert.equal(r.rendimentoBrutoCentavos, 1_101)
  assert.equal(valorPeloCdi([{ data: "2026-11-10", valorCentavos: 300_000 }], 10_000, taxas).rendimentoBrutoCentavos, 0)
  const semFonte = valorPeloCdi([{ data: "2026-11-02", valorCentavos: 300_000 }], 10_000, [])
  assert.deepEqual([semFonte.valorBrutoCentavos, semFonte.rendimentoBrutoCentavos, semFonte.ate], [300_000, 0, null])
})

test("CDI: série do Banco Central é lida e linha quebrada é descartada", () => {
  assert.deepEqual(lerSerieDoCdi([{ data: "02/01/2026", valor: "0.055131" }, { data: "x", valor: "1" }, { data: "05/01/2026", valor: "abc" }]), [{ data: "2026-01-02", percentual: 0.055131 }])
})

const hoje = new Date("2026-11-17T12:00:00Z")
const saldo = (venceEm: string | null, pontosQueVencem: number | null = 5000) => ({
  id: "s1", programa: "Livelo", pontos: 20_000, pontosQueVencem, venceEm: venceEm ? new Date(`${venceEm}T00:00:00Z`) : null, custoCentavos: null, atualizadoEm: hoje,
})

test("milhas: avisa em 60, 30 e 7 dias, cada faixa com a sua chave; vencido ou sem data, não", () => {
  assert.equal(avisosDeMilhas([saldo("2027-03-01")], hoje).length, 0)
  const sessenta = avisosDeMilhas([saldo("2027-01-10")], hoje)[0]
  assert.equal(sessenta.titulo, "5.000 pontos da Livelo vencem em 54 dias")
  assert.match(sessenta.chave, /:60$/)
  assert.match(avisosDeMilhas([saldo("2026-12-10")], hoje)[0].chave, /:30$/)
  const sete = avisosDeMilhas([saldo("2026-11-20")], hoje)[0]
  assert.equal(sete.severidade, "ATENCAO")
  assert.match(sete.chave, /:7$/)
  assert.equal(avisosDeMilhas([saldo("2026-11-17")], hoje)[0].titulo, "5.000 pontos da Livelo vencem hoje")
  assert.equal(avisosDeMilhas([saldo("2026-11-16")], hoje).length, 0)
  assert.equal(avisosDeMilhas([saldo(null)], hoje).length, 0)
  assert.equal(avisosDeMilhas([saldo("2026-11-20", null)], hoje).length, 0)
})

test("milhas: custo por milheiro só com custo informado; saldo de mais de 60 dias pede conferência", () => {
  assert.equal(custoPorMilheiroCentavos(20_000, 70_000), 3_500)
  assert.equal(custoPorMilheiroCentavos(20_000, null), null)
  assert.equal(custoPorMilheiroCentavos(0, 70_000), null)
  assert.equal(saldoDesatualizado(new Date("2026-09-01T00:00:00Z"), hoje), true)
  assert.equal(saldoDesatualizado(new Date("2026-10-20T00:00:00Z"), hoje), false)
})

const fixa = (competencia: string, valorCentavos: number, extra = {}) => ({ recorrenciaId: "r1", descricao: "Netflix", valorVariavel: false, competencia, valorCentavos, ...extra })

test("conta fixa que subiu: compara os dois últimos meses; variável e centavos ficam de fora", () => {
  const r = fixasQueSubiram([fixa("2026-09", 3990), fixa("2026-10", 3990), fixa("2026-11", 4490)])
  assert.equal(r.length, 1)
  assert.equal(r[0].titulo, "Netflix ficou mais cara")
  assert.match(r[0].texto, /R\$\s?39,90 para R\$\s?44,90, R\$\s?5,00 a mais/)
  assert.equal(r[0].chave, "fixa_subiu:r1:2026-11")
  assert.equal(fixasQueSubiram([fixa("2026-10", 3990), fixa("2026-11", 4050)]).length, 0)
  assert.equal(fixasQueSubiram([fixa("2026-10", 4490), fixa("2026-11", 3990)]).length, 0)
  assert.equal(fixasQueSubiram([fixa("2026-10", 15_000, { valorVariavel: true }), fixa("2026-11", 22_000, { valorVariavel: true })]).length, 0)
  assert.equal(fixasQueSubiram([fixa("2026-11", 4490)]).length, 0)
})

const compra = (id: string, extra = {}) => ({ id, contaId: "c1", data: "2026-11-15", descricao: "Posto Shell", valorCentavos: 20_000, repeteDeProposito: false, ...extra })

test("compra repetida: mesma conta, dia, nome e valor; parcela, fixa, valor pequeno e outro dia não", () => {
  const r = comprasRepetidas([compra("b"), compra("a"), compra("x", { descricao: "Mercado" })])
  assert.equal(r.length, 1)
  assert.equal(r[0].titulo, "Posto Shell aparece 2 vezes no mesmo dia")
  assert.equal(r[0].chave, "compra_repetida:a")
  assert.equal(comprasRepetidas([compra("a"), compra("b", { data: "2026-11-16" })]).length, 0)
  assert.equal(comprasRepetidas([compra("a"), compra("b", { contaId: "c2" })]).length, 0)
  assert.equal(comprasRepetidas([compra("a", { repeteDeProposito: true }), compra("b", { repeteDeProposito: true })]).length, 0)
  assert.equal(comprasRepetidas([compra("a", { valorCentavos: 800 }), compra("b", { valorCentavos: 800 })]).length, 0)
})
