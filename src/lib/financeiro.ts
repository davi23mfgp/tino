/**
 * Motor financeiro do Tino.
 *
 * Regras da casa:
 * - dinheiro entra e sai daqui em centavos (Int);
 * - taxa entra em pontos-base (bps) e vira fração só dentro do cálculo;
 * - nada aqui toca banco de dados nem React — é função pura, testável e
 *   reutilizável pelo assistente, pelas telas e pelas rotas de API.
 */

import { bpsParaTaxa, formatarDecimal, taxaParaBps } from "@/lib/dinheiro"

// ============================================================
// JUROS, PARCELAS E CET
// ============================================================

/**
 * Parcela da Tabela Price (PMT). `jurosMensalBps` = 250 -> 2,5% a.m.
 * Juros zero cai na divisão simples — a fórmula geral dividiria por zero.
 */
export function parcelaPrice(principalCentavos: number, jurosMensalBps: number, parcelas: number): number {
  if (parcelas <= 0) return 0
  const i = bpsParaTaxa(jurosMensalBps)
  if (i === 0) return Math.round(principalCentavos / parcelas)
  const fator = Math.pow(1 + i, parcelas)
  return Math.round((principalCentavos * i * fator) / (fator - 1))
}

export interface LinhaAmortizacao {
  parcela: number
  jurosCentavos: number
  amortizacaoCentavos: number
  prestacaoCentavos: number
  saldoCentavos: number
}

/** Tabela de amortização Price completa. A última parcela absorve o resíduo. */
export function tabelaPrice(
  principalCentavos: number,
  jurosMensalBps: number,
  parcelas: number,
): LinhaAmortizacao[] {
  const i = bpsParaTaxa(jurosMensalBps)
  const prestacao = parcelaPrice(principalCentavos, jurosMensalBps, parcelas)
  const linhas: LinhaAmortizacao[] = []
  let saldo = principalCentavos

  for (let n = 1; n <= parcelas; n += 1) {
    const juros = Math.round(saldo * i)
    const ultima = n === parcelas
    // Arredondar parcela a parcela deixa sobra de centavos; a última quita o
    // saldo restante para o financiamento fechar em zero.
    const prestacaoDaVez = ultima ? saldo + juros : prestacao
    const amortizacao = prestacaoDaVez - juros
    saldo -= amortizacao
    linhas.push({
      parcela: n,
      jurosCentavos: juros,
      amortizacaoCentavos: amortizacao,
      prestacaoCentavos: prestacaoDaVez,
      saldoCentavos: Math.max(0, saldo),
    })
  }
  return linhas
}

/**
 * Taxa interna de retorno mensal de um fluxo de caixa, por bisseção.
 *
 * Bisseção em vez de Newton-Raphson: converge sempre dentro do intervalo,
 * enquanto Newton diverge em fluxos de crédito com taxa alta (rotativo a 15% a.m.).
 * Retorna a taxa em bps, ou null se não houver raiz no intervalo.
 */
export function taxaInternaMensalBps(fluxo: number[], maxIteracoes = 200): number | null {
  const vpl = (taxa: number) => fluxo.reduce((soma, valor, n) => soma + valor / Math.pow(1 + taxa, n), 0)

  let baixo = -0.9999
  let alto = 10 // 1000% a.m. cobre qualquer crédito predatório existente
  let fBaixo = vpl(baixo)
  let fAlto = vpl(alto)
  if (fBaixo * fAlto > 0) return null

  let meio = 0
  for (let k = 0; k < maxIteracoes; k += 1) {
    meio = (baixo + alto) / 2
    const fMeio = vpl(meio)
    if (Math.abs(fMeio) < 1e-9) break
    if (fBaixo * fMeio < 0) {
      alto = meio
      fAlto = fMeio
    } else {
      baixo = meio
      fBaixo = fMeio
    }
  }
  return taxaParaBps(meio)
}

export interface ResultadoEmprestimo {
  parcelaCentavos: number
  totalPagoCentavos: number
  totalJurosCentavos: number
  /// Custo Efetivo Total: inclui IOF, tarifas e seguro. É o número que compara
  /// propostas — a "taxa" anunciada esconde tudo o que não é juro.
  cetMensalBps: number
  cetAnualBps: number
  /// Quanto do valor pedido a pessoa recebe de fato (líquido dos custos).
  liberadoCentavos: number
  tabela: LinhaAmortizacao[]
}

