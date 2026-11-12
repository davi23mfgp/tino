import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { interpretarTextoPdf } from "../src/lib/importar/pdf"
import { lerCsvFaturaCartao } from "../src/lib/importar/csv"

// Achados do Lote 5 da auditoria (12/11/2026), cada um reproduzido antes.
describe("importação: achados do Lote 5", () => {
  it("extrato sem ano enviado em janeiro fica no dezembro anterior", () => {
    const { lancamentos } = interpretarTextoPdf("28/12 PIX ENVIADO MERCADO 10,00", { hoje: new Date("2027-01-05T12:00:00Z") })
    assert.equal(lancamentos.length, 1)
    assert.equal(lancamentos[0].data.toISOString().slice(0, 10), "2026-12-28")
  })

  it("na fatura em PDF, loja com 'pagamento' no nome continua compra", () => {
    const { lancamentos } = interpretarTextoPdf("05/03 PAGAMENTO CONTAS 120,00", { faturaCartao: true, hoje: new Date("2026-03-20T12:00:00Z") })
    assert.equal(lancamentos.length, 1)
    assert.equal(lancamentos[0].tipo, "DESPESA")
  })

  it("na fatura em PDF, o pagamento da fatura continua crédito", () => {
    const { lancamentos } = interpretarTextoPdf("05/03 PAGAMENTO EFETUADO 1.200,00", { faturaCartao: true, hoje: new Date("2026-03-20T12:00:00Z") })
    assert.equal(lancamentos[0]?.tipo, "RECEITA")
  })

  it("na fatura em CSV, 'crédito' no meio do nome não vira renda", () => {
    const { lancamentos } = lerCsvFaturaCartao("data;descricao;valor\n15/03/2026;EMPRESTIMO CREDITO PESSOAL;500,00\n16/03/2026;ESTORNO LOJA X;30,00")
    assert.equal(lancamentos[0].tipo, "DESPESA")
    assert.equal(lancamentos[1].tipo, "RECEITA")
  })

  it("data com hora no CSV não descarta a linha", () => {
    const { lancamentos } = lerCsvFaturaCartao("data;descricao;valor\n15/03/2026 14:22;MERCADO;50,00")
    assert.equal(lancamentos.length, 1)
    assert.equal(lancamentos[0].data.toISOString().slice(0, 10), "2026-03-15")
  })
})
