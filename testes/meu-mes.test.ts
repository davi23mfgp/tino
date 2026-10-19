import { test } from "node:test"
import assert from "node:assert/strict"

import { resumoMeuMes, sugestoesParaPreencher } from "../src/lib/meu-mes"

test("Meu mês: soma fixo e variável e tira da renda", () => {
  const r = resumoMeuMes([{ valorCentavos: 180_000 }, { valorCentavos: 18_640 }], [{ limiteCentavos: 124_000 }], 500_000)
  assert.equal(r.fixoCentavos, 198_640)
  assert.equal(r.variavelCentavos, 124_000)
  assert.equal(r.sobraCentavos, 500_000 - 198_640 - 124_000)
  assert.equal(r.fixoBps, 3973)
  assert.equal(r.fixoAcimaDaReferencia, false)
})

test("Meu mês: sem renda não inventa sobra nem percentual", () => {
  const r = resumoMeuMes([{ valorCentavos: 100_000 }], [], 0)
  assert.equal(r.sobraCentavos, null)
  assert.equal(r.fixoBps, null)
  assert.equal(r.rendaCentavos, null)
})

test("Meu mês: fixo acima de metade da renda acende a referência", () => {
  assert.equal(resumoMeuMes([{ valorCentavos: 260_000 }], [], 500_000).fixoAcimaDaReferencia, true)
})

test("Preencher pelo extrato não repete categoria de conta fixa nem a que já tem limite", () => {
  const s = sugestoesParaPreencher(
    [{ categoriaId: "mercado", sugestaoCentavos: 90_000 }, { categoriaId: "aluguel", sugestaoCentavos: 180_000 }, { categoriaId: "lazer", sugestaoCentavos: 20_000 }, { categoriaId: "zero", sugestaoCentavos: 0 }],
    new Set(["lazer"]),
    new Set(["aluguel"]),
  )
  assert.deepEqual(s.map((x) => x.categoriaId), ["mercado"])
})