/**
 * Simula um empréstimo com os custos que o banco cobra fora da taxa.
 * IOF e tarifas são descontados do valor liberado, então o CET sobe acima da
 * taxa nominal — é exatamente essa diferença que o usuário precisa ver.
 */
export function simularEmprestimo(params: {
  valorCentavos: number
  parcelas: number
  jurosMensalBps: number
  custosExtrasCentavos?: number
}): ResultadoEmprestimo {
  const { valorCentavos, parcelas, jurosMensalBps } = params
  const custos = params.custosExtrasCentavos ?? 0

  const parcela = parcelaPrice(valorCentavos, jurosMensalBps, parcelas)
  const tabela = tabelaPrice(valorCentavos, jurosMensalBps, parcelas)
  const totalPago = tabela.reduce((soma, linha) => soma + linha.prestacaoCentavos, 0)
  const liberado = valorCentavos - custos

  const fluxo = [liberado, ...tabela.map((linha) => -linha.prestacaoCentavos)]
  const cetMensalBps = taxaInternaMensalBps(fluxo) ?? jurosMensalBps
  const cetAnualBps = taxaParaBps(Math.pow(1 + bpsParaTaxa(cetMensalBps), 12) - 1)

  return {
    parcelaCentavos: parcela,
    totalPagoCentavos: totalPago,
    totalJurosCentavos: totalPago - valorCentavos,
    cetMensalBps,
    cetAnualBps,
    liberadoCentavos: liberado,
    tabela,
  }
}

export type Veredito = "APROVAR" | "CUIDADO" | "EVITAR"

export interface AnaliseEmprestimo extends ResultadoEmprestimo {
  veredito: Veredito
  comprometimentoBps: number
  motivos: string[]
  alternativas: string[]
}

/**
 * Veredito sobre pegar (ou não) o empréstimo.
 *
 * Três eixos, porque nenhum sozinho decide:
 * 1. comprometimento da renda — parcela que não cabe no mês vira dívida nova;
 * 2. CET contra o custo do dinheiro que a pessoa já tem (ou já deve);
 * 3. existência de alternativa mais barata (reserva, dívida cara a trocar).
 */
export function analisarEmprestimo(params: {
  valorCentavos: number
  parcelas: number
  jurosMensalBps: number
  custosExtrasCentavos?: number
  rendaMensalCentavos: number
  /// Parcelas de dívidas que a pessoa já paga hoje.
  parcelasAtuaisCentavos?: number
  /// Sobra do mês (receitas - despesas) na média recente.
  sobraMensalCentavos?: number
  reservaCentavos?: number
  /// Maior juro que a pessoa já paga hoje — se o novo for menor, trocar dívida
  /// cara por barata é economia, não endividamento.
  maiorJurosAtualBps?: number
}): AnaliseEmprestimo {
  const resultado = simularEmprestimo(params)
  const renda = Math.max(1, params.rendaMensalCentavos)
  const parcelasAtuais = params.parcelasAtuaisCentavos ?? 0
  const sobra = params.sobraMensalCentavos ?? 0
  const reserva = params.reservaCentavos ?? 0
  const maiorJurosAtual = params.maiorJurosAtualBps ?? 0

  const comprometimentoBps = taxaParaBps((parcelasAtuais + resultado.parcelaCentavos) / renda)
  const motivos: string[] = []
  const alternativas: string[] = []
  let pontos = 0

  // 30% da renda comprometida com dívida é o limite usado por bancos para
  // consignado, e serve bem como teto de segurança para o resto.
  if (comprometimentoBps > 3500) {
    pontos += 3
    motivos.push(
      `Com esta parcela, ${(comprometimentoBps / 100).toFixed(0)}% da sua renda vai para dívidas. Acima de 35% é zona de risco.`,
    )
  } else if (comprometimentoBps > 3000) {
    pontos += 2
    motivos.push(
      `O comprometimento da renda vai a ${(comprometimentoBps / 100).toFixed(0)}%. O limite confortável é 30%.`,
    )
  } else {
    motivos.push(
      `Comprometimento de renda em ${(comprometimentoBps / 100).toFixed(0)}% — dentro do limite de 30%.`,
    )
  }

  if (resultado.parcelaCentavos > sobra && sobra > 0) {
    pontos += 2
    motivos.push(
      "A parcela é maior que a sua sobra média do mês. Do jeito que está, ela seria paga com mais dívida.",
    )
  }

  if (resultado.cetMensalBps > 500) {
    pontos += 2
    motivos.push(
      `CET de ${formatarDecimal(resultado.cetMensalBps / 100, 2)}% ao mês (${formatarDecimal(resultado.cetAnualBps / 100, 1)}% ao ano) — caro para crédito pessoal.`,
    )
  } else if (resultado.cetMensalBps > 250) {
    pontos += 1
    motivos.push(`CET de ${formatarDecimal(resultado.cetMensalBps / 100, 2)}% ao mês. Vale cotar em outro banco antes de assinar.`)
  }

  if (resultado.totalJurosCentavos > params.valorCentavos) {
    pontos += 2
    motivos.push("Você pagaria mais em juros do que o valor emprestado.")
  }

  if (maiorJurosAtual > resultado.cetMensalBps + 50) {
    pontos -= 2
    motivos.push(
      "Este crédito é mais barato que a dívida que você já tem. Usar para trocar a dívida cara reduz o juro total.",
    )
    alternativas.push("Portabilidade: quitar a dívida mais cara com este crédito, sem aumentar o valor total devido.")
  }

  if (reserva >= params.valorCentavos && resultado.cetMensalBps > 100) {
    alternativas.push(
      "Usar parte da reserva sai mais barato que este juro — e a reserva pode ser recomposta com o valor da parcela.",
    )
  }

  if (params.parcelas > 24 && resultado.cetMensalBps > 200) {
    alternativas.push("Prazo mais curto: a parcela sobe, mas o total de juros cai bastante.")
  }

  const veredito: Veredito = pontos >= 4 ? "EVITAR" : pontos >= 2 ? "CUIDADO" : "APROVAR"
  return { ...resultado, veredito, comprometimentoBps, motivos, alternativas }
}

