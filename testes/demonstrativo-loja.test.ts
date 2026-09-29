import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { demonstrativoDaLoja, indicadoresDaLoja, vendasAcumuladas } from "@/lib/loja/demonstrativo"

describe("demonstrativo da loja", () => {
  it("lucro é receita líquida menos CMV menos despesa", () => {
    const demonstrativo = demonstrativoDaLoja({
      receitaLiquidaCentavos: 100000,
      saidasDeEstoque: [{ quantidade: 10, custoUnitarioCentavos: 3000 }],
      despesasPagasCentavos: [15000, 5000],
    })

    assert.equal(demonstrativo.cmvCentavos, 30000)
    assert.equal(demonstrativo.despesasCentavos, 20000)
    assert.equal(demonstrativo.lucroCentavos, 100000 - 30000 - 20000)
  })

  it("saída sem custo conhecido não vira CMV inventado — conta à parte", () => {
    const demonstrativo = demonstrativoDaLoja({
      receitaLiquidaCentavos: 50000,
      saidasDeEstoque: [
        { quantidade: 5, custoUnitarioCentavos: 1000 },
        { quantidade: 3, custoUnitarioCentavos: null },
      ],
      despesasPagasCentavos: [],
    })

    assert.equal(demonstrativo.cmvCentavos, 5000)
    assert.equal(demonstrativo.pecasSemCusto, 3)
  })

  it("sem venda, sem custo e sem despesa — demonstrativo zerado, não null nem NaN", () => {
    const demonstrativo = demonstrativoDaLoja({
      receitaLiquidaCentavos: 0,
      saidasDeEstoque: [],
      despesasPagasCentavos: [],
    })

    assert.equal(demonstrativo.lucroCentavos, 0)
    assert.equal(demonstrativo.pecasSemCusto, 0)
  })

  it("despesa maior que a receita dá lucro negativo, sem travar", () => {
    const demonstrativo = demonstrativoDaLoja({
      receitaLiquidaCentavos: 10000,
      saidasDeEstoque: [],
      despesasPagasCentavos: [50000],
    })

    assert.equal(demonstrativo.lucroCentavos, -40000)
  })
})

describe("indicadores da loja", () => {
  const venda = (total: number, forma = "PIX", taxaBps = 0) => ({
    totalCentavos: total,
    cancelada: false,
    pagamentos: [{ forma, taxaBps, valorCentavos: total, valorLiquidoCentavos: total - Math.round((total * taxaBps) / 10_000) }],
  })

  it("pagamento ao fornecedor não entra como despesa: o custo já vem pelas peças vendidas", () => {
    const indicadores = indicadoresDaLoja({
      vendas: [venda(100_000)],
      saidasDeEstoque: [{ quantidade: 10, custoUnitarioCentavos: 4_000 }],
      contasPagas: [
        { descricao: "Distribuidora", categoria: "FORNECEDOR", valorCentavos: 40_000 },
        { descricao: "Aluguel", categoria: "ALUGUEL", valorCentavos: 30_000 },
      ],
    })
    assert.equal(indicadores.despesasCentavos, 30_000)
    assert.equal(indicadores.lucroCentavos, 100_000 - 40_000 - 30_000)
    assert.deepEqual(indicadores.maiorConta, { descricao: "Aluguel", valorCentavos: 30_000 })
  })

  it("empate: contas divididas pelo que sobra de cada venda", () => {
    // sobra 60% (R$ 1.000 vendidos, R$ 400 de peças); R$ 300 de contas → vender R$ 500
    const indicadores = indicadoresDaLoja({
      vendas: [venda(60_000), venda(40_000)],
      saidasDeEstoque: [{ quantidade: 4, custoUnitarioCentavos: 10_000 }],
      contasPagas: [{ descricao: "Aluguel", categoria: "ALUGUEL", valorCentavos: 30_000 }],
    })
    assert.equal(indicadores.sobraBps, 6_000)
    assert.equal(indicadores.empateCentavos, 50_000)
    assert.equal(indicadores.ticketMedioCentavos, 50_000)
  })

  it("sem sobra não existe empate, e não inventa um número", () => {
    const indicadores = indicadoresDaLoja({
      vendas: [venda(10_000)],
      saidasDeEstoque: [{ quantidade: 1, custoUnitarioCentavos: 12_000 }],
      contasPagas: [{ descricao: "Aluguel", categoria: "ALUGUEL", valorCentavos: 5_000 }],
    })
    assert.equal(indicadores.empateCentavos, null)
    const semVenda = indicadoresDaLoja({ vendas: [], saidasDeEstoque: [], contasPagas: [] })
    assert.equal(semVenda.ticketMedioCentavos, null)
    assert.equal(semVenda.sobraBps, null)
  })

  it("conta o cartão gravado sem taxa, que deixou o líquido igual ao bruto", () => {
    const indicadores = indicadoresDaLoja({
      vendas: [venda(10_000, "DEBITO"), venda(10_000, "CREDITO_VISTA", 349), venda(10_000, "PIX")],
      saidasDeEstoque: [],
      contasPagas: [],
    })
    assert.equal(indicadores.cartaoSemTaxa, 1)
    assert.equal(indicadores.taxasCentavos, 349)
  })

  it("acumula as vendas por dia, com os dias sem venda repetindo o total", () => {
    const dias = ["2026-09-26", "2026-09-27", "2026-09-28"]
    assert.deepEqual(vendasAcumuladas([{ dia: "2026-09-26", totalCentavos: 100 }, { dia: "2026-09-28", totalCentavos: 50 }, { dia: "2026-09-26", totalCentavos: 10 }], dias), [110, 110, 160])
  })
})
