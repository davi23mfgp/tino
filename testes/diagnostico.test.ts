import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { montarDiagnostico } from "@/lib/tino/diagnostico"
import type { Panorama } from "@/lib/tino/panorama"

/**
 * O parecer é o que o usuário lê primeiro. Um número que contradiz o rótulo ao
 * lado destrói a confiança na tela inteira — foi o que aconteceu quando a nota
 * 84 apareceu junto de "situação crítica".
 */

function panorama(parcial: {
  receitas?: number
  despesas?: number
  saldoContas?: { nome: string; tipo: string; saldo: number }[]
  categorias?: { nome: string; total: number; essencial?: boolean }[]
  dividaTotal?: number
  parcelaMensal?: number
  metaSaldo?: number
  custoEssencial?: number
} = {}): Panorama {
  const receitas = parcial.receitas ?? 700000
  const despesas = parcial.despesas ?? 450000
  const contas = parcial.saldoContas ?? [{ nome: "Corrente", tipo: "CORRENTE", saldo: 3_000_000 }]

  return {
    lar: {
      id: "lar",
      nome: "Teste",
      tipo: "SOLO",
      diaInicioMes: 1,
      estrategiaDivida: "AVALANCHE",
      mesesReserva: 6,
    },
    competencia: "2026-08",
    patrimonioCentavos: 0,
  aplicadoCentavos: 0,
  saldoTotalCentavos: contas
      .filter((conta) => conta.tipo !== "CARTAO_CREDITO")
      .reduce((soma, conta) => soma + conta.saldo, 0),
    saldoPorConta: contas.map((conta, indice) => ({
      id: `conta-${indice}`,
      nome: conta.nome,
      tipo: conta.tipo,
      saldoCentavos: conta.saldo,
      limiteCentavos: null,
    })),
    mes: {
      receitasCentavos: receitas,
      despesasCentavos: despesas,
      sobraCentavos: receitas - despesas,
      taxaPoupancaBps: 0,
      despesasPorCategoria: (parcial.categorias ?? [{ nome: "Aluguel", total: despesas, essencial: true }]).map(
        (categoria) => ({
          categoriaId: categoria.nome,
          nome: categoria.nome,
          grupo: "MORADIA",
          essencial: categoria.essencial ?? false,
          totalCentavos: categoria.total,
          anteriorCentavos: 0,
          variacaoBps: null,
        }),
      ),
      despesasPorMembro: [],
      gastosPorDia: [],
      maiorGastoDoDia: null,
      mediaDiariaCentavos: 0,
      aPagarCentavos: 0,
      naoCategorizadas: 0,
    },
    historico: [],
    medias: {
      receitaCentavos: receitas,
      despesaCentavos: despesas,
      sobraCentavos: receitas - despesas,
      custoFixoCentavos: 200000,
      custoEssencialCentavos: parcial.custoEssencial ?? 400000,
      rendaDeclaradaCentavos: receitas,
    },
    orcamento: { competencia: "2026-08", linhas: [], limiteTotalCentavos: 0, gastoTotalCentavos: 0 },
    metas: parcial.metaSaldo
      ? [
          {
            id: "m",
            nome: "Reserva",
            tipo: "RESERVA_EMERGENCIA",
            alvoCentavos: 2_400_000,
            saldoCentavos: parcial.metaSaldo,
            percentual: 0,
            mesesRestantes: null,
            aporteNecessarioCentavos: 0,
            aporteAtualCentavos: 0,
            noPrazo: true,
            dataAlvo: null,
          },
        ]
      : [],
    dividas: {
      lista: parcial.dividaTotal
        ? [
            {
              id: "d",
              credor: "Banco",
              saldoDevedorCentavos: parcial.dividaTotal,
              jurosMensalBps: 250,
              parcelaCentavos: parcial.parcelaMensal ?? 0,
              tipo: "EMPRESTIMO_PESSOAL",
              parcelasTotal: null,
              parcelasPagas: 0,
              diaVencimento: 10,
            },
          ]
        : [],
      totalCentavos: parcial.dividaTotal ?? 0,
      parcelaMensalCentavos: parcial.parcelaMensal ?? 0,
      comprometimentoBps: 0,
      plano: null,
    },
    reserva: { idealCentavos: 2_400_000, atualCentavos: 0, percentual: 0, mesesDeFolga: 0 },
    projecao: [],
    aposentadoria: null,
    mei: null,
    recorrenciasProximas: [],
  }
}

const extras = { compromissos: [], parcelamentosRestanteCentavos: 0 }

describe("nota de saúde", () => {
  it("não passa de 40 com a conta no negativo", () => {
    // Regressão: quatro indicadores bons e um crítico davam nota 84 ao lado do
    // rótulo "situação crítica". Em finanças o pior item manda.
    const diagnostico = montarDiagnostico(
      panorama({ saldoContas: [{ nome: "Corrente", tipo: "CORRENTE", saldo: -658274 }] }),
      extras,
    )
    assert.ok(diagnostico.nota <= 40, `nota veio ${diagnostico.nota}`)
    assert.equal(diagnostico.situacao, "CRITICO")
  })

  it("não passa de 55 quando há indicador crítico", () => {
    const diagnostico = montarDiagnostico(panorama({ saldoContas: [{ nome: "C", tipo: "CORRENTE", saldo: 1 }] }), extras)
    const temCritico = diagnostico.indicadores.some((linha) => linha.faixa === "CRITICO")
    if (temCritico) assert.ok(diagnostico.nota <= 55)
  })

  it("nota e situação nunca se contradizem", () => {
    for (const cenario of [
      panorama(),
      panorama({ saldoContas: [{ nome: "C", tipo: "CORRENTE", saldo: -100000 }] }),
      panorama({ despesas: 690000 }),
      panorama({ receitas: 0, despesas: 100000 }),
    ]) {
      const diagnostico = montarDiagnostico(cenario, extras)
      if (diagnostico.situacao === "SAUDAVEL") assert.ok(diagnostico.nota >= 75)
      if (diagnostico.situacao === "CRITICO") assert.ok(diagnostico.nota < 55)
    }
  })
})

