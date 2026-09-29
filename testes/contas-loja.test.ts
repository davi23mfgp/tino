import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { diaNoFuso, resumoDasContas, situacaoDaConta } from "@/lib/loja/contas"

// Vencimentos gravados como a API grava: meia-noite UTC do dia escolhido.
const venc = (dia: string) => new Date(`${dia}T00:00:00.000Z`)

describe("situação da conta, por dia no fuso do lar", () => {
  it("às 22h53 de 28/09 em Brasília (01h53 UTC de 29/09), a luz do dia 29 ainda vence amanhã", () => {
    const hoje = diaNoFuso(new Date("2026-09-29T01:53:00Z"), "America/Sao_Paulo")
    assert.equal(hoje, "2026-09-28")
    assert.equal(situacaoDaConta({ vencimento: venc("2026-09-29"), paga: false }, hoje), "esta semana")
  })

  it("no dia do vencimento é 'vence hoje', não 'vencida', a qualquer hora", () => {
    const hoje = diaNoFuso(new Date("2026-09-29T20:00:00Z"), "America/Sao_Paulo")
    assert.equal(situacaoDaConta({ vencimento: venc("2026-09-29"), paga: false }, hoje), "vence hoje")
    assert.equal(situacaoDaConta({ vencimento: venc("2026-09-28"), paga: false }, hoje), "vencida")
  })

  it("semana é hoje e os seis dias seguintes; paga vence tudo", () => {
    assert.equal(situacaoDaConta({ vencimento: venc("2026-10-05"), paga: false }, "2026-09-29"), "esta semana")
    assert.equal(situacaoDaConta({ vencimento: venc("2026-10-06"), paga: false }, "2026-09-29"), "depois")
    assert.equal(situacaoDaConta({ vencimento: venc("2026-09-01"), paga: true }, "2026-09-29"), "paga")
  })
})

describe("resumo das contas", () => {
  it("separa vencido de 'da semana' e soma o pago no mês pelo dia do pagamento", () => {
    const resumo = resumoDasContas(
      [
        { vencimento: venc("2026-09-25"), paga: false, pagaEm: null, valorCentavos: 64000 },
        { vencimento: venc("2026-09-29"), paga: false, pagaEm: null, valorCentavos: 32040 },
        { vencimento: venc("2026-10-05"), paga: false, pagaEm: null, valorCentavos: 180000 },
        { vencimento: venc("2026-10-20"), paga: false, pagaEm: null, valorCentavos: 7690 },
        { vencimento: venc("2026-09-10"), paga: true, pagaEm: new Date("2026-09-10T15:00:00Z"), valorCentavos: 25000 },
        // Paga às 22h do dia 31/08 em Brasília: é agosto, mesmo sendo 1º/09 em UTC.
        { vencimento: venc("2026-08-31"), paga: true, pagaEm: new Date("2026-09-01T01:00:00Z"), valorCentavos: 9999 },
      ],
      "2026-09-28",
    )
    assert.equal(resumo.vencidoCentavos, 64000)
    // Semana de 28/09 vai até 04/10: o aluguel do dia 5 fica para depois.
    assert.equal(resumo.daSemanaCentavos, 32040)
    assert.equal(resumo.abertoCentavos, 64000 + 32040 + 180000 + 7690)
    assert.equal(resumo.pagoNoMesCentavos, 25000)
  })
})
