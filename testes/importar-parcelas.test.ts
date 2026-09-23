import assert from "node:assert/strict"
import { describe, it } from "node:test"
import type { Prisma } from "@prisma/client"

import { projetarParcelasFuturas, sincronizarParcelamentos, type LancamentoParcelado } from "@/lib/importar/parcelas"

interface ParcelaFalsa {
  numero: number
  competencia: string
  valorCentavos: number
  paga: boolean
}
interface ParcelamentoFalso {
  id: string
  larId: string
  contaId: string
  estabelecimento: string | null
  parcelaCentavos: number
  parcelasTotal: number
  parcelasPagas: number
  dataCompra: Date
  primeiraCompetencia: string
  valorTotalCentavos: number
  parcelas: ParcelaFalsa[]
}

/** O pedaço do Prisma que a sincronização usa, em memória. */
function bancoFalso(iniciais: ParcelamentoFalso[] = []) {
  const parcelamentos = [...iniciais]
  const tx = {
    parcelamento: {
      findMany: async ({ where }: { where: { larId: string; contaId: string; parcelasTotal: number; dataCompra: { gte: Date; lt: Date } } }) =>
        parcelamentos.filter(
          (p) =>
            p.larId === where.larId &&
            p.contaId === where.contaId &&
            p.parcelasTotal === where.parcelasTotal &&
            p.dataCompra >= where.dataCompra.gte &&
            p.dataCompra < where.dataCompra.lt,
        ),
      create: async ({ data }: { data: Omit<ParcelamentoFalso, "id" | "parcelas"> & { parcelas: { create: ParcelaFalsa[] } } }) => {
        const novo = { ...data, id: `p${parcelamentos.length + 1}`, parcelas: data.parcelas.create }
        parcelamentos.push(novo)
        return novo
      },
      update: async ({ where, data }: { where: { id: string }; data: Partial<ParcelamentoFalso> }) =>
        Object.assign(parcelamentos.find((p) => p.id === where.id)!, data),
    },
    parcelaCompra: {
      updateMany: async ({ where, data }: { where: { parcelamentoId: string; numero: { lte: number }; paga: boolean }; data: Partial<ParcelaFalsa> }) => {
        for (const parcela of parcelamentos.find((p) => p.id === where.parcelamentoId)!.parcelas) {
          if (parcela.numero <= where.numero.lte && parcela.paga === where.paga) Object.assign(parcela, data)
        }
      },
    },
  }
  return { tx: tx as unknown as Prisma.TransactionClient, parcelamentos }
}

const amazon = (atual: number, competenciaFatura: string): LancamentoParcelado => ({
  descricao: "Amazonmktplc*e (" + atual + "/12)",
  descricaoOriginal: `AMAZONMKTPLC*E ${String(atual).padStart(2, "0")}/12`,
  valorCentavos: 16_869,
  parcelaAtual: atual,
  parcelasTotal: 12,
  dataCompra: new Date("2025-11-04T00:00:00Z"),
  competenciaFatura,
})
const base = { larId: "lar", contaId: "visa", diaVencimento: 8 }

