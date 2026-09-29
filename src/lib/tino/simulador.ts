/**
 * Simulador de fluxo de caixa.
 *
 * Projeta mês a mês o efeito conjunto de renda, custo de vida, parcelas já
 * contratadas, dívidas com juros e metas — e permite empilhar hipóteses
 * ("e se eu cortar 500 por mês?", "e se eu pegar 10 mil em 24x?") para comparar
 * com o cenário atual lado a lado.
 *
 * A comparação é o ponto: um número sozinho ("você fecha o ano com X") não ajuda
 * a decidir. O que decide é a diferença entre fazer e não fazer.
 *
 * Regras da casa mantidas: centavos inteiros, taxa em pontos-base, função pura.
 */

import { bpsParaTaxa } from "@/lib/dinheiro"
import { competenciaMaisMeses, distanciaEmMeses } from "@/lib/datas"
import { parcelaPrice } from "@/lib/financeiro"

// ============================================================
// ENTRADA
// ============================================================

export interface DividaSimulada {
  id: string
  nome: string
  saldoCentavos: number
  jurosMensalBps: number
  /// Parcela contratada que sai todo mês. Zero em dívida rotativa, onde o
  /// pagamento é o que sobrar.
  parcelaCentavos: number
}

export interface CenarioBase {
  competenciaInicial: string
  saldoInicialCentavos: number
  rendaMensalCentavos: number
  /// Custo de vida sem as parcelas — elas entram por competência, à parte.
  custoDeVidaMensalCentavos: number
  parcelasPorCompetencia: Record<string, number>
  dividas: DividaSimulada[]

  /// Juros do cheque especial, em pontos-base ao mês.
  ///
  /// Saldo negativo em conta NÃO é uma dívida à parte: é o próprio saldo. Tratá-lo
  /// como dívida separada contaria o mesmo buraco duas vezes (uma no saldo, outra
  /// no passivo) e ainda faria a sobra do mês ficar "parada" ao lado de uma dívida
  /// a 8% — o oposto do que acontece na conta real, onde qualquer entrada abate o
  /// negativo na hora.
  jurosChequeEspecialBps?: number
  /// Lançamentos pontuais já conhecidos: IPVA, 13º, viagem marcada.
  eventos?: { competencia: string; descricao: string; valorCentavos: number; tipo: "RECEITA" | "DESPESA" }[]
  aporteMetaMensalCentavos?: number
}

export type Ajuste =
  | { tipo: "RENDA"; rotulo: string; deltaCentavos: number; aPartirDe?: string }
  | { tipo: "CUSTO"; rotulo: string; deltaCentavos: number; aPartirDe?: string }
  | { tipo: "GASTO_UNICO"; rotulo: string; valorCentavos: number; competencia: string }
  | { tipo: "RECEITA_UNICA"; rotulo: string; valorCentavos: number; competencia: string }
  | {
      tipo: "NOVA_COMPRA_PARCELADA"
      rotulo: string
      valorTotalCentavos: number
      parcelas: number
      competenciaInicial: string
    }
  | {
      tipo: "NOVO_EMPRESTIMO"
      rotulo: string
      valorCentavos: number
      parcelas: number
      jurosMensalBps: number
      custosExtrasCentavos?: number
      competencia: string
    }
  | { tipo: "QUITAR_DIVIDA"; rotulo: string; dividaId: string; competencia: string }
  | { tipo: "PAGAMENTO_EXTRA"; rotulo: string; valorMensalCentavos: number; aPartirDe?: string }
  | { tipo: "APORTE_META"; rotulo: string; deltaCentavos: number; aPartirDe?: string }

// ============================================================
// SAÍDA
// ============================================================

export interface MesProjetado {
  competencia: string
  receitasCentavos: number
  custoDeVidaCentavos: number
  parcelasCentavos: number
  parcelasDividaCentavos: number
  jurosCentavos: number
  pagamentoExtraCentavos: number
  aporteMetaCentavos: number
  /// Receitas menos tudo o que saiu no mês.
  resultadoCentavos: number
  saldoAcumuladoCentavos: number
  dividaRestanteCentavos: number
  /// Saldo em conta menos dívida: o número que diz se a pessoa está avançando.
  patrimonioLiquidoCentavos: number
  eventos: string[]
}

export interface ResultadoSimulacao {
  meses: MesProjetado[]
  saldoFinalCentavos: number
  patrimonioFinalCentavos: number
  totalJurosCentavos: number
  /// Primeira competência em que o saldo em conta fica negativo.
  primeiroMesNegativo: string | null
  /// Competência em que a última dívida é quitada.
  mesQuitacao: string | null
  /// Menor saldo atingido no período — o aperto máximo do caminho.
  menorSaldoCentavos: number
}

