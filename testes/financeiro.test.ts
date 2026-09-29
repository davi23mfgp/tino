import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  parcelaPrice,
  tabelaPrice,
  taxaInternaMensalBps,
  simularEmprestimo,
  analisarEmprestimo,
  planejarQuitacao,
  compararEstrategias,
  ordenarDividas,
  valorFuturo,
  aporteNecessario,
  mesesParaMeta,
  projetarMeta,
  projetarAposentadoria,
  reservaIdeal,
  mesesDeFolga,
  avaliarMei,
  limiteProporcionalMei,
  situacaoDoDas,
  vencimentoDoDas,
  anualParaMensalBps,
} from "@/lib/financeiro"

describe("parcelaPrice", () => {
  it("calcula a parcela pela Tabela Price", () => {
    // R$ 10.000 em 12x a 2% a.m. = R$ 945,60 (valor de referência da fórmula).
    assert.equal(parcelaPrice(1_000_000, 200, 12), 94560)
  })

  it("com juro zero divide o valor em partes iguais", () => {
    assert.equal(parcelaPrice(120000, 0, 12), 10000)
  })

  it("devolve zero quando não há parcelas", () => {
    assert.equal(parcelaPrice(100000, 200, 0), 0)
  })
})

describe("tabelaPrice", () => {
  it("zera o saldo na última parcela", () => {
    const tabela = tabelaPrice(1_000_000, 250, 24)
    assert.equal(tabela.length, 24)
    assert.equal(tabela[23].saldoCentavos, 0, "a última parcela precisa quitar a dívida")
  })

  it("amortiza pouco no começo e muito no fim", () => {
    const tabela = tabelaPrice(1_000_000, 300, 12)
    assert.ok(
      tabela[0].amortizacaoCentavos < tabela[11].amortizacaoCentavos,
      "no começo a maior parte da parcela é juros",
    )
    assert.ok(tabela[0].jurosCentavos > tabela[11].jurosCentavos)
  })

  it("cada linha fecha: juros mais amortização é a prestação", () => {
    for (const linha of tabelaPrice(750000, 189, 18)) {
      assert.equal(linha.jurosCentavos + linha.amortizacaoCentavos, linha.prestacaoCentavos)
    }
  })

  it("o total pago cobre o principal", () => {
    const tabela = tabelaPrice(1_000_000, 250, 24)
    const total = tabela.reduce((soma, linha) => soma + linha.prestacaoCentavos, 0)
    assert.ok(total > 1_000_000, "com juros, paga-se mais que o emprestado")
  })
})

describe("taxaInternaMensalBps", () => {
  it("recupera a taxa de um fluxo Price sem custos extras", () => {
    const parcela = parcelaPrice(1_000_000, 250, 12)
    const fluxo = [1_000_000, ...Array.from({ length: 12 }, () => -parcela)]
    const taxa = taxaInternaMensalBps(fluxo)
    assert.ok(taxa !== null)
    // Tolerância de 5 pontos-base absorve o arredondamento em centavos.
    assert.ok(Math.abs((taxa as number) - 250) <= 5, `esperava ~250 bps, veio ${taxa}`)
  })

  it("devolve null quando não há troca de sinal no fluxo", () => {
    assert.equal(taxaInternaMensalBps([1000, 2000, 3000]), null)
  })

  it("converge em juro alto de rotativo", () => {
    const parcela = parcelaPrice(500000, 1400, 12)
    const taxa = taxaInternaMensalBps([500000, ...Array.from({ length: 12 }, () => -parcela)])
    assert.ok(taxa !== null && Math.abs((taxa as number) - 1400) <= 10)
  })
})

