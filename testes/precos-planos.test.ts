import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { PLANOS, precoAnualComDescontoCentavos } from "@/lib/planos"
import { precoVigenteCentavos } from "@/lib/parametros"

describe("preço anual dos planos", () => {
  it("cobra doze mensalidades com 10% de desconto nos dois planos", () => {
    assert.equal(precoAnualComDescontoCentavos(1990), 21492)
    assert.equal(precoAnualComDescontoCentavos(4990), 53892)
    for (const linha of PLANOS) {
      assert.equal(linha.anualCentavos, precoAnualComDescontoCentavos(linha.mensalCentavos))
    }
  })

  it("mantém o desconto quando o preço mensal muda no painel", () => {
    const linha = PLANOS[0]
    const valores = {
      "plano.pessoal.mensalCentavos": 2500,
      // Uma configuração anual antiga não pode voltar a cobrar outro desconto.
      "plano.pessoal.anualCentavos": 19900,
    }
    assert.equal(precoVigenteCentavos(linha, "MENSAL", valores), 2500)
    assert.equal(precoVigenteCentavos(linha, "ANUAL", valores), 27000)
  })
})