export interface Comparacao {
  base: ResultadoSimulacao
  cenario: ResultadoSimulacao
  delta: {
    saldoFinalCentavos: number
    patrimonioFinalCentavos: number
    jurosCentavos: number
    /// Positivo = o cenário quita mais cedo, em meses.
    mesesQuitacaoAntes: number | null
    /// Se o cenário evita (ou provoca) um mês no vermelho.
    mudouRiscoNegativo: "EVITA" | "PROVOCA" | "IGUAL"
  }
  /// Leitura em português do que a simulação mostra.
  veredito: string[]
}

// ============================================================
// MOTOR
// ============================================================

/** Ajustes com `aPartirDe` só valem daquela competência em diante. */
function vigente(competencia: string, aPartirDe?: string): boolean {
  if (!aPartirDe) return true
  return distanciaEmMeses(aPartirDe, competencia) >= 0
}

export function simular(base: CenarioBase, ajustes: Ajuste[] = [], meses = 24): ResultadoSimulacao {
  const dividas = base.dividas.map((divida) => ({ ...divida }))

  // Parcelas criadas pelos ajustes (compra parcelada nova, empréstimo novo)
  // ficam num mapa à parte para não misturar com o que já estava contratado.
  const parcelasSimuladas: Record<string, { valorCentavos: number; rotulo: string }[]> = {}

  const adicionarParcelas = (
    competenciaInicial: string,
    quantidade: number,
    valorCentavos: number,
    rotulo: string,
  ) => {
    for (let n = 0; n < quantidade; n += 1) {
      const competencia = competenciaMaisMeses(competenciaInicial, n)
      parcelasSimuladas[competencia] = [
        ...(parcelasSimuladas[competencia] ?? []),
        { valorCentavos, rotulo: `${rotulo} ${n + 1}/${quantidade}` },
      ]
    }
  }

  for (const ajuste of ajustes) {
    if (ajuste.tipo === "NOVA_COMPRA_PARCELADA") {
      adicionarParcelas(
        ajuste.competenciaInicial,
        ajuste.parcelas,
        Math.round(ajuste.valorTotalCentavos / ajuste.parcelas),
        ajuste.rotulo,
      )
    }

    if (ajuste.tipo === "NOVO_EMPRESTIMO") {
      // A parcela começa no mês seguinte à liberação: é assim que o crédito
      // funciona, e antecipar um mês distorceria o aperto inicial.
      const parcela = parcelaPrice(ajuste.valorCentavos, ajuste.jurosMensalBps, ajuste.parcelas)
      adicionarParcelas(competenciaMaisMeses(ajuste.competencia, 1), ajuste.parcelas, parcela, ajuste.rotulo)
    }
  }

  const linhas: MesProjetado[] = []
  let saldo = base.saldoInicialCentavos
  let totalJuros = 0
  let primeiroMesNegativo: string | null = null
  let mesQuitacao: string | null = null
  let menorSaldo = base.saldoInicialCentavos

  const saldoDasDividas = () => dividas.reduce((soma, divida) => soma + Math.max(0, divida.saldoCentavos), 0)
  const tinhaDivida = saldoDasDividas() > 0

  for (let indice = 0; indice < meses; indice += 1) {
    const competencia = competenciaMaisMeses(base.competenciaInicial, indice)
    const eventos: string[] = []

    // ── Receita ─────────────────────────────────────────────
    let receitas = base.rendaMensalCentavos
    for (const ajuste of ajustes) {
      if (ajuste.tipo === "RENDA" && vigente(competencia, ajuste.aPartirDe)) {
        receitas += ajuste.deltaCentavos
        if (indice === 0 || ajuste.aPartirDe === competencia) eventos.push(ajuste.rotulo)
      }
      if (ajuste.tipo === "RECEITA_UNICA" && ajuste.competencia === competencia) {
        receitas += ajuste.valorCentavos
        eventos.push(ajuste.rotulo)
      }
      if (ajuste.tipo === "NOVO_EMPRESTIMO" && ajuste.competencia === competencia) {
        // O dinheiro entra líquido dos custos (IOF, tarifa): é o que cai na conta.
        receitas += ajuste.valorCentavos - (ajuste.custosExtrasCentavos ?? 0)
        eventos.push(`${ajuste.rotulo}: dinheiro na conta`)
      }
    }

    for (const evento of base.eventos ?? []) {
      if (evento.competencia !== competencia || evento.tipo !== "RECEITA") continue
      receitas += evento.valorCentavos
      eventos.push(evento.descricao)
    }

    // ── Custo de vida ───────────────────────────────────────
    let custoDeVida = base.custoDeVidaMensalCentavos
    for (const ajuste of ajustes) {
      if (ajuste.tipo === "CUSTO" && vigente(competencia, ajuste.aPartirDe)) {
        custoDeVida += ajuste.deltaCentavos
        if (indice === 0 || ajuste.aPartirDe === competencia) eventos.push(ajuste.rotulo)
      }
      if (ajuste.tipo === "GASTO_UNICO" && ajuste.competencia === competencia) {
        custoDeVida += ajuste.valorCentavos
        eventos.push(ajuste.rotulo)
      }
    }

    for (const evento of base.eventos ?? []) {
      if (evento.competencia !== competencia || evento.tipo !== "DESPESA") continue
      custoDeVida += evento.valorCentavos
      eventos.push(evento.descricao)
    }

    custoDeVida = Math.max(0, custoDeVida)

    // ── Parcelas ────────────────────────────────────────────
    const parcelasContratadas = base.parcelasPorCompetencia[competencia] ?? 0
    const novas = parcelasSimuladas[competencia] ?? []
    const parcelas = parcelasContratadas + novas.reduce((soma, item) => soma + item.valorCentavos, 0)
    for (const nova of novas) eventos.push(nova.rotulo)

    // ── Juros e parcelas de dívida ──────────────────────────
    let jurosDoMes = 0
    let parcelasDivida = 0

    for (const divida of dividas) {
      if (divida.saldoCentavos <= 0) continue
      const juros = Math.round(divida.saldoCentavos * bpsParaTaxa(divida.jurosMensalBps))
      divida.saldoCentavos += juros
      jurosDoMes += juros

      const pagamento = Math.min(divida.parcelaCentavos, divida.saldoCentavos)
      divida.saldoCentavos -= pagamento
      parcelasDivida += pagamento
    }
    totalJuros += jurosDoMes

    // ── Quitações à vista pedidas na simulação ──────────────
    let quitacoes = 0
    for (const ajuste of ajustes) {
      if (ajuste.tipo !== "QUITAR_DIVIDA" || ajuste.competencia !== competencia) continue
      const divida = dividas.find((linha) => linha.id === ajuste.dividaId)
      if (!divida || divida.saldoCentavos <= 0) continue
      quitacoes += divida.saldoCentavos
      eventos.push(`${ajuste.rotulo}: quitação de ${divida.nome}`)
      divida.saldoCentavos = 0
    }

    // ── Pagamento extra ─────────────────────────────────────
    let pagamentoExtra = quitacoes
    for (const ajuste of ajustes) {
      if (ajuste.tipo !== "PAGAMENTO_EXTRA" || !vigente(competencia, ajuste.aPartirDe)) continue

      // O extra vai para a dívida de maior juro viva — a mesma ordem que o
      // plano de pagamento usa, para simulação e plano não se contradizerem.
      let restante = ajuste.valorMensalCentavos
      const fila = dividas.filter((divida) => divida.saldoCentavos > 0).sort((a, b) => b.jurosMensalBps - a.jurosMensalBps)

      for (const divida of fila) {
        if (restante <= 0) break
        const valor = Math.min(restante, divida.saldoCentavos)
        divida.saldoCentavos -= valor
        restante -= valor
        pagamentoExtra += valor
      }
    }

    // ── Aporte em meta ──────────────────────────────────────
    let aporteMeta = base.aporteMetaMensalCentavos ?? 0
    for (const ajuste of ajustes) {
      if (ajuste.tipo === "APORTE_META" && vigente(competencia, ajuste.aPartirDe)) {
        aporteMeta += ajuste.deltaCentavos
      }
    }
    aporteMeta = Math.max(0, aporteMeta)

    // ── Fechamento do mês ───────────────────────────────────
    const resultado = receitas - custoDeVida - parcelas - parcelasDivida - pagamentoExtra - aporteMeta
    saldo += resultado

    // Conta no vermelho cobra juros sobre o próprio saldo. Entrada de dinheiro
    // abate o negativo automaticamente — é o que o banco faz, e é por isso que
    // o cheque especial não precisa de pagamento explícito para diminuir.
    let jurosChequeEspecial = 0
    if (saldo < 0 && (base.jurosChequeEspecialBps ?? 0) > 0) {
      jurosChequeEspecial = Math.round(Math.abs(saldo) * bpsParaTaxa(base.jurosChequeEspecialBps as number))
      saldo -= jurosChequeEspecial
      jurosDoMes += jurosChequeEspecial
      totalJuros += jurosChequeEspecial
    }

    menorSaldo = Math.min(menorSaldo, saldo)

    if (saldo < 0 && !primeiroMesNegativo) primeiroMesNegativo = competencia

    const restanteDivida = saldoDasDividas()
    if (tinhaDivida && restanteDivida <= 0 && !mesQuitacao) mesQuitacao = competencia

    linhas.push({
      competencia,
      receitasCentavos: receitas,
      custoDeVidaCentavos: custoDeVida,
      parcelasCentavos: parcelas,
      parcelasDividaCentavos: parcelasDivida,
      jurosCentavos: jurosDoMes,
      pagamentoExtraCentavos: pagamentoExtra,
      aporteMetaCentavos: aporteMeta,
      resultadoCentavos: resultado,
      saldoAcumuladoCentavos: saldo,
      dividaRestanteCentavos: restanteDivida,
      // Aporte em meta sai do caixa mas continua sendo dinheiro da pessoa, por
      // isso o patrimônio soma o saldo, subtrai a dívida e ignora o aporte.
      patrimonioLiquidoCentavos: saldo - restanteDivida,
      eventos,
    })
  }

  return {
    meses: linhas,
    saldoFinalCentavos: saldo,
    patrimonioFinalCentavos: saldo - saldoDasDividas(),
    totalJurosCentavos: totalJuros,
    primeiroMesNegativo,
    mesQuitacao,
    menorSaldoCentavos: menorSaldo,
  }
}