// ============================================================
// DÍVIDAS — ORDEM DE ATAQUE E PROJEÇÃO DE QUITAÇÃO
// ============================================================

export interface DividaEntrada {
  id: string
  credor: string
  saldoDevedorCentavos: number
  jurosMensalBps: number
  parcelaCentavos: number
}

export type Estrategia = "AVALANCHE" | "BOLA_DE_NEVE" | "PROPORCIONAL"

export function ordenarDividas(dividas: DividaEntrada[], estrategia: Estrategia): DividaEntrada[] {
  const copia = [...dividas]
  if (estrategia === "BOLA_DE_NEVE") return copia.sort((a, b) => a.saldoDevedorCentavos - b.saldoDevedorCentavos)
  if (estrategia === "AVALANCHE") return copia.sort((a, b) => b.jurosMensalBps - a.jurosMensalBps)
  return copia.sort((a, b) => b.saldoDevedorCentavos - a.saldoDevedorCentavos)
}

export interface PlanoDivida {
  meses: number
  totalJurosCentavos: number
  totalPagoCentavos: number
  quitacoes: { id: string; credor: string; mes: number }[]
  /// Saldo total devedor mês a mês — vira o gráfico da tela de dívidas.
  serieSaldo: number[]
}

/**
 * Projeta a quitação pagando o mínimo de todas e jogando o extra na primeira
 * da fila. Quando uma dívida morre, a parcela dela vira extra para a próxima
 * (efeito bola de neve) — é o que faz o plano acelerar sozinho.
 *
 * Limite de 600 meses (50 anos) encerra o laço quando o extra é zero e a
 * parcela nem cobre os juros: sem isso, a dívida nunca zera e o laço trava.
 */
