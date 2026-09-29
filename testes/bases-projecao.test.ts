import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { basesDaProjecao } from "@/lib/financeiro"

// Números da conta demo (27/09/2026): Marina com salário cadastrado em Contas
// fixas; Rafael recebe todo mês, mas o salário dele nunca foi cadastrado.
const DEMO = {
  receitasFixasCentavos: 520_000,
  receitaMediaCentavos: 917_633,
  custoFixoCentavos: 367_800,
  despesaMediaCentavos: 799_983,
  parcelaDividasCentavos: 0,
  pagamentoDividasMedioCentavos: 0,
}

describe("bases da projeção", () => {
  it("usa a média de entrada quando o histórico mostra mais que o fixo cadastrado", () => {
    // O defeito: a entrada era só o fixo (R$ 5.200) e o salário do Rafael
    // sumia, enquanto a saída usava a média inteira.
    const bases = basesDaProjecao(DEMO)
    assert.equal(bases.receitasCentavos, 917_633)
  })

  it("mantém o fixo quando ele é maior que a média (salário novo, ainda sem histórico)", () => {
    const bases = basesDaProjecao({ ...DEMO, receitasFixasCentavos: 1_000_000, receitaMediaCentavos: 300_000 })
    assert.equal(bases.receitasCentavos, 1_000_000)
  })

  it("não conta a parcela de dívida duas vezes quando ela já foi paga no extrato", () => {
    // Pago R$ 800/mês de dívida pelo app: a média de saída já tem esses R$ 800.
    const bases = basesDaProjecao({ ...DEMO, parcelaDividasCentavos: 80_000, pagamentoDividasMedioCentavos: 80_000 })
    const saidaMensal = bases.despesasFixasCentavos + bases.despesasVariaveisMediaCentavos
    assert.equal(saidaMensal, DEMO.despesaMediaCentavos)
  })

  it("soma a parcela contratada quando ela ainda não aparece no histórico", () => {
    const bases = basesDaProjecao({ ...DEMO, parcelaDividasCentavos: 80_000 })
    assert.equal(bases.despesasFixasCentavos + bases.despesasVariaveisMediaCentavos, DEMO.despesaMediaCentavos + 80_000)
  })

  it("a parte variável nunca fica negativa", () => {
    const bases = basesDaProjecao({ ...DEMO, despesaMediaCentavos: 100_000 })
    assert.equal(bases.despesasVariaveisMediaCentavos, 0)
  })
})