describe("indicadores", () => {
  it("taxa de poupança fica sem faixa quando não houve receita lançada", () => {
    // Regressão: mostrava 83% de poupança num mês sem nenhuma receita, porque
    // usava a renda declarada. Elogiar sobra que ninguém viu é pior que calar.
    const diagnostico = montarDiagnostico(panorama({ receitas: 0, despesas: 100000 }), extras)
    const poupanca = diagnostico.indicadores.find((linha) => linha.chave === "taxa-poupanca")
    assert.equal(poupanca?.faixa, "SEM_DADO")
    assert.match(poupanca?.leitura ?? "", /renda que você informou/)
  })

  it("todo indicador traz uma referência", () => {
    // Percentual sem referência não informa: 22% é bom ou ruim?
    for (const indicador of montarDiagnostico(panorama(), extras).indicadores) {
      assert.ok(indicador.referencia.length > 0, `${indicador.nome} sem referência`)
      assert.ok(indicador.leitura.length > 0, `${indicador.nome} sem leitura`)
    }
  })

  it("nenhum valor sai como NaN ou Infinity", () => {
    for (const cenario of [panorama({ receitas: 0, despesas: 0 }), panorama({ custoEssencial: 0 })]) {
      for (const indicador of montarDiagnostico(cenario, extras).indicadores) {
        assert.ok(!/NaN|Infinity/.test(indicador.valor), `${indicador.nome} = ${indicador.valor}`)
        assert.ok(Number.isFinite(indicador.numero), `${indicador.nome} numero = ${indicador.numero}`)
      }
    }
  })
})

describe("DRE e balanço", () => {
  it("o resultado é receita menos despesa", () => {
    const { dre } = montarDiagnostico(panorama({ receitas: 700000, despesas: 450000 }), extras)
    assert.equal(dre.resultadoCentavos, 250000)
  })

  it("essencial mais não essencial fecha a despesa", () => {
    const { dre } = montarDiagnostico(
      panorama({
        despesas: 300000,
        categorias: [
          { nome: "Aluguel", total: 200000, essencial: true },
          { nome: "Lazer", total: 100000 },
        ],
      }),
      extras,
    )
    assert.equal(dre.essenciaisCentavos + dre.supefluasCentavos, dre.despesasCentavos)
  })

  it("patrimônio líquido é ativo menos passivo", () => {
    const { balanco } = montarDiagnostico(panorama({ dividaTotal: 500000, metaSaldo: 100000 }), extras)
    assert.equal(
      balanco.patrimonioLiquidoCentavos,
      balanco.ativoTotalCentavos - balanco.passivoTotalCentavos,
    )
  })

  it("conta negativa vira passivo, não ativo", () => {
    const { balanco } = montarDiagnostico(
      panorama({ saldoContas: [{ nome: "Corrente", tipo: "CORRENTE", saldo: -200000 }] }),
      extras,
    )
    assert.equal(balanco.ativoCirculanteCentavos, 0, "saldo negativo não é dinheiro disponível")
    assert.ok(balanco.passivoCurtoPrazoCentavos >= 200000)
  })

  it("cartão de crédito não entra no ativo", () => {
    const { balanco } = montarDiagnostico(
      panorama({
        saldoContas: [
          { nome: "Corrente", tipo: "CORRENTE", saldo: 100000 },
          { nome: "Cartão", tipo: "CARTAO_CREDITO", saldo: -300000 },
        ],
      }),
      extras,
    )
    assert.equal(balanco.ativoCirculanteCentavos, 100000)
    assert.ok(balanco.passivoCurtoPrazoCentavos >= 300000, "a fatura é passivo")
  })
})

describe("prioridades", () => {
  it("sair do cheque especial vem primeiro", () => {
    const diagnostico = montarDiagnostico(
      panorama({ saldoContas: [{ nome: "Corrente", tipo: "CORRENTE", saldo: -658274 }] }),
      extras,
    )
    assert.match(diagnostico.prioridades[0].titulo, /cheque especial/i)
    assert.ok((diagnostico.prioridades[0].impactoMensalCentavos ?? 0) > 0, "precisa dizer quanto custa por mês")
  })

  it("sempre devolve ao menos uma prioridade", () => {
    const diagnostico = montarDiagnostico(panorama(), extras)
    assert.ok(diagnostico.prioridades.length >= 1)
    assert.ok(diagnostico.prioridades[0].acao.length > 0)
  })

  it("a numeração é sequencial", () => {
    const diagnostico = montarDiagnostico(
      panorama({ saldoContas: [{ nome: "C", tipo: "CORRENTE", saldo: -100000 }], dividaTotal: 900000 }),
      extras,
    )
    diagnostico.prioridades.forEach((prioridade, indice) => assert.equal(prioridade.ordem, indice + 1))
  })
})

describe("parecer", () => {
  it("cita o resultado do mês e o patrimônio", () => {
    const diagnostico = montarDiagnostico(panorama(), extras)
    assert.match(diagnostico.parecer, /R\$/)
    assert.match(diagnostico.parecer, /patrimônio líquido/i)
  })

  it("aponta o saldo negativo como ponto mais caro", () => {
    const diagnostico = montarDiagnostico(
      panorama({ saldoContas: [{ nome: "C", tipo: "CORRENTE", saldo: -658274 }] }),
      extras,
    )
    assert.match(diagnostico.parecer, /negativo/i)
  })
})