export function planejarQuitacao(
  dividas: DividaEntrada[],
  extraMensalCentavos: number,
  estrategia: Estrategia,
  limiteMeses = 600,
): PlanoDivida {
  const fila = ordenarDividas(dividas, estrategia).map((divida) => ({ ...divida }))
  const quitacoes: PlanoDivida["quitacoes"] = []
  const serieSaldo: number[] = []
  let totalJuros = 0
  let totalPago = 0
  let mes = 0

  const saldoTotal = () => fila.reduce((soma, divida) => soma + divida.saldoDevedorCentavos, 0)
  serieSaldo.push(saldoTotal())

  while (saldoTotal() > 0 && mes < limiteMeses) {
    mes += 1
    // Parcela de dívida já quitada não some do orçamento: vira munição extra.
    let extra = extraMensalCentavos + fila.filter((d) => d.saldoDevedorCentavos <= 0).reduce((s, d) => s + d.parcelaCentavos, 0)

    for (const divida of fila) {
      if (divida.saldoDevedorCentavos <= 0) continue
      const juros = Math.round(divida.saldoDevedorCentavos * bpsParaTaxa(divida.jurosMensalBps))
      divida.saldoDevedorCentavos += juros
      totalJuros += juros

      let pagamento = Math.min(divida.parcelaCentavos, divida.saldoDevedorCentavos)
      const primeiraViva = fila.find((d) => d.saldoDevedorCentavos > 0)
      if (primeiraViva && primeiraViva.id === divida.id && extra > 0) {
        const reforco = Math.min(extra, divida.saldoDevedorCentavos - pagamento)
        pagamento += reforco
        extra -= reforco
      }

      divida.saldoDevedorCentavos -= pagamento
      totalPago += pagamento

      if (divida.saldoDevedorCentavos <= 0) {
        divida.saldoDevedorCentavos = 0
        quitacoes.push({ id: divida.id, credor: divida.credor, mes })
      }
    }

    serieSaldo.push(saldoTotal())

    // Nenhum centavo saiu do saldo neste mês: a parcela não cobre nem o juro.
    // Continuar seria projetar uma dívida eterna, então para e reporta.
    if (serieSaldo[mes] >= serieSaldo[mes - 1] && extraMensalCentavos === 0) break
  }

  return { meses: mes, totalJurosCentavos: totalJuros, totalPagoCentavos: totalPago, quitacoes, serieSaldo }
}

/** Compara as duas estratégias para o usuário escolher com número na mão. */
export function compararEstrategias(dividas: DividaEntrada[], extraMensalCentavos: number) {
  const avalanche = planejarQuitacao(dividas, extraMensalCentavos, "AVALANCHE")
  const bolaDeNeve = planejarQuitacao(dividas, extraMensalCentavos, "BOLA_DE_NEVE")
  return {
    avalanche,
    bolaDeNeve,
    economiaAvalancheCentavos: bolaDeNeve.totalJurosCentavos - avalanche.totalJurosCentavos,
    mesesAMais: bolaDeNeve.meses - avalanche.meses,
  }
}

// ============================================================
// METAS E PATRIMÔNIO
// ============================================================

/** Taxa anual (bps) -> taxa mensal equivalente composta (bps). */
export function anualParaMensalBps(anualBps: number): number {
  return taxaParaBps(Math.pow(1 + bpsParaTaxa(anualBps), 1 / 12) - 1)
}

/** Valor futuro de um saldo inicial mais aportes mensais no fim de cada mês. */
export function valorFuturo(params: {
  saldoInicialCentavos: number
  aporteMensalCentavos: number
  meses: number
  rendimentoAnualBps: number
}): number {
  const i = bpsParaTaxa(anualParaMensalBps(params.rendimentoAnualBps))
  const { saldoInicialCentavos: pv, aporteMensalCentavos: pmt, meses: n } = params
  if (i === 0) return Math.round(pv + pmt * n)
  const fator = Math.pow(1 + i, n)
  return Math.round(pv * fator + pmt * ((fator - 1) / i))
}

/** Aporte mensal necessário para chegar ao alvo em N meses. */
export function aporteNecessario(params: {
  alvoCentavos: number
  saldoAtualCentavos: number
  meses: number
  rendimentoAnualBps: number
}): number {
  const { alvoCentavos, saldoAtualCentavos, meses, rendimentoAnualBps } = params
  if (meses <= 0) return Math.max(0, alvoCentavos - saldoAtualCentavos)
  const i = bpsParaTaxa(anualParaMensalBps(rendimentoAnualBps))
  if (i === 0) return Math.max(0, Math.ceil((alvoCentavos - saldoAtualCentavos) / meses))
  const fator = Math.pow(1 + i, meses)
  const faltante = alvoCentavos - saldoAtualCentavos * fator
  if (faltante <= 0) return 0
  return Math.ceil(faltante / ((fator - 1) / i))
}