describe("simularEmprestimo", () => {
  it("o CET fica acima da taxa nominal quando há IOF e tarifa", () => {
    const resultado = simularEmprestimo({
      valorCentavos: 1_000_000,
      parcelas: 24,
      jurosMensalBps: 250,
      custosExtrasCentavos: 50000,
    })

    assert.ok(
      resultado.cetMensalBps > 250,
      `CET (${resultado.cetMensalBps}) precisa superar a taxa nominal quando há custos`,
    )
    assert.equal(resultado.liberadoCentavos, 950000, "o cliente recebe o valor menos os custos")
  })

  it("sem custos extras o CET bate com a taxa nominal", () => {
    const resultado = simularEmprestimo({ valorCentavos: 1_000_000, parcelas: 12, jurosMensalBps: 200 })
    assert.ok(Math.abs(resultado.cetMensalBps - 200) <= 5)
  })

  it("o CET anual é a composição do mensal", () => {
    const resultado = simularEmprestimo({ valorCentavos: 500000, parcelas: 12, jurosMensalBps: 200 })
    const esperado = (Math.pow(1 + resultado.cetMensalBps / 10_000, 12) - 1) * 10_000
    assert.ok(Math.abs(resultado.cetAnualBps - esperado) <= 5)
  })
})

describe("analisarEmprestimo", () => {
  const base = {
    valorCentavos: 1_000_000,
    parcelas: 24,
    rendaMensalCentavos: 500000,
    sobraMensalCentavos: 100000,
  }

  it("reprova quando a parcela come demais da renda", () => {
    const analise = analisarEmprestimo({
      ...base,
      jurosMensalBps: 800,
      rendaMensalCentavos: 200000,
      parcelasAtuaisCentavos: 50000,
    })
    assert.equal(analise.veredito, "EVITAR")
    assert.ok(analise.motivos.length > 0)
  })

  it("aprova crédito barato que cabe folgado", () => {
    const analise = analisarEmprestimo({
      valorCentavos: 300000,
      parcelas: 24,
      jurosMensalBps: 120,
      rendaMensalCentavos: 800000,
      sobraMensalCentavos: 200000,
    })
    assert.equal(analise.veredito, "APROVAR")
  })

  it("reconhece troca de dívida cara por barata", () => {
    const analise = analisarEmprestimo({
      ...base,
      jurosMensalBps: 200,
      // Já paga 8% ao mês: pegar a 2% para quitar aquilo é economia.
      maiorJurosAtualBps: 800,
    })
    assert.ok(
      analise.alternativas.some((texto) => /portabilidade/i.test(texto)),
      "deveria sugerir portabilidade",
    )
  })

  it("o comprometimento soma a parcela nova às dívidas atuais", () => {
    const analise = analisarEmprestimo({
      ...base,
      jurosMensalBps: 200,
      parcelasAtuaisCentavos: 100000,
    })
    const esperado = Math.round(((analise.parcelaCentavos + 100000) / base.rendaMensalCentavos) * 10_000)
    assert.equal(analise.comprometimentoBps, esperado)
  })
})

