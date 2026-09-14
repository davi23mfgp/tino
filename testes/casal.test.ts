import assert from "node:assert/strict"
import { it } from "node:test"
import { dividirEntreCasal, sobraDaMesada, type PessoaDoCasal } from "../src/lib/casal"

const casal = (a: Partial<PessoaDoCasal> = {}, b: Partial<PessoaDoCasal> = {}): PessoaDoCasal[] => [
  { id: "a", nome: "Davi", rendaCentavos: 600_000, mesadaCentavos: 0, pagouCentavos: 0, ...a },
  { id: "b", nome: "Par", rendaCentavos: 400_000, mesadaCentavos: 0, pagouCentavos: 0, ...b },
]

it("metade a metade divide igual", () => {
  const { partes } = dividirEntreCasal(100_000, "METADE", casal())
  assert.deepEqual(partes.map((p) => p.deviaCentavos), [50_000, 50_000])
})

it("proporcional cobra mais de quem ganha mais", () => {
  const { partes } = dividirEntreCasal(100_000, "PROPORCIONAL", casal())
  assert.deepEqual(partes.map((p) => p.deviaCentavos), [60_000, 40_000])
})

it("proporcional sem renda cadastrada cai no meio a meio, e não em NaN", () => {
  const { partes } = dividirEntreCasal(100_000, "PROPORCIONAL", casal({ rendaCentavos: 0 }, { rendaCentavos: 0 }))
  assert.deepEqual(partes.map((p) => p.deviaCentavos), [50_000, 50_000])
})

it("mesada não muda a divisão do gasto comum — ela é limite individual", () => {
  const comum = dividirEntreCasal(100_000, "MESADA", casal({ mesadaCentavos: 80_000 }, { mesadaCentavos: 20_000 }))
  assert.deepEqual(comum.partes.map((p) => p.deviaCentavos), [50_000, 50_000])
})

it("personalizada usa a quota combinada à mão", () => {
  const { partes } = dividirEntreCasal(100_000, "PERSONALIZADA", casal({ quotaBps: 7000 }, { quotaBps: 3000 }))
  assert.deepEqual(partes.map((p) => p.deviaCentavos), [70_000, 30_000])
})

it("o acerto do mês diz quem paga quem, e quanto", () => {
  const { acerto } = dividirEntreCasal(100_000, "METADE", casal({ pagouCentavos: 90_000 }, { pagouCentavos: 10_000 }))
  assert.deepEqual(acerto, { deId: "b", paraId: "a", valorCentavos: 40_000 })
})

it("quando cada um pagou a sua parte, não há acerto", () => {
  const { acerto } = dividirEntreCasal(100_000, "METADE", casal({ pagouCentavos: 50_000 }, { pagouCentavos: 50_000 }))
  assert.equal(acerto, null)
})

it("nenhuma modalidade perde ou inventa centavo", () => {
  for (const modalidade of ["METADE", "PROPORCIONAL", "MESADA", "PERSONALIZADA"] as const) {
    for (const total of [1, 7, 333, 99_999, 1_000_001]) {
      const { partes } = dividirEntreCasal(total, modalidade, casal({ quotaBps: 3333 }, { quotaBps: 6667 }))
      assert.equal(partes.reduce((soma, p) => soma + p.deviaCentavos, 0), total, `${modalidade} com ${total}`)
    }
  }
})

it("a sobra da mesada mostra quando passou do combinado", () => {
  assert.equal(sobraDaMesada({ mesadaCentavos: 50_000 }, 30_000), 20_000)
  assert.equal(sobraDaMesada({ mesadaCentavos: 50_000 }, 65_000), -15_000)
})
