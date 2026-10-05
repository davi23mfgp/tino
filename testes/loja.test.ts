import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  calcularPagamento,
  conferirVenda,
  descontarTroco,
  dividirFaturamentoMei,
  parcelasDoRecebimento,
  somarMeses,
  previsaoDeRecebimento,
  resumoDoCaixa,
  taxaEmCentavos,
  totalDaVenda,
  totalDoItem,
} from "@/lib/loja/venda"
import type { RegraDeRecebimento } from "@/lib/loja/venda"

const REGRAS: RegraDeRecebimento[] = [
  { forma: "DINHEIRO", taxaBps: 0, prazoDias: 0 },
  { forma: "PIX", taxaBps: 99, prazoDias: 0 },
  { forma: "DEBITO", taxaBps: 199, prazoDias: 1 },
  { forma: "CREDITO_VISTA", taxaBps: 349, prazoDias: 30 },
  { forma: "CREDITO_PARCELADO", taxaBps: 499, prazoDias: 30 },
  { forma: "FIADO", taxaBps: 0, prazoDias: 0 },
]

const VENDIDO_EM = new Date("2026-08-30T14:00:00.000Z")

describe("total da venda", () => {
  it("multiplica quantidade por preço", () => {
    assert.equal(totalDoItem({ descricao: "Camiseta", quantidade: 3, precoUnitarioCentavos: 4990 }), 14970)
  })

  it("ignora quantidade fracionada e negativa", () => {
    // Loja de balcão vende peça. Meia camiseta não existe, e quantidade
    // negativa viraria venda que devolve dinheiro sem ninguém pedir.
    assert.equal(totalDoItem({ descricao: "Boné", quantidade: 2.7, precoUnitarioCentavos: 1000 }), 2000)
    assert.equal(totalDoItem({ descricao: "Boné", quantidade: -1, precoUnitarioCentavos: 1000 }), 0)
  })

  it("desconta em centavos e nunca fica negativo", () => {
    const itens = [{ descricao: "Meia", quantidade: 2, precoUnitarioCentavos: 1500 }]
    assert.equal(totalDaVenda(itens, 500), 2500)
    assert.equal(totalDaVenda(itens, 999999), 0)
  })
})

describe("faturamento misto do MEI", () => {
  it("separa comércio e serviço após desconto sem perder centavos", () => {
    const itens = [
      { descricao: "Material", quantidade: 1, precoUnitarioCentavos: 3000 },
      { descricao: "Instalação", quantidade: 1, precoUnitarioCentavos: 7000, servicoId: "servico" },
    ]
    assert.deepEqual(dividirFaturamentoMei(itens, totalDaVenda(itens, 999)), { comercioCentavos: 2700, servicosCentavos: 6301 })
  })

  it("trata venda só de serviço e só de produto", () => {
    assert.deepEqual(dividirFaturamentoMei([{ descricao: "Corte", quantidade: 1, precoUnitarioCentavos: 5000, servicoId: "corte" }], 5000), { comercioCentavos: 0, servicosCentavos: 5000 })
    assert.deepEqual(dividirFaturamentoMei([{ descricao: "Pente", quantidade: 1, precoUnitarioCentavos: 1000 }], 1000), { comercioCentavos: 1000, servicosCentavos: 0 })
  })

  it("mão de obra avulsa de ordem de serviço conta como serviço", () => {
    const itens = [{ descricao: "Troca de tela (iPhone 11)", quantidade: 1, precoUnitarioCentavos: 9000, servico: true }, { descricao: "Película", quantidade: 1, precoUnitarioCentavos: 3000 }]
    assert.deepEqual(dividirFaturamentoMei(itens, totalDaVenda(itens)), { comercioCentavos: 3000, servicosCentavos: 9000 })
  })
})

describe("taxa da maquininha", () => {
  it("aplica pontos-base e arredonda para o centavo", () => {
    // 3,49% de R$ 100,00 = R$ 3,49.
    assert.equal(taxaEmCentavos(10000, 349), 349)
    // 3,49% de R$ 37,90 = R$ 1,3227 -> R$ 1,32.
    assert.equal(taxaEmCentavos(3790, 349), 132)
  })

  it("dinheiro não perde nada", () => {
    assert.equal(taxaEmCentavos(10000, 0), 0)
  })
})