/** Roda o cenário atual e o simulado e explica a diferença. */
export function comparar(base: CenarioBase, ajustes: Ajuste[], meses = 24): Comparacao {
  const semAjustes = simular(base, [], meses)
  const comAjustes = simular(base, ajustes, meses)

  const mesesQuitacaoAntes =
    semAjustes.mesQuitacao && comAjustes.mesQuitacao
      ? distanciaEmMeses(comAjustes.mesQuitacao, semAjustes.mesQuitacao)
      : null

  const mudouRiscoNegativo: Comparacao["delta"]["mudouRiscoNegativo"] =
    semAjustes.primeiroMesNegativo && !comAjustes.primeiroMesNegativo
      ? "EVITA"
      : !semAjustes.primeiroMesNegativo && comAjustes.primeiroMesNegativo
        ? "PROVOCA"
        : "IGUAL"

  const delta = {
    saldoFinalCentavos: comAjustes.saldoFinalCentavos - semAjustes.saldoFinalCentavos,
    patrimonioFinalCentavos: comAjustes.patrimonioFinalCentavos - semAjustes.patrimonioFinalCentavos,
    jurosCentavos: comAjustes.totalJurosCentavos - semAjustes.totalJurosCentavos,
    mesesQuitacaoAntes,
    mudouRiscoNegativo,
  }

  return { base: semAjustes, cenario: comAjustes, delta, veredito: lerComparacao(delta, comAjustes, meses) }
}