/** Em quantos meses o aporte atual chega ao alvo. null = nunca chega. */
export function mesesParaMeta(params: {
  alvoCentavos: number
  saldoAtualCentavos: number
  aporteMensalCentavos: number
  rendimentoAnualBps: number
  limiteMeses?: number
}): number | null {
  const limite = params.limiteMeses ?? 1200
  if (params.saldoAtualCentavos >= params.alvoCentavos) return 0
  if (params.aporteMensalCentavos <= 0 && params.rendimentoAnualBps <= 0) return null

  const i = bpsParaTaxa(anualParaMensalBps(params.rendimentoAnualBps))
  let saldo = params.saldoAtualCentavos
  for (let mes = 1; mes <= limite; mes += 1) {
    saldo = Math.round(saldo * (1 + i)) + params.aporteMensalCentavos
    if (saldo >= params.alvoCentavos) return mes
  }
  return null
}

export interface ProjecaoMeta {
  mesesRestantes: number | null
  dataPrevista: Date | null
  aporteNecessarioCentavos: number
  noPrazo: boolean
  percentual: number
  serie: { mes: number; saldoCentavos: number }[]
}

export function projetarMeta(params: {
  alvoCentavos: number
  saldoAtualCentavos: number
  aporteMensalCentavos: number
  rendimentoAnualBps: number
  dataAlvo?: Date | null
  hoje?: Date
}): ProjecaoMeta {
  const hoje = params.hoje ?? new Date()
  const mesesRestantes = mesesParaMeta(params)

  const mesesAteAlvo = params.dataAlvo
    ? Math.max(
        0,
        (params.dataAlvo.getUTCFullYear() - hoje.getUTCFullYear()) * 12 +
          (params.dataAlvo.getUTCMonth() - hoje.getUTCMonth()),
      )
    : null

  const dataPrevista =
    mesesRestantes === null
      ? null
      : new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() + mesesRestantes, 1))

  const horizonte = mesesAteAlvo ?? mesesRestantes ?? 60
  const i = bpsParaTaxa(anualParaMensalBps(params.rendimentoAnualBps))
  const serie: ProjecaoMeta["serie"] = []
  let saldo = params.saldoAtualCentavos
  for (let mes = 0; mes <= Math.min(horizonte, 600); mes += 1) {
    if (mes > 0) saldo = Math.round(saldo * (1 + i)) + params.aporteMensalCentavos
    serie.push({ mes, saldoCentavos: saldo })
  }

  return {
    mesesRestantes,
    dataPrevista,
    aporteNecessarioCentavos:
      mesesAteAlvo === null
        ? params.aporteMensalCentavos
        : aporteNecessario({
            alvoCentavos: params.alvoCentavos,
            saldoAtualCentavos: params.saldoAtualCentavos,
            meses: mesesAteAlvo,
            rendimentoAnualBps: params.rendimentoAnualBps,
          }),
    noPrazo: mesesAteAlvo === null || (mesesRestantes !== null && mesesRestantes <= mesesAteAlvo),
    percentual: params.alvoCentavos > 0 ? Math.min(100, (params.saldoAtualCentavos / params.alvoCentavos) * 100) : 0,
    serie,
  }
}

// ============================================================
// APOSENTADORIA
// ============================================================

export interface ProjecaoAposentadoria {
  patrimonioNaAposentadoriaCentavos: number
  /// Renda mensal sustentável pela regra dos 4% ao ano (retirada segura).
  rendaMensalSustentavelCentavos: number
  /// Patrimônio necessário para sustentar o gasto desejado.
  patrimonioAlvoCentavos: number
  faltaCentavos: number
  aporteNecessarioCentavos: number
  /// Idade em que o patrimônio alcança o alvo mantendo o aporte atual.
  idadeIndependencia: number | null
  serie: { idade: number; patrimonioCentavos: number }[]
}

/**
 * Projeta aposentadoria em termos reais (acima da inflação).
 *
 * O rendimento entra descontado da inflação de propósito: projetar 10% nominais
 * com 5% de inflação mostra um número que não compra o que parece comprar.
 * A taxa de retirada segura padrão é 4% a.a., referência consolidada para
 * carteiras de longo prazo.
 */
