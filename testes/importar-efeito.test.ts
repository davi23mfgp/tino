import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { efeitoDaImportacao, frasesDoEfeito } from "../src/lib/importar/efeito"

const linha = (tipo: "RECEITA" | "DESPESA" | "TRANSFERENCIA", valorCentavos: number, data: string, duplicada = false) => ({ tipo, valorCentavos, data, duplicada })

describe("o que a importação vai fazer com a conta", () => {
  it("saldo depois = saldo antes + entradas - saídas - transferências, só das linhas novas", () => {
    const efeito = efeitoDaImportacao([linha("RECEITA", 500_000, "2026-11-05"), linha("DESPESA", 120_000, "2026-11-06"), linha("TRANSFERENCIA", 80_000, "2026-11-07"), linha("DESPESA", 999_999, "2026-11-08", true)], 100_000)
    assert.equal(efeito.saldoDepoisCentavos, 400_000)
  })
  it("cartão não tem saldo depois: o que muda é a fatura", () => {
    const efeito = efeitoDaImportacao([linha("DESPESA", 5_000, "2026-11-06")], null)
    assert.equal(efeito.saldoDepoisCentavos, null)
    assert.deepEqual(frasesDoEfeito(efeito, { conta: "Platinum", saldoAntesCentavos: null, competenciaFatura: "2026-12" }), ["Estas compras entram na fatura de dezembro de 2026."])
  })
  it("conta quantos lançamentos caem em cada mês, sem as repetidas", () => {
    const efeito = efeitoDaImportacao([linha("DESPESA", 1, "2026-10-30"), linha("DESPESA", 1, "2026-11-01"), linha("DESPESA", 1, "2026-11-02"), linha("DESPESA", 1, "2026-11-03", true)], 0)
    assert.deepEqual(efeito.porMes, [{ competencia: "2026-10", quantidade: 1 }, { competencia: "2026-11", quantidade: 2 }])
  })
})
