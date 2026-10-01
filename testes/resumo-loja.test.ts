import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { aCairPorDia, resumirLoja } from "@/lib/loja/resumo"
import type { VendaDoResumo } from "@/lib/loja/resumo"

const HOJE = new Date("2026-09-01T12:00:00.000Z")
const emDias = (quantos: number) => new Date(HOJE.getTime() + quantos * 86_400_000)

const venda = (
  total: number,
  pagamentos: { forma: string; valor: number; liquido: number; cai: number; recebido?: boolean }[],
  opcoes: { cancelada?: boolean; diasAtras?: number } = {},
): VendaDoResumo => ({
  criadoEm: emDias(-(opcoes.diasAtras ?? 0)),
  totalCentavos: total,
  cancelada: opcoes.cancelada ?? false,
  pagamentos: pagamentos.map((pagamento) => ({
    forma: pagamento.forma,
    valorCentavos: pagamento.valor,
    valorLiquidoCentavos: pagamento.liquido,
    previsaoRecebimentoEm: emDias(pagamento.cai),
    recebidoEm: pagamento.recebido ? HOJE : null,
  })),
})

describe("resumo da loja", () => {
  it("separa o bruto do líquido e mostra a taxa", () => {
    // A maquininha mostra R$ 100; o extrato mostra R$ 96,51 trinta dias depois.
    const resumo = resumirLoja([venda(10000, [{ forma: "CREDITO_VISTA", valor: 10000, liquido: 9651, cai: 30 }])])

    assert.equal(resumo.brutoCentavos, 10000)
    assert.equal(resumo.liquidoCentavos, 9651)
    assert.equal(resumo.taxasCentavos, 349)
  })

  it("venda cancelada não entra em nada", () => {
    // Deixá-la no bruto faria o limite do MEI subir por uma venda desfeita.
    const resumo = resumirLoja([
      venda(10000, [{ forma: "PIX", valor: 10000, liquido: 9901, cai: 0, recebido: true }]),
      venda(50000, [{ forma: "PIX", valor: 50000, liquido: 49505, cai: 0 }], { cancelada: true }),
    ])

    assert.equal(resumo.vendas, 1)
    assert.equal(resumo.brutoCentavos, 10000)
  })

  it("o que já caiu não se mistura com o que vai cair", () => {
    const resumo = resumirLoja([
      venda(10000, [{ forma: "DINHEIRO", valor: 10000, liquido: 10000, cai: 0, recebido: true }]),
      venda(20000, [{ forma: "CREDITO_VISTA", valor: 20000, liquido: 19302, cai: 30 }]),
    ], HOJE)

    assert.equal(resumo.recebidoCentavos, 10000)
    assert.equal(resumo.aReceberCentavos, 19302)
  })

  it("dinheiro está na mão na hora, mesmo sem marca de recebido", () => {
    // Nada grava `recebidoEm` numa venda em dinheiro: sem a regra, ela ficava
    // para sempre em "ainda vai cair".
    const resumo = resumirLoja([venda(3500, [{ forma: "DINHEIRO", valor: 3500, liquido: 3500, cai: 0 }])], HOJE)

    assert.equal(resumo.recebidoCentavos, 3500)
    assert.equal(resumo.aReceberCentavos, 0)
  })

  it("cartão com a data prevista já passada saiu do que vai cair", () => {
    const resumo = resumirLoja(
      [
        venda(20000, [{ forma: "DEBITO", valor: 20000, liquido: 19602, cai: -5 }], { diasAtras: 6 }),
        venda(10000, [{ forma: "CREDITO_VISTA", valor: 10000, liquido: 9651, cai: 20 }], { diasAtras: 10 }),
      ],
      HOJE,
    )

    assert.equal(resumo.recebidoCentavos, 19602)
    assert.equal(resumo.aReceberCentavos, 9651)
  })

  it("fiado fica fora do que vai cair", () => {
    // Ele não tem data. Somá-lo ao 'a receber' viraria dívida de cliente em
    // previsão de caixa — o erro que quebra loja pequena.
    const resumo = resumirLoja([venda(8000, [{ forma: "FIADO", valor: 8000, liquido: 8000, cai: 0 }])])

    assert.equal(resumo.fiadoCentavos, 8000)
    assert.equal(resumo.aReceberCentavos, 0)
  })

  it("fiado recebido vira dinheiro na conta", () => {
    const resumo = resumirLoja([
      venda(8000, [{ forma: "FIADO", valor: 8000, liquido: 8000, cai: 0, recebido: true }]),
    ])

    assert.equal(resumo.fiadoCentavos, 0)
    assert.equal(resumo.recebidoCentavos, 8000)
  })

  it("agrupa por forma, da que mais vende para a que menos", () => {
    const resumo = resumirLoja([
      venda(5000, [{ forma: "PIX", valor: 5000, liquido: 4951, cai: 0, recebido: true }]),
      venda(30000, [{ forma: "CREDITO_VISTA", valor: 30000, liquido: 28953, cai: 30 }]),
    ])

    assert.equal(resumo.porForma[0].forma, "CREDITO_VISTA")
    assert.equal(resumo.porForma[1].forma, "PIX")
  })

  it("uma venda paga em duas formas conta nas duas", () => {
    const resumo = resumirLoja([
      venda(10000, [
        { forma: "DINHEIRO", valor: 4000, liquido: 4000, cai: 0, recebido: true },
        { forma: "PIX", valor: 6000, liquido: 5941, cai: 0, recebido: true },
      ]),
    ])

    assert.equal(resumo.vendas, 1)
    assert.equal(resumo.porForma.length, 2)
    assert.equal(resumo.brutoCentavos, 10000)
  })
})

describe("o que cai na conta", () => {
  const vendas = [
    venda(10000, [{ forma: "CREDITO_VISTA", valor: 10000, liquido: 9651, cai: 30 }]),
    venda(20000, [{ forma: "DEBITO", valor: 20000, liquido: 19602, cai: 1 }]),
    venda(8000, [{ forma: "FIADO", valor: 8000, liquido: 8000, cai: 0 }]),
    venda(5000, [{ forma: "DINHEIRO", valor: 5000, liquido: 5000, cai: 0, recebido: true }]),
  ]

  it("agrupa por data de recebimento, não de venda", () => {
    const serie = aCairPorDia(vendas, 30, HOJE)

    assert.equal(serie.length, 2)
    assert.equal(serie[0].valorCentavos, 19602)
    assert.equal(serie[1].valorCentavos, 9651)
  })

  it("ignora o que já foi recebido e o fiado", () => {
    const serie = aCairPorDia(vendas, 30, HOJE)
    const total = serie.reduce((soma, dia) => soma + dia.valorCentavos, 0)

    assert.equal(total, 19602 + 9651)
  })

  it("dinheiro e o que já passou da data não aparecem como a cair", () => {
    const serie = aCairPorDia(
      [
        venda(3500, [{ forma: "DINHEIRO", valor: 3500, liquido: 3500, cai: 0 }]),
        venda(20000, [{ forma: "DEBITO", valor: 20000, liquido: 19602, cai: -2 }], { diasAtras: 3 }),
      ],
      30,
      HOJE,
    )
    assert.deepEqual(serie, [])
  })

  it("respeita a janela pedida", () => {
    const serie = aCairPorDia(vendas, 7, HOJE)
    assert.equal(serie.length, 1)
  })
})
