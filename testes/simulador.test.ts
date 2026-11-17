import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { simular, comparar, type CenarioBase } from "@/lib/tino/simulador"

const base = (parcial: Partial<CenarioBase> = {}): CenarioBase => ({
  competenciaInicial: "2026-08",
  saldoInicialCentavos: 500000,
  rendaMensalCentavos: 700000,
  custoDeVidaMensalCentavos: 450000,
  parcelasPorCompetencia: {},
  dividas: [],
  ...parcial,
})

describe("simular — o básico", () => {
  it("acumula a sobra mês a mês", () => {
    const resultado = simular(base(), [], 3)
    assert.equal(resultado.meses.length, 3)
    // 700.000 de renda menos 450.000 de custo = 250.000 por mês.
    assert.equal(resultado.meses[0].saldoAcumuladoCentavos, 750000)
    assert.equal(resultado.meses[2].saldoAcumuladoCentavos, 1_250_000)
  })

  it("desconta as parcelas já contratadas do mês certo", () => {
    const resultado = simular(base({ parcelasPorCompetencia: { "2026-09": 100000 } }), [], 3)
    assert.equal(resultado.meses[0].parcelasCentavos, 0)
    assert.equal(resultado.meses[1].parcelasCentavos, 100000)
    assert.equal(resultado.meses[1].resultadoCentavos, 150000)
  })

  it("marca o primeiro mês negativo", () => {
    const resultado = simular(base({ saldoInicialCentavos: 0, custoDeVidaMensalCentavos: 900000 }), [], 3)
    assert.equal(resultado.primeiroMesNegativo, "2026-08")
    assert.ok(resultado.menorSaldoCentavos < 0)
  })
})

describe("simular — cheque especial", () => {
  it("cobra juros sobre o saldo negativo", () => {
    const resultado = simular(
      base({ saldoInicialCentavos: -100000, rendaMensalCentavos: 0, custoDeVidaMensalCentavos: 0, jurosChequeEspecialBps: 800 }),
      [],
      1,
    )
    // 8% sobre 100.000 = 8.000 de juros no mês.
    assert.equal(resultado.meses[0].jurosCentavos, 8000)
    assert.equal(resultado.meses[0].saldoAcumuladoCentavos, -108000)
  })

  it("a entrada de dinheiro abate o negativo sozinha", () => {
    // É o que o banco faz: qualquer crédito na conta reduz o cheque especial.
    // Modelar como dívida à parte deixava a sobra "parada" ao lado de uma
    // dívida a 8% ao mês, o oposto da realidade.
    const resultado = simular(
      base({ saldoInicialCentavos: -100000, rendaMensalCentavos: 700000, custoDeVidaMensalCentavos: 450000, jurosChequeEspecialBps: 800 }),
      [],
      2,
    )
    assert.ok(resultado.meses[0].saldoAcumuladoCentavos > 0, "no primeiro mês já sai do vermelho")
    assert.equal(resultado.meses[1].jurosCentavos, 0, "saldo positivo não cobra juros")
  })

  it("não cobra juros de saldo positivo", () => {
    const resultado = simular(base({ jurosChequeEspecialBps: 800 }), [], 3)
    assert.equal(resultado.totalJurosCentavos, 0)
  })
})

describe("simular — hipóteses", () => {
  it("corte de gasto aumenta a sobra", () => {
    const comCorte = simular(base(), [{ tipo: "CUSTO", rotulo: "Cortar", deltaCentavos: -50000 }], 6)
    const semCorte = simular(base(), [], 6)
    assert.equal(comCorte.saldoFinalCentavos - semCorte.saldoFinalCentavos, 300000, "50.000 × 6 meses")
  })

  it("aumento de renda só vale a partir da competência indicada", () => {
    const resultado = simular(
      base(),
      [{ tipo: "RENDA", rotulo: "Aumento", deltaCentavos: 100000, aPartirDe: "2026-10" }],
      3,
    )
    assert.equal(resultado.meses[0].receitasCentavos, 700000)
    assert.equal(resultado.meses[1].receitasCentavos, 700000)
    assert.equal(resultado.meses[2].receitasCentavos, 800000)
  })

  it("compra parcelada distribui o valor pelos meses", () => {
    const resultado = simular(
      base(),
      [
        {
          tipo: "NOVA_COMPRA_PARCELADA",
          rotulo: "Geladeira",
          valorTotalCentavos: 300000,
          parcelas: 3,
          competenciaInicial: "2026-08",
        },
      ],
      4,
    )
    assert.equal(resultado.meses[0].parcelasCentavos, 100000)
    assert.equal(resultado.meses[2].parcelasCentavos, 100000)
    assert.equal(resultado.meses[3].parcelasCentavos, 0, "acabou depois de três parcelas")
  })

  it("empréstimo entra como dinheiro no mês e parcela a partir do mês seguinte", () => {
    const resultado = simular(
      base(),
      [
        {
          tipo: "NOVO_EMPRESTIMO",
          rotulo: "Crédito",
          valorCentavos: 1_000_000,
          parcelas: 12,
          jurosMensalBps: 200,
          custosExtrasCentavos: 50000,
          competencia: "2026-08",
        },
      ],
      3,
    )
    // Recebe líquido dos custos.
    assert.equal(resultado.meses[0].receitasCentavos, 700000 + 950000)
    assert.equal(resultado.meses[0].parcelasCentavos, 0, "a primeira parcela é no mês seguinte")
    assert.ok(resultado.meses[1].parcelasCentavos > 0)
  })

  it("gasto único atinge só a competência escolhida", () => {
    const resultado = simular(
      base(),
      [{ tipo: "GASTO_UNICO", rotulo: "IPVA", valorCentavos: 200000, competencia: "2026-09" }],
      3,
    )
    assert.equal(resultado.meses[0].custoDeVidaCentavos, 450000)
    assert.equal(resultado.meses[1].custoDeVidaCentavos, 650000)
    assert.equal(resultado.meses[2].custoDeVidaCentavos, 450000)
  })

  it("pagamento extra ataca a dívida de maior juro", () => {
    const resultado = simular(
      base({
        dividas: [
          { id: "barata", nome: "A", saldoCentavos: 100000, jurosMensalBps: 100, parcelaCentavos: 0 },
          { id: "cara", nome: "B", saldoCentavos: 100000, jurosMensalBps: 1000, parcelaCentavos: 0 },
        ],
      }),
      [{ tipo: "PAGAMENTO_EXTRA", rotulo: "Extra", valorMensalCentavos: 60000 }],
      1,
    )
    assert.equal(resultado.meses[0].pagamentoExtraCentavos, 60000)
    // A cara tinha 100.000 + 10% de juros = 110.000; sobra 50.000.
    assert.equal(resultado.meses[0].dividaRestanteCentavos, 50000 + 101000)
  })

  it("quitação à vista zera a dívida escolhida", () => {
    const resultado = simular(
      base({ dividas: [{ id: "x", nome: "X", saldoCentavos: 200000, jurosMensalBps: 0, parcelaCentavos: 0 }] }),
      [{ tipo: "QUITAR_DIVIDA", rotulo: "Quitar", dividaId: "x", competencia: "2026-09" }],
      3,
    )
    assert.ok(resultado.meses[0].dividaRestanteCentavos > 0)
    assert.equal(resultado.meses[1].dividaRestanteCentavos, 0)
    assert.equal(resultado.mesQuitacao, "2026-09")
  })
})