export function projetarAposentadoria(params: {
  idadeAtual: number
  idadeAposentadoria: number
  patrimonioAtualCentavos: number
  aporteMensalCentavos: number
  /// Já real (líquido de inflação), em bps. Ex.: 500 = 5% a.a. reais.
  rendimentoRealAnualBps: number
  gastoMensalDesejadoCentavos: number
  taxaRetiradaAnualBps?: number
}): ProjecaoAposentadoria {
  const anos = Math.max(0, params.idadeAposentadoria - params.idadeAtual)
  const meses = anos * 12
  const retirada = bpsParaTaxa(params.taxaRetiradaAnualBps ?? 400)

  const serie: ProjecaoAposentadoria["serie"] = []
  const i = bpsParaTaxa(anualParaMensalBps(params.rendimentoRealAnualBps))
  let saldo = params.patrimonioAtualCentavos
  serie.push({ idade: params.idadeAtual, patrimonioCentavos: saldo })
  for (let ano = 1; ano <= Math.max(anos, 1); ano += 1) {
    for (let mes = 0; mes < 12; mes += 1) saldo = Math.round(saldo * (1 + i)) + params.aporteMensalCentavos
    serie.push({ idade: params.idadeAtual + ano, patrimonioCentavos: saldo })
  }

  const patrimonio = valorFuturo({
    saldoInicialCentavos: params.patrimonioAtualCentavos,
    aporteMensalCentavos: params.aporteMensalCentavos,
    meses,
    rendimentoAnualBps: params.rendimentoRealAnualBps,
  })

  const alvo = Math.round((params.gastoMensalDesejadoCentavos * 12) / retirada)

  let idadeIndependencia: number | null = null
  let saldoBusca = params.patrimonioAtualCentavos
  for (let mes = 1; mes <= 12 * 70; mes += 1) {
    saldoBusca = Math.round(saldoBusca * (1 + i)) + params.aporteMensalCentavos
    if (saldoBusca >= alvo) {
      idadeIndependencia = Math.round((params.idadeAtual + mes / 12) * 10) / 10
      break
    }
  }

  return {
    patrimonioNaAposentadoriaCentavos: patrimonio,
    rendaMensalSustentavelCentavos: Math.round((patrimonio * retirada) / 12),
    patrimonioAlvoCentavos: alvo,
    faltaCentavos: Math.max(0, alvo - patrimonio),
    aporteNecessarioCentavos: aporteNecessario({
      alvoCentavos: alvo,
      saldoAtualCentavos: params.patrimonioAtualCentavos,
      meses: Math.max(1, meses),
      rendimentoAnualBps: params.rendimentoRealAnualBps,
    }),
    idadeIndependencia,
    serie,
  }
}

// ============================================================
// RESERVA DE EMERGÊNCIA
// ============================================================

export function reservaIdeal(custoFixoMensalCentavos: number, meses = 6): number {
  return custoFixoMensalCentavos * meses
}

/** Quantos meses o saldo atual sustenta o padrão de vida sem nenhuma receita. */
export function mesesDeFolga(saldoLiquidoCentavos: number, custoMensalCentavos: number): number {
  if (custoMensalCentavos <= 0) return Infinity
  return Math.round((saldoLiquidoCentavos / custoMensalCentavos) * 10) / 10
}

// ============================================================
// PROJEÇÃO DE FLUXO DE CAIXA
// ============================================================

export interface EventoProjetado {
  competencia: string
  receitasCentavos: number
  despesasCentavos: number
  saldoMesCentavos: number
  saldoAcumuladoCentavos: number
  /// Fica true quando a projeção prevê saldo negativo — o alerta nasce daqui.
  negativo: boolean
}

/**
 * Projeta o caixa mês a mês somando o que já é conhecido do futuro:
 * recorrências ativas, parcelas de dívida e aportes de meta, sobre a média
 * das despesas variáveis observadas.
 */
export function projetarFluxo(params: {
  competenciaInicial: string
  meses: number
  saldoInicialCentavos: number
  receitasFixasCentavos: number
  despesasFixasCentavos: number
  despesasVariaveisMediaCentavos: number
  /// Lançamentos pontuais já conhecidos: IPVA, IPTU, viagem marcada.
  eventos?: { competencia: string; valorCentavos: number; tipo: "RECEITA" | "DESPESA" }[]
  proximaCompetencia: (competencia: string, delta: number) => string
}): EventoProjetado[] {
  const linhas: EventoProjetado[] = []
  let acumulado = params.saldoInicialCentavos

  for (let m = 0; m < params.meses; m += 1) {
    const competencia = params.proximaCompetencia(params.competenciaInicial, m)
    const doMes = (params.eventos ?? []).filter((evento) => evento.competencia === competencia)
    const receitas =
      params.receitasFixasCentavos +
      doMes.filter((e) => e.tipo === "RECEITA").reduce((soma, e) => soma + e.valorCentavos, 0)
    const despesas =
      params.despesasFixasCentavos +
      params.despesasVariaveisMediaCentavos +
      doMes.filter((e) => e.tipo === "DESPESA").reduce((soma, e) => soma + e.valorCentavos, 0)

    const saldoMes = receitas - despesas
    acumulado += saldoMes
    linhas.push({
      competencia,
      receitasCentavos: receitas,
      despesasCentavos: despesas,
      saldoMesCentavos: saldoMes,
      saldoAcumuladoCentavos: acumulado,
      negativo: acumulado < 0,
    })
  }
  return linhas
}