describe("planejarQuitacao", () => {
  const dividas = [
    { id: "cara", credor: "Rotativo", saldoDevedorCentavos: 200000, jurosMensalBps: 1400, parcelaCentavos: 20000 },
    { id: "barata", credor: "Consignado", saldoDevedorCentavos: 500000, jurosMensalBps: 180, parcelaCentavos: 30000 },
  ]

  it("quita tudo e registra a ordem", () => {
    const plano = planejarQuitacao(dividas, 50000, "AVALANCHE")
    assert.ok(plano.meses > 0 && plano.meses < 600)
    assert.equal(plano.quitacoes.length, 2)
    assert.equal(plano.serieSaldo[plano.serieSaldo.length - 1], 0)
  })

  it("avalanche ataca o juro mais alto primeiro", () => {
    const plano = planejarQuitacao(dividas, 50000, "AVALANCHE")
    assert.equal(plano.quitacoes[0].id, "cara")
  })

  it("bola de neve ataca o menor saldo primeiro", () => {
    const plano = planejarQuitacao(dividas, 50000, "BOLA_DE_NEVE")
    assert.equal(plano.quitacoes[0].id, "cara", "aqui a menor dívida também é a mais cara")

    // A parcela da dívida cara precisa cobrir o próprio juro (27.000/mês aqui),
    // senão ela nunca quita e a ordem de ataque deixa de ser observável — foi o
    // que aconteceu na primeira versão deste teste.
    const outras = [
      { id: "pequena", credor: "A", saldoDevedorCentavos: 50000, jurosMensalBps: 100, parcelaCentavos: 5000 },
      { id: "grande", credor: "B", saldoDevedorCentavos: 300000, jurosMensalBps: 900, parcelaCentavos: 40000 },
    ]
    assert.equal(planejarQuitacao(outras, 20000, "BOLA_DE_NEVE").quitacoes[0].id, "pequena")
    assert.equal(planejarQuitacao(outras, 20000, "AVALANCHE").quitacoes[0].id, "grande")
  })

  it("avalanche nunca paga mais juros que bola de neve", () => {
    const comparativo = compararEstrategias(
      [
        { id: "a", credor: "A", saldoDevedorCentavos: 80000, jurosMensalBps: 200, parcelaCentavos: 8000 },
        { id: "b", credor: "B", saldoDevedorCentavos: 400000, jurosMensalBps: 1200, parcelaCentavos: 25000 },
      ],
      30000,
    )
    assert.ok(comparativo.avalanche.totalJurosCentavos <= comparativo.bolaDeNeve.totalJurosCentavos)
    assert.ok(comparativo.economiaAvalancheCentavos >= 0)
  })

  it("não entra em laço infinito quando a parcela não cobre nem o juro", () => {
    const impossivel = [
      { id: "x", credor: "X", saldoDevedorCentavos: 1_000_000, jurosMensalBps: 1500, parcelaCentavos: 1000 },
    ]
    const plano = planejarQuitacao(impossivel, 0, "AVALANCHE")
    assert.ok(plano.meses < 600, "precisa parar em vez de projetar dívida eterna")
  })

  it("ordena por estratégia", () => {
    assert.equal(ordenarDividas(dividas, "AVALANCHE")[0].id, "cara")
    assert.equal(ordenarDividas(dividas, "BOLA_DE_NEVE")[0].id, "cara")
    assert.equal(ordenarDividas(dividas, "PROPORCIONAL")[0].id, "barata")
  })
})

describe("metas", () => {
  it("valor futuro com juro zero é saldo mais aportes", () => {
    assert.equal(
      valorFuturo({ saldoInicialCentavos: 100000, aporteMensalCentavos: 50000, meses: 10, rendimentoAnualBps: 0 }),
      600000,
    )
  })

  it("juro positivo faz o valor futuro superar a soma simples", () => {
    const comJuro = valorFuturo({
      saldoInicialCentavos: 100000,
      aporteMensalCentavos: 50000,
      meses: 24,
      rendimentoAnualBps: 1000,
    })
    assert.ok(comJuro > 100000 + 50000 * 24)
  })

  it("o aporte necessário realmente chega ao alvo", () => {
    const aporte = aporteNecessario({
      alvoCentavos: 1_800_000,
      saldoAtualCentavos: 260000,
      meses: 12,
      rendimentoAnualBps: 600,
    })
    const alcancado = valorFuturo({
      saldoInicialCentavos: 260000,
      aporteMensalCentavos: aporte,
      meses: 12,
      rendimentoAnualBps: 600,
    })
    assert.ok(alcancado >= 1_800_000, `chegou a ${alcancado}, precisava de 1800000`)
  })

  it("meses para meta devolve zero quando o saldo já passou do alvo", () => {
    assert.equal(
      mesesParaMeta({ alvoCentavos: 100000, saldoAtualCentavos: 150000, aporteMensalCentavos: 0, rendimentoAnualBps: 0 }),
      0,
    )
  })

  it("meses para meta devolve null quando não há aporte nem rendimento", () => {
    assert.equal(
      mesesParaMeta({ alvoCentavos: 100000, saldoAtualCentavos: 0, aporteMensalCentavos: 0, rendimentoAnualBps: 0 }),
      null,
    )
  })

  it("marca fora do prazo quando o aporte não alcança a data", () => {
    const projecao = projetarMeta({
      alvoCentavos: 1_800_000,
      saldoAtualCentavos: 0,
      aporteMensalCentavos: 10000,
      rendimentoAnualBps: 0,
      dataAlvo: new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() + 12, 1)),
    })
    assert.equal(projecao.noPrazo, false)
    assert.ok(projecao.aporteNecessarioCentavos > 10000)
  })

  it("percentual nunca passa de 100", () => {
    const projecao = projetarMeta({
      alvoCentavos: 100000,
      saldoAtualCentavos: 500000,
      aporteMensalCentavos: 0,
      rendimentoAnualBps: 0,
    })
    assert.equal(projecao.percentual, 100)
  })
})