describe("parcelas lidas na fatura viram projeção", () => {
  it("a parcela 10 de 12 cria o parcelamento com as duas que faltam em aberto", async () => {
    const { tx, parcelamentos } = bancoFalso()
    await sincronizarParcelamentos(tx, { ...base, lancamentos: [amazon(10, "2026-09")] })

    assert.equal(parcelamentos.length, 1)
    const p = parcelamentos[0]
    assert.equal(p.primeiraCompetencia, "2025-12")
    assert.equal(p.parcelasPagas, 10)
    assert.equal(p.valorTotalCentavos, 12 * 16_869)
    const abertas = p.parcelas.filter((parcela) => !parcela.paga)
    assert.deepEqual(
      abertas.map((parcela) => [parcela.numero, parcela.competencia, parcela.valorCentavos]),
      [
        [11, "2026-10", 16_869],
        [12, "2026-11", 16_869],
      ],
    )
    assert.equal(p.estabelecimento, "AMAZONMKTPLC*E")
  })

  it("reimportar a mesma fatura não duplica", async () => {
    const { tx, parcelamentos } = bancoFalso()
    await sincronizarParcelamentos(tx, { ...base, lancamentos: [amazon(10, "2026-09")] })
    await sincronizarParcelamentos(tx, { ...base, lancamentos: [amazon(10, "2026-09")] })
    assert.equal(parcelamentos.length, 1)
  })

  it("a fatura seguinte só marca a parcela que chegou como paga", async () => {
    const { tx, parcelamentos } = bancoFalso()
    await sincronizarParcelamentos(tx, { ...base, lancamentos: [amazon(10, "2026-09")] })
    await sincronizarParcelamentos(tx, { ...base, lancamentos: [amazon(11, "2026-10")] })
    assert.equal(parcelamentos.length, 1)
    assert.equal(parcelamentos[0].parcelasPagas, 11)
    assert.deepEqual(parcelamentos[0].parcelas.filter((p) => !p.paga).map((p) => p.numero), [12])
  })

  it("acha o parcelamento cadastrado à mão com outro nome pelo valor da parcela", async () => {
    const manual: ParcelamentoFalso = {
      id: "manual",
      larId: "lar",
      contaId: "visa",
      estabelecimento: "Fone de ouvido",
      parcelaCentavos: 16_870,
      parcelasTotal: 12,
      parcelasPagas: 0,
      dataCompra: new Date("2025-11-04T15:00:00Z"),
      primeiraCompetencia: "2025-12",
      valorTotalCentavos: 202_428,
      parcelas: Array.from({ length: 12 }, (_, i) => ({ numero: i + 1, competencia: "", valorCentavos: 16_869, paga: false })),
    }
    const { tx, parcelamentos } = bancoFalso([manual])
    await sincronizarParcelamentos(tx, { ...base, lancamentos: [amazon(10, "2026-09")] })
    assert.equal(parcelamentos.length, 1)
    assert.equal(manual.parcelasPagas, 10)
  })

  it("última parcela sem parcelamento anterior não cria nada", async () => {
    const { tx, parcelamentos } = bancoFalso()
    await sincronizarParcelamentos(tx, { ...base, lancamentos: [amazon(12, "2026-11")] })
    assert.equal(parcelamentos.length, 0)
  })

  it("a prévia mostra quanto cada mês à frente já tem comprometido", () => {
    const futuras = projetarParcelasFuturas(
      [
        { tipo: "DESPESA", valorCentavos: 16_869, parcelaAtual: 10, parcelasTotal: 12 },
        { tipo: "DESPESA", valorCentavos: 87_479, parcelaAtual: 1, parcelasTotal: 12 },
        { tipo: "DESPESA", valorCentavos: 2_029, parcelaAtual: 4, parcelasTotal: 4 },
        { tipo: "DESPESA", valorCentavos: 5_000 },
      ],
      "2026-09",
    )
    assert.equal(futuras.compras, 2)
    assert.equal(futuras.totalCentavos, 2 * 16_869 + 11 * 87_479)
    assert.deepEqual(futuras.porMes.slice(0, 3), [
      { competencia: "2026-10", totalCentavos: 16_869 + 87_479 },
      { competencia: "2026-11", totalCentavos: 16_869 + 87_479 },
      { competencia: "2026-12", totalCentavos: 87_479 },
    ])
  })

  it("sem o vencimento da fatura, não chuta o mês", () => {
    const futuras = projetarParcelasFuturas([{ tipo: "DESPESA", valorCentavos: 100, parcelaAtual: 1, parcelasTotal: 3 }])
    assert.equal(futuras.totalCentavos, 200)
    assert.deepEqual(futuras.porMes, [])
  })
})
