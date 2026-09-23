import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { montarPlanoPagamento } from "@/lib/tino/plano-pagamento"

describe("plano de pagamento: meses de quitação", () => {
  const plano = montarPlanoPagamento({
    competenciaInicial: "2026-09",
    alvos: [
      // Sem juro e sem mínimo: só recebe a sobra depois da mais cara.
      { id: "fatura", nome: "Fatura", tipo: "FATURA", saldoCentavos: 50_000, jurosMensalBps: 0, minimoMensalCentavos: 0 },
      { id: "cheque", nome: "Cheque especial", tipo: "CHEQUE_ESPECIAL", saldoCentavos: 150_000, jurosMensalBps: 800, minimoMensalCentavos: 0 },
    ],
    rendaMensalCentavos: 300_000,
    custoDeVidaMensalCentavos: 200_000,
  })

  it("marca cada dívida uma vez só, no mês em que zera", () => {
    const quitacoes = plano.passos.flatMap((passo) => passo.quitadas.map((id) => ({ id, competencia: passo.competencia })))
    assert.deepEqual(quitacoes.map((q) => q.id), ["cheque", "fatura"])
    // Cheque: 1.500 + 8% = 1.620 em set; paga 1.000 → 620; out: 669,60 → quita.
    assert.equal(quitacoes[0].competencia, "2026-10")
    // Sobra de outubro (1.000 − 669,60 = 330,40) vai para a fatura; novembro quita o resto.
    assert.equal(quitacoes[1].competencia, "2026-11")
  })

  it("o mês de quitação é o mesmo em que a dívida restante some da conta", () => {
    const ultimo = plano.passos[plano.passos.length - 1]
    assert.deepEqual(ultimo.quitadas, ["fatura"])
    assert.equal(ultimo.dividaRestanteCentavos, 0)
  })
})