describe("aposentadoria", () => {
  it("a renda sustentável é 4% ao ano do patrimônio", () => {
    const projecao = projetarAposentadoria({
      idadeAtual: 35,
      idadeAposentadoria: 60,
      patrimonioAtualCentavos: 3_800_000,
      aporteMensalCentavos: 60000,
      rendimentoRealAnualBps: 500,
      gastoMensalDesejadoCentavos: 500000,
    })

    const esperado = Math.round((projecao.patrimonioNaAposentadoriaCentavos * 0.04) / 12)
    assert.equal(projecao.rendaMensalSustentavelCentavos, esperado)
    assert.equal(projecao.patrimonioAlvoCentavos, Math.round((500000 * 12) / 0.04))
  })

  it("a série vai da idade atual até a aposentadoria", () => {
    const projecao = projetarAposentadoria({
      idadeAtual: 30,
      idadeAposentadoria: 40,
      patrimonioAtualCentavos: 0,
      aporteMensalCentavos: 100000,
      rendimentoRealAnualBps: 400,
      gastoMensalDesejadoCentavos: 300000,
    })
    assert.equal(projecao.serie[0].idade, 30)
    assert.equal(projecao.serie[projecao.serie.length - 1].idade, 40)
  })
})

describe("reserva", () => {
  it("o alvo é o custo essencial vezes os meses escolhidos", () => {
    assert.equal(reservaIdeal(520000, 6), 3_120_000)
  })

  it("meses de folga divide o disponível pelo custo", () => {
    assert.equal(mesesDeFolga(1_040_000, 520000), 2)
    assert.equal(mesesDeFolga(100000, 0), Infinity)
  })
})

describe("MEI", () => {
  const limite = 8_100_000

  it("acusa estouro acima de 20% do limite", () => {
    const situacao = avaliarMei({
      faturamentoPorCompetencia: [{ competencia: "2026-01", valorCentavos: 10_000_000 }],
      limiteAnualCentavos: limite,
      mesAtual: 1,
      ano: 2026,
    })
    assert.equal(situacao.risco, "ESTOURO_ACIMA_20")
  })

  it("separa estouro de até 20%", () => {
    const situacao = avaliarMei({
      faturamentoPorCompetencia: [{ competencia: "2026-01", valorCentavos: 8_500_000 }],
      limiteAnualCentavos: limite,
      mesAtual: 1,
      ano: 2026,
    })
    assert.equal(situacao.risco, "ESTOURO_ATE_20")
  })

  it("avisa antes de estourar quando a projeção passa do limite", () => {
    const situacao = avaliarMei({
      // 800 mil por mês em 6 meses projeta 9,6 milhões no ano.
      faturamentoPorCompetencia: Array.from({ length: 6 }, (_, indice) => ({
        competencia: `2026-0${indice + 1}`,
        valorCentavos: 800000,
      })),
      limiteAnualCentavos: limite,
      mesAtual: 6,
      ano: 2026,
    })
    assert.equal(situacao.risco, "ATENCAO")
    assert.ok(situacao.mesQueEstoura !== null)
  })

  it("fica em OK quando o ritmo cabe no limite", () => {
    const situacao = avaliarMei({
      faturamentoPorCompetencia: Array.from({ length: 6 }, (_, indice) => ({
        competencia: `2026-0${indice + 1}`,
        valorCentavos: 300000,
      })),
      limiteAnualCentavos: limite,
      mesAtual: 6,
      ano: 2026,
    })
    assert.equal(situacao.risco, "OK")
    assert.ok(situacao.tetoMensalRestanteCentavos > 0)
  })

  it("ignora faturamento de outros anos", () => {
    const situacao = avaliarMei({
      faturamentoPorCompetencia: [
        { competencia: "2025-06", valorCentavos: 9_000_000 },
        { competencia: "2026-01", valorCentavos: 100000 },
      ],
      limiteAnualCentavos: limite,
      mesAtual: 1,
      ano: 2026,
    })
    assert.equal(situacao.faturamentoAnoCentavos, 100000)
  })

  it("o limite do primeiro ano é proporcional aos meses de atividade", () => {
    // Abriu em julho: sete meses de atividade, 7/12 do limite.
    assert.equal(limiteProporcionalMei(8_100_000, 7), Math.round((8_100_000 / 12) * 6))
    assert.equal(limiteProporcionalMei(8_100_000, 1), 8_100_000)
  })
})