describe("comparar", () => {
  it("mede a diferença entre agir e não agir", () => {
    const comparacao = comparar(base(), [{ tipo: "CUSTO", rotulo: "Cortar", deltaCentavos: -50000 }], 12)
    assert.equal(comparacao.delta.saldoFinalCentavos, 600000)
    assert.ok(comparacao.veredito.length > 0)
    assert.match(comparacao.veredito[0], /mais rico/)
  })

  it("acusa quando a hipótese empobrece", () => {
    const comparacao = comparar(
      base(),
      [
        {
          tipo: "NOVO_EMPRESTIMO",
          rotulo: "Crédito caro",
          valorCentavos: 1_000_000,
          parcelas: 24,
          jurosMensalBps: 500,
          competencia: "2026-08",
        },
      ],
      24,
    )
    assert.ok(comparacao.delta.patrimonioFinalCentavos < 0, "empréstimo caro deixa mais pobre no fim")
    assert.match(comparacao.veredito[0], /mais pobre/)
  })

  it("reconhece quando a mudança evita o vermelho", () => {
    const apertado = base({ saldoInicialCentavos: 0, custoDeVidaMensalCentavos: 750000 })
    const comparacao = comparar(apertado, [{ tipo: "CUSTO", rotulo: "Cortar", deltaCentavos: -100000 }], 6)
    assert.equal(comparacao.delta.mudouRiscoNegativo, "EVITA")
    assert.ok(comparacao.veredito.some((frase) => /deixa de ficar negativo/.test(frase)))
  })

  it("o cenário base não é afetado pelas hipóteses", () => {
    const comparacao = comparar(base(), [{ tipo: "CUSTO", rotulo: "Cortar", deltaCentavos: -50000 }], 6)
    const sozinho = simular(base(), [], 6)
    assert.equal(comparacao.base.saldoFinalCentavos, sozinho.saldoFinalCentavos)
  })

  it("patrimônio é saldo menos dívida", () => {
    const cenario = base({
      dividas: [{ id: "x", nome: "X", saldoCentavos: 300000, jurosMensalBps: 0, parcelaCentavos: 0 }],
    })
    const resultado = simular(cenario, [], 1)
    assert.equal(
      resultado.meses[0].patrimonioLiquidoCentavos,
      resultado.meses[0].saldoAcumuladoCentavos - resultado.meses[0].dividaRestanteCentavos,
    )
  })
})

describe("simular — com os meses da Projeção", () => {
  it("usa entradas e saídas previstas de cada mês, sem somar as parcelas de novo", () => {
    // Agosto: fatura de 300 mil vence; setembro: só 100 mil. Depois, a média.
    const resultado = simular(base({
      parcelasPorCompetencia: { "2026-08": 90000 },
      fluxoPorCompetencia: {
        "2026-08": { entraCentavos: 700000, saiCentavos: 800000 },
        "2026-09": { entraCentavos: 700000, saiCentavos: 100000 },
      },
    }), [], 3)
    // 500.000 − 100.000 = 400.000; + 600.000 = 1.000.000; + 250.000 (média) = 1.250.000.
    assert.deepEqual(resultado.meses.map((mes) => mes.saldoAcumuladoCentavos), [400000, 1000000, 1250000])
  })
})