describe("pagamento", () => {
  it("crédito à vista cai depois e vem menor", () => {
    const pago = calcularPagamento({ forma: "CREDITO_VISTA", valorCentavos: 10000 }, REGRAS, VENDIDO_EM)

    assert.equal(pago.taxaCentavos, 349)
    assert.equal(pago.valorLiquidoCentavos, 9651)
    assert.equal(pago.previsaoRecebimentoEm.toISOString().slice(0, 10), "2026-09-29")
  })

  it("dinheiro cai no mesmo dia e inteiro", () => {
    const pago = calcularPagamento({ forma: "DINHEIRO", valorCentavos: 10000 }, REGRAS, VENDIDO_EM)

    assert.equal(pago.valorLiquidoCentavos, 10000)
    assert.equal(pago.previsaoRecebimentoEm.toISOString().slice(0, 10), "2026-08-30")
  })

  it("forma sem regra cadastrada não inventa taxa", () => {
    // Sem o contrato da maquininha na mão, qualquer taxa seria chute — e chute
    // exibido como fato é o pior defeito que esta base já teve.
    const pago = calcularPagamento({ forma: "CREDITO_VISTA", valorCentavos: 10000 }, [], VENDIDO_EM)

    assert.equal(pago.taxaBps, 0)
    assert.equal(pago.valorLiquidoCentavos, 10000)
  })

  it("fiado não é dinheiro que entrou", () => {
    const pago = calcularPagamento({ forma: "FIADO", valorCentavos: 5000 }, REGRAS, VENDIDO_EM)
    const caixa = resumoDoCaixa({
      aberturaCentavos: 0,
      vendas: [{ formas: [{ forma: "FIADO", valorCentavos: 5000 }] }],
      sangriasCentavos: [],
      fechamentoInformadoCentavos: 0,
    })

    assert.equal(pago.valorLiquidoCentavos, 5000)
    // Vendeu, mas não há nada na gaveta para conferir.
    assert.equal(caixa.emDinheiroCentavos, 0)
    assert.equal(caixa.diferencaCentavos, 0)
  })
})

describe("parcelas do recebimento", () => {
  it("a soma das parcelas é o líquido exato", () => {
    const pago = calcularPagamento(
      { forma: "CREDITO_PARCELADO", valorCentavos: 10000, parcelas: 3 },
      REGRAS,
      VENDIDO_EM,
    )
    const parcelas = parcelasDoRecebimento(pago)

    assert.equal(parcelas.length, 3)
    assert.equal(
      parcelas.reduce((soma, parcela) => soma + parcela.valorCentavos, 0),
      pago.valorLiquidoCentavos,
    )
  })

  it("uma parcela por mês, a partir do prazo da forma", () => {
    const pago = calcularPagamento(
      { forma: "CREDITO_PARCELADO", valorCentavos: 30000, parcelas: 3 },
      REGRAS,
      VENDIDO_EM,
    )
    const parcelas = parcelasDoRecebimento(pago)

    assert.equal(parcelas[0].previsaoEm.toISOString().slice(0, 10), "2026-09-29")
    assert.equal(parcelas[1].previsaoEm.toISOString().slice(0, 10), "2026-10-29")
    assert.equal(parcelas[2].previsaoEm.toISOString().slice(0, 10), "2026-11-29")
  })
})

describe("soma de meses na parcela", () => {
  it("não estoura para o mês seguinte", () => {
    // setMonth em 31/01 + 1 devolve 03/03, porque fevereiro não tem dia 31 e o
    // JavaScript transborda. Numa venda parcelada no dia 31 isso jogaria a
    // parcela um mês inteiro fora do lugar.
    const parcela = somarMeses(new Date("2026-01-31T12:00:00.000Z"), 1)
    assert.equal(parcela.toISOString().slice(0, 10), "2026-02-28")
  })

  it("respeita ano bissexto", () => {
    const parcela = somarMeses(new Date("2028-01-31T12:00:00.000Z"), 1)
    assert.equal(parcela.toISOString().slice(0, 10), "2028-02-29")
  })

  it("dia que existe nos dois meses fica igual", () => {
    const parcela = somarMeses(new Date("2026-01-15T12:00:00.000Z"), 2)
    assert.equal(parcela.toISOString().slice(0, 10), "2026-03-15")
  })

  it("atravessa a virada do ano", () => {
    const parcela = somarMeses(new Date("2026-11-30T12:00:00.000Z"), 3)
    assert.equal(parcela.toISOString().slice(0, 10), "2027-02-28")
  })
})