describe("conversão de taxas", () => {
  it("a taxa mensal composta reproduz a anual", () => {
    const mensal = anualParaMensalBps(1200)
    const anualDeVolta = (Math.pow(1 + mensal / 10_000, 12) - 1) * 10_000
    assert.ok(Math.abs(anualDeVolta - 1200) < 5)
  })
})

describe("MEI: média, teto e DAS", () => {
  const limite = 8_100_000
  const oitoMeses = [520000, 480000, 610000, 590000, 640000, 720000, 690000, 760000].map((valor, indice) => ({ competencia: `2026-0${indice + 1}`, valorCentavos: valor }))

  it("média só dos meses fechados: em setembro, oito meses", () => {
    const situacao = avaliarMei({ faturamentoPorCompetencia: oitoMeses, limiteAnualCentavos: limite, mesAtual: 9, ano: 2026 })
    assert.equal(situacao.mediaMensalCentavos, 626250)
    assert.equal(situacao.projecaoAnualCentavos, 5_010_000 + 626250 * 4)
  })

  it("teto por mês conta o mês corrente entre os que faltam", () => {
    const situacao = avaliarMei({ faturamentoPorCompetencia: oitoMeses, limiteAnualCentavos: limite, mesAtual: 9, ano: 2026 })
    assert.equal(situacao.tetoMensalRestanteCentavos, Math.floor((limite - 5_010_000) / 4))
  })

  it("quem abriu em julho tem a média de julho e agosto, não de janeiro a agosto", () => {
    const situacao = avaliarMei({
      faturamentoPorCompetencia: [
        { competencia: "2026-07", valorCentavos: 600000 },
        { competencia: "2026-08", valorCentavos: 800000 },
      ],
      limiteAnualCentavos: limiteProporcionalMei(limite, 7),
      mesAtual: 9,
      ano: 2026,
      mesInicio: 7,
    })
    assert.equal(situacao.mediaMensalCentavos, 700000)
    assert.equal(situacao.risco, "ATENCAO")
  })

  it("DAS vence no mês seguinte e só atrasa depois do dia", () => {
    assert.equal(vencimentoDoDas("2026-08", 20), "2026-09-20")
    assert.equal(vencimentoDoDas("2026-12", 20), "2027-01-20")
    assert.equal(vencimentoDoDas("2026-01", 31), "2026-02-28")
    assert.equal(situacaoDoDas("2026-08", false, "2026-09-05", 20), "a vencer")
    assert.equal(situacaoDoDas("2026-08", false, "2026-09-20", 20), "a vencer")
    assert.equal(situacaoDoDas("2026-08", false, "2026-09-21", 20), "atrasado")
    assert.equal(situacaoDoDas("2026-08", true, "2026-12-01", 20), "pago")
  })
})