// ============================================================
// MEI
// ============================================================

export interface SituacaoMei {
  faturamentoAnoCentavos: number
  limiteAnualCentavos: number
  percentualUsado: number
  /// Sobra de limite até o fim do ano.
  disponivelCentavos: number
  /// Média mensal do que já foi faturado no ano.
  mediaMensalCentavos: number
  /// Projeção do fechamento do ano mantendo a média.
  projecaoAnualCentavos: number
  /// Excesso até 20% permite pagar a diferença e seguir MEI no ano seguinte;
  /// acima disso o desenquadramento é retroativo ao início do ano.
  risco: "OK" | "ATENCAO" | "ESTOURO_ATE_20" | "ESTOURO_ACIMA_20"
  mesQueEstoura: string | null
  /// Teto de faturamento por mês restante para fechar o ano dentro do limite.
  tetoMensalRestanteCentavos: number
}

export function avaliarMei(params: {
  faturamentoPorCompetencia: { competencia: string; valorCentavos: number }[]
  limiteAnualCentavos: number
  /// Mês corrente do ano (1-12). Define quantos meses já correram.
  mesAtual: number
  ano: number
}): SituacaoMei {
  const doAno = params.faturamentoPorCompetencia.filter((linha) => linha.competencia.startsWith(String(params.ano)))
  const total = doAno.reduce((soma, linha) => soma + linha.valorCentavos, 0)
  const mesesCorridos = Math.max(1, params.mesAtual)
  const media = Math.round(total / mesesCorridos)
  const projecao = media * 12
  const disponivel = params.limiteAnualCentavos - total
  const percentual = (total / params.limiteAnualCentavos) * 100

  let mesQueEstoura: string | null = null
  let acumulado = 0
  const ordenado = [...doAno].sort((a, b) => a.competencia.localeCompare(b.competencia))
  for (const linha of ordenado) {
    acumulado += linha.valorCentavos
    if (acumulado > params.limiteAnualCentavos) {
      mesQueEstoura = linha.competencia
      break
    }
  }
  if (!mesQueEstoura && media > 0) {
    const mesesAteEstourar = Math.ceil(disponivel / media)
    const mes = mesesCorridos + mesesAteEstourar
    if (mes <= 12) mesQueEstoura = `${params.ano}-${String(mes).padStart(2, "0")}`
  }

  const excedente = total - params.limiteAnualCentavos
  const risco: SituacaoMei["risco"] =
    excedente > params.limiteAnualCentavos * 0.2
      ? "ESTOURO_ACIMA_20"
      : excedente > 0
        ? "ESTOURO_ATE_20"
        : projecao > params.limiteAnualCentavos || percentual > 80
          ? "ATENCAO"
          : "OK"

  const mesesRestantes = Math.max(1, 12 - mesesCorridos)
  return {
    faturamentoAnoCentavos: total,
    limiteAnualCentavos: params.limiteAnualCentavos,
    percentualUsado: Math.round(percentual * 10) / 10,
    disponivelCentavos: disponivel,
    mediaMensalCentavos: media,
    projecaoAnualCentavos: projecao,
    risco,
    mesQueEstoura,
    tetoMensalRestanteCentavos: Math.max(0, Math.floor(disponivel / mesesRestantes)),
  }
}

/**
 * Limite proporcional do primeiro ano: quem abre o MEI em julho não tem os
 * 81 mil cheios — tem 1/12 do limite por mês de atividade, incluindo o de abertura.
 */
export function limiteProporcionalMei(limiteAnualCentavos: number, mesAbertura1a12: number): number {
  const meses = 12 - mesAbertura1a12 + 1
  return Math.round((limiteAnualCentavos / 12) * meses)
}