describe("conferência da venda", () => {
  it("aponta o que falta", () => {
    const conferencia = conferirVenda(10000, [{ forma: "PIX", valorCentavos: 4000 }])

    assert.equal(conferencia.faltaCentavos, 6000)
    assert.equal(conferencia.fechada, false)
  })

  it("aceita pagamento dividido em duas formas", () => {
    const conferencia = conferirVenda(10000, [
      { forma: "PIX", valorCentavos: 4000 },
      { forma: "DINHEIRO", valorCentavos: 6000 },
    ])

    assert.equal(conferencia.faltaCentavos, 0)
    assert.equal(conferencia.trocoCentavos, 0)
    assert.equal(conferencia.fechada, true)
  })

  it("dá troco só do que veio em dinheiro", () => {
    const conferencia = conferirVenda(9500, [{ forma: "DINHEIRO", valorCentavos: 10000 }])
    assert.equal(conferencia.trocoCentavos, 500)
  })

  it("sobra no cartão não vira troco", () => {
    // Passar R$ 100 no cartão numa venda de R$ 95 é erro de digitação. Tratar
    // como troco faria a loja devolver em espécie um dinheiro que não entrou.
    const conferencia = conferirVenda(9500, [{ forma: "CREDITO_VISTA", valorCentavos: 10000 }])
    assert.equal(conferencia.trocoCentavos, 0)
  })
})

describe("troco não é receita", () => {
  it("o dinheiro gravado é o que ficou na loja, não o que veio na mão", () => {
    // Antes disso, uma venda de R$ 35 paga com R$ 50 gravava R$ 50, e o resumo
    // mostrava líquido maior que bruto com taxa negativa.
    const ajustados = descontarTroco(3500, [{ forma: "DINHEIRO", valorCentavos: 5000 }])
    assert.equal(ajustados[0].valorCentavos, 3500)
  })

  it("pagamento exato não muda", () => {
    const ajustados = descontarTroco(3500, [{ forma: "DINHEIRO", valorCentavos: 3500 }])
    assert.equal(ajustados[0].valorCentavos, 3500)
  })

  it("o corte sai do dinheiro, não do cartão", () => {
    const ajustados = descontarTroco(10000, [
      { forma: "CREDITO_VISTA", valorCentavos: 7000 },
      { forma: "DINHEIRO", valorCentavos: 5000 },
    ])

    assert.equal(ajustados[0].valorCentavos, 7000)
    assert.equal(ajustados[1].valorCentavos, 3000)
  })

  it("sobra só no cartão fica como veio, para a conferência recusar", () => {
    const ajustados = descontarTroco(9500, [{ forma: "CREDITO_VISTA", valorCentavos: 10000 }])
    assert.equal(ajustados[0].valorCentavos, 10000)
  })

  it("a soma dos pagamentos passa a ser o total da venda", () => {
    const ajustados = descontarTroco(3500, [{ forma: "DINHEIRO", valorCentavos: 10000 }])
    assert.equal(
      ajustados.reduce((soma, pagamento) => soma + pagamento.valorCentavos, 0),
      3500,
    )
  })
})

describe("fechamento de caixa", () => {
  const vendas = [
    { formas: [{ forma: "DINHEIRO" as const, valorCentavos: 5000 }] },
    { formas: [{ forma: "CREDITO_VISTA" as const, valorCentavos: 12000 }] },
    {
      formas: [
        { forma: "DINHEIRO" as const, valorCentavos: 3000 },
        { forma: "PIX" as const, valorCentavos: 2000 },
      ],
    },
  ]

  it("só o dinheiro conta na gaveta", () => {
    const resumo = resumoDoCaixa({ aberturaCentavos: 10000, vendas, sangriasCentavos: [] })

    assert.equal(resumo.vendidoCentavos, 22000)
    assert.equal(resumo.emDinheiroCentavos, 8000)
    assert.equal(resumo.esperadoNaGavetaCentavos, 18000)
  })

  it("sangria sai do esperado", () => {
    const resumo = resumoDoCaixa({ aberturaCentavos: 10000, vendas, sangriasCentavos: [5000] })
    assert.equal(resumo.esperadoNaGavetaCentavos, 13000)
  })

  it("guarda a falta como falta", () => {
    // Ajustar o informado para bater com o esperado apagaria exatamente o que o
    // dono precisa ver.
    const resumo = resumoDoCaixa({
      aberturaCentavos: 10000,
      vendas,
      sangriasCentavos: [],
      fechamentoInformadoCentavos: 17950,
    })

    assert.equal(resumo.diferencaCentavos, -50)
  })

  it("sem contagem informada não inventa diferença", () => {
    const resumo = resumoDoCaixa({ aberturaCentavos: 10000, vendas, sangriasCentavos: [] })
    assert.equal(resumo.diferencaCentavos, null)
  })
})

describe("previsão de recebimento", () => {
  it("atravessa a virada do mês", () => {
    assert.equal(
      previsaoDeRecebimento(new Date("2026-01-31T12:00:00.000Z"), 30).toISOString().slice(0, 10),
      "2026-03-02",
    )
  })
})