/**
 * Traduz a diferença em frases.
 *
 * O patrimônio lidera a leitura porque é o único número que não engana: dá para
 * terminar o ano com mais dinheiro em conta e ainda assim mais pobre, se a
 * dívida cresceu mais que o saldo.
 */
function lerComparacao(
  delta: Comparacao["delta"],
  cenario: ResultadoSimulacao,
  meses: number,
): string[] {
  const emReais = (centavos: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(centavos / 100)

  const frases: string[] = []

  if (delta.patrimonioFinalCentavos > 0) {
    frases.push(
      `Em ${meses} meses você termina ${emReais(delta.patrimonioFinalCentavos)} mais rico do que ficaria sem essa mudança.`,
    )
  } else if (delta.patrimonioFinalCentavos < 0) {
    frases.push(
      `Em ${meses} meses você termina ${emReais(Math.abs(delta.patrimonioFinalCentavos))} mais pobre do que ficaria sem essa mudança.`,
    )
  } else {
    frases.push("O patrimônio no fim do período fica praticamente igual.")
  }

  if (delta.jurosCentavos < 0) {
    frases.push(`Você paga ${emReais(Math.abs(delta.jurosCentavos))} a menos em juros no caminho.`)
  } else if (delta.jurosCentavos > 0) {
    frases.push(`Custa ${emReais(delta.jurosCentavos)} a mais em juros no caminho.`)
  }

  if (delta.mesesQuitacaoAntes !== null && delta.mesesQuitacaoAntes > 0) {
    frases.push(`As dívidas acabam ${delta.mesesQuitacaoAntes} mês(es) antes.`)
  } else if (delta.mesesQuitacaoAntes !== null && delta.mesesQuitacaoAntes < 0) {
    frases.push(`As dívidas demoram ${Math.abs(delta.mesesQuitacaoAntes)} mês(es) a mais para acabar.`)
  }

  if (delta.mudouRiscoNegativo === "EVITA") {
    frases.push("Com essa mudança, o caixa deixa de ficar negativo no período.")
  } else if (delta.mudouRiscoNegativo === "PROVOCA") {
    frases.push("Atenção: essa mudança leva o caixa para o negativo em algum mês do período.")
  }

  if (cenario.menorSaldoCentavos < 0) {
    frases.push(
      `O momento mais apertado chega a ${emReais(cenario.menorSaldoCentavos)}: é aí que a conta entra no cheque especial.`,
    )
  }

  return frases
}
