import { test } from "node:test"
import assert from "node:assert/strict"
import { projetarComParcelas } from "../src/lib/projecao-com-parcelas"

const projecao = ["2026-09", "2026-10"].map(competencia => ({ competencia, receitasCentavos: 10000, despesasCentavos: 6000, saldoMesCentavos: 4000, saldoAcumuladoCentavos: 0, negativo: false }))
test("projeção desconta parcelas no mês correto e acumula sem alterar a origem", () => {
  const panorama = { saldoTotalCentavos: 1000, projecao }
  const linhas = projetarComParcelas(panorama, [{ competencia: "2026-10", totalCentavos: 12000 }])
  assert.deepEqual(linhas.map(l => l.acumuladoCentavos), [5000, -3000])
  assert.deepEqual(linhas.map(l => l.parcelasCentavos), [0, 12000])
  assert.equal(panorama.projecao[1].saldoMesCentavos, 4000)
})
test("projeção sem parcelas preserva o fluxo e aceita histórico vazio", () => {
  assert.deepEqual(projetarComParcelas({ saldoTotalCentavos: 1000, projecao }, []).map(l => l.acumuladoCentavos), [5000, 9000])
  assert.deepEqual(projetarComParcelas({ saldoTotalCentavos: 0, projecao: [] }, []), [])
})
