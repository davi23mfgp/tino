/**
 * Diagnóstico financeiro — o parecer que um contador entregaria.
 *
 * Três peças, na ordem em que um profissional as monta:
 *
 * 1. **DRE pessoal** — de onde veio e para onde foi o dinheiro no período.
 * 2. **Balanço** — o que você tem, o que você deve, o que sobra (patrimônio).
 * 3. **Indicadores** — as razões entre esses números, cada uma com a faixa de
 *    referência que separa saudável de arriscado.
 *
 * O que difere isto de um painel bonito: cada indicador vem com o número, a
 * referência e o que fazer. Percentual sem referência não informa nada — 22% de
 * comprometimento de renda é bom ou ruim? Só dá para saber contra o limite.
 *
 * Nada aqui é recomendação de investimento. É leitura de demonstrativo, que é
 * exatamente o que um contador faz.
 */

import { formatarDecimal, formatarMoeda } from "@/lib/dinheiro"
import { rotuloCompetencia } from "@/lib/datas"
import type { Panorama } from "@/lib/tino/panorama"

export type Faixa = "BOM" | "ATENCAO" | "CRITICO" | "SEM_DADO"

export interface Indicador {
  chave: string
  nome: string
  /// Valor já formatado para leitura ("28%", "R$ 1.240,00", "3,2 meses").
  valor: string
  /// Valor cru, para gráfico e ordenação.
  numero: number
  faixa: Faixa
  /// A referência usada — sem ela, o número não diz se é bom ou ruim.
  referencia: string
  /// O que o número significa, em uma frase.
  leitura: string
}

export interface LinhaDre {
  grupo: string
  totalCentavos: number
  percentualDaReceita: number
  itens: { nome: string; totalCentavos: number; essencial: boolean }[]
}

export interface Dre {
  competencia: string
  receitasCentavos: number
  despesasCentavos: number
  resultadoCentavos: number
  /// Despesas que se repetem todo mês independentemente do uso.
  custoFixoCentavos: number
  custoVariavelCentavos: number
  essenciaisCentavos: number
  supefluasCentavos: number
  grupos: LinhaDre[]
}

export interface Balanco {
  /// Dinheiro disponível hoje (não inclui limite de cartão).
  ativoCirculanteCentavos: number
  /// Reservas e metas com saldo guardado.
  ativoAplicadoCentavos: number
  ativoTotalCentavos: number
  /// Fatura de cartão + parcelas que vencem nos próximos 12 meses.
  passivoCurtoPrazoCentavos: number
  /// Dívidas e parcelas além de 12 meses.
  passivoLongoPrazoCentavos: number
  passivoTotalCentavos: number
  patrimonioLiquidoCentavos: number
}

export interface Prioridade {
  ordem: number
  titulo: string
  porque: string
  acao: string
  /// Efeito estimado em reais por mês, quando dá para calcular.
  impactoMensalCentavos?: number
}

export interface Diagnostico {
  competencia: string
  dre: Dre
  balanco: Balanco
  indicadores: Indicador[]
  /// 0 a 100. Média ponderada das faixas — serve para ver movimento no tempo.
  nota: number
  situacao: "SAUDAVEL" | "ATENCAO" | "APERTADO" | "CRITICO"
  pontosFortes: string[]
  riscos: string[]
  prioridades: Prioridade[]
  /// Texto de abertura, como um contador escreveria no topo do parecer.
  parecer: string
}

// ============================================================
// REFERÊNCIAS
// ============================================================

/**
 * Faixas usadas no parecer. São referências de mercado e de educação
 * financeira, não regra legal — por isso ficam num lugar só, nomeadas, em vez
 * de espalhadas como números mágicos pelo código.
 */
const REFERENCIA = {
  /// Parcelas de dívida sobre renda. 30% é o teto que bancos usam em consignado.
  comprometimento: { bom: 2000, atencao: 3000 },
  /// Quanto da renda sobra por mês. Abaixo de 10% não se constrói reserva.
  taxaPoupanca: { bom: 2000, atencao: 1000 },
  /// Meses de custo essencial cobertos pelo dinheiro disponível.
  liquidez: { bom: 6, atencao: 3 },
  /// Custo fixo sobre renda. Acima de 60% o orçamento perde flexibilidade.
  custoFixo: { bom: 5000, atencao: 6000 },
  /// Dívida total sobre renda anual.
  endividamento: { bom: 3000, atencao: 10000 },
}

const bps = (parte: number, todo: number) => (todo <= 0 ? 0 : Math.round((parte / todo) * 10_000))
const pct = (valorBps: number) => `${(valorBps / 100).toFixed(0)}%`

/** Faixa por valor menor-melhor (comprometimento, custo fixo, endividamento). */
function faixaMenorMelhor(valor: number, limites: { bom: number; atencao: number }): Faixa {
  if (valor <= limites.bom) return "BOM"
  if (valor <= limites.atencao) return "ATENCAO"
  return "CRITICO"
}

/** Faixa por valor maior-melhor (taxa de poupança, liquidez). */
function faixaMaiorMelhor(valor: number, limites: { bom: number; atencao: number }): Faixa {
  if (valor >= limites.bom) return "BOM"
  if (valor >= limites.atencao) return "ATENCAO"
  return "CRITICO"
}

// ============================================================
// MONTAGEM
// ============================================================

export function montarDiagnostico(
  panorama: Panorama,
  extras: {
    /// Parcelas por competência, para separar passivo curto de longo prazo.
    compromissos: { competencia: string; totalCentavos: number }[]
    parcelamentosRestanteCentavos: number
  },
): Diagnostico {
  const receita = panorama.medias.receitaCentavos || panorama.mes.receitasCentavos
  /// Receita de fato lançada. Separada da declarada para o parecer não dar nota
  /// a uma sobra que ninguém viu acontecer.
  const rendaObservada = panorama.mes.receitasCentavos
  const despesa = panorama.mes.despesasCentavos || panorama.medias.despesaCentavos

  // ── DRE ─────────────────────────────────────────────────
  const porGrupo = new Map<string, LinhaDre>()
  for (const linha of panorama.mes.despesasPorCategoria) {
    const atual = porGrupo.get(linha.grupo) ?? {
      grupo: linha.grupo,
      totalCentavos: 0,
      percentualDaReceita: 0,
      itens: [],
    }
    atual.totalCentavos += linha.totalCentavos
    atual.itens.push({ nome: linha.nome, totalCentavos: linha.totalCentavos, essencial: linha.essencial })
    porGrupo.set(linha.grupo, atual)
  }

  const grupos = [...porGrupo.values()]
    .map((linha) => ({
      ...linha,
      percentualDaReceita: bps(linha.totalCentavos, receita),
      itens: linha.itens.sort((a, b) => b.totalCentavos - a.totalCentavos),
    }))
    .sort((a, b) => b.totalCentavos - a.totalCentavos)

  const essenciais = panorama.mes.despesasPorCategoria
    .filter((linha) => linha.essencial)
    .reduce((soma, linha) => soma + linha.totalCentavos, 0)

  const custoFixo = panorama.medias.custoFixoCentavos + panorama.dividas.parcelaMensalCentavos

  const dre: Dre = {
    competencia: panorama.competencia,
    receitasCentavos: panorama.mes.receitasCentavos,
    despesasCentavos: despesa,
    resultadoCentavos: panorama.mes.receitasCentavos - despesa,
    custoFixoCentavos: custoFixo,
    custoVariavelCentavos: Math.max(0, despesa - custoFixo),
    essenciaisCentavos: essenciais,
    supefluasCentavos: Math.max(0, despesa - essenciais),
    grupos,
  }

  // ── Balanço ─────────────────────────────────────────────
  const disponivel = panorama.saldoPorConta
    .filter((conta) => conta.tipo !== "CARTAO_CREDITO")
    .reduce((soma, conta) => soma + Math.max(0, conta.saldoCentavos), 0)

  const negativoEmConta = panorama.saldoPorConta
    .filter((conta) => conta.tipo !== "CARTAO_CREDITO")
    .reduce((soma, conta) => soma + Math.abs(Math.min(0, conta.saldoCentavos)), 0)

  const faturaAberta = panorama.saldoPorConta
    .filter((conta) => conta.tipo === "CARTAO_CREDITO")
    .reduce((soma, conta) => soma + Math.abs(Math.min(0, conta.saldoCentavos)), 0)

  const aplicado = panorama.metas.reduce((soma, meta) => soma + meta.saldoCentavos, 0)

  // Parcela que vence dentro de 12 meses é passivo circulante; o resto é longo
  // prazo. A separação é o que mostra o aperto do ano contra a dívida total.
  const doze = extras.compromissos.slice(0, 12).reduce((soma, linha) => soma + linha.totalCentavos, 0)
  const parcelasLongoPrazo = Math.max(0, extras.parcelamentosRestanteCentavos - doze)

  const passivoCurto = faturaAberta + negativoEmConta + doze
  const passivoLongo = parcelasLongoPrazo + panorama.dividas.totalCentavos

  const balanco: Balanco = {
    ativoCirculanteCentavos: disponivel,
    ativoAplicadoCentavos: aplicado,
    ativoTotalCentavos: disponivel + aplicado,
    passivoCurtoPrazoCentavos: passivoCurto,
    passivoLongoPrazoCentavos: passivoLongo,
    passivoTotalCentavos: passivoCurto + passivoLongo,
    patrimonioLiquidoCentavos: disponivel + aplicado - passivoCurto - passivoLongo,
  }

  // ── Indicadores ─────────────────────────────────────────
  const custoEssencialMensal =
    panorama.medias.custoEssencialCentavos || essenciais || panorama.medias.custoFixoCentavos || despesa

  const comprometimento = bps(panorama.dividas.parcelaMensalCentavos + doze / 12, receita)
  const taxaPoupanca = bps(Math.max(0, receita - despesa), receita)
  const liquidez = custoEssencialMensal > 0 ? disponivel / custoEssencialMensal : 0
  const custoFixoSobreRenda = bps(custoFixo, receita)
  const endividamento = bps(balanco.passivoTotalCentavos, receita * 12)
  const semDados = receita === 0

  const indicadores: Indicador[] = [
    {
      chave: "comprometimento",
      nome: "Comprometimento da renda",
      valor: pct(comprometimento),
      numero: comprometimento,
      faixa: semDados ? "SEM_DADO" : faixaMenorMelhor(comprometimento, REFERENCIA.comprometimento),
      referencia: "até 20% confortável · 30% é o teto usado por bancos",
      leitura:
        comprometimento > REFERENCIA.comprometimento.atencao
          ? "Parcelas tomam parte grande da renda. Sobra pouco para imprevisto, e imprevisto vira dívida nova."
          : "Parcelas cabem na renda sem sufocar o mês.",
    },
    {
      chave: "taxa-poupanca",
      nome: "Taxa de poupança",
      valor: pct(taxaPoupanca),
      numero: taxaPoupanca,
      // Sem receita lançada, o cálculo usa a renda que você declarou. Dar nota
      // a esse número seria elogiar uma sobra que ninguém viu acontecer.
      faixa: semDados || rendaObservada === 0 ? "SEM_DADO" : faixaMaiorMelhor(taxaPoupanca, REFERENCIA.taxaPoupanca),
      referencia: "20% ou mais constrói patrimônio · abaixo de 10% não forma reserva",
      leitura:
        rendaObservada === 0
          ? "Nenhuma receita foi lançada no mês, então esta conta usa a renda que você informou — não o que entrou de fato. Lance suas entradas para o número virar real."
          : taxaPoupanca <= 0
            ? "Você gasta tudo o que ganha, ou mais. Nesse ritmo o patrimônio não cresce."
            : `De cada R$ 100 que entram, sobram R$ ${(taxaPoupanca / 100).toFixed(0)}.`,
    },
    {
      chave: "liquidez",
      nome: "Meses de folga",
      valor: `${formatarDecimal(liquidez, 1)} meses`,
      numero: Math.round(liquidez * 10) / 10,
      faixa: semDados ? "SEM_DADO" : faixaMaiorMelhor(liquidez, REFERENCIA.liquidez),
      referencia: "6 meses de custo essencial é o alvo · abaixo de 3 é frágil",
      leitura:
        liquidez < 1
          ? "Sem nenhuma receita, o dinheiro disponível não cobre um mês."
          : `Sem nenhuma receita, o que você tem cobre ${formatarDecimal(liquidez, 1)} mês(es) do essencial.`,
    },
    {
      chave: "custo-fixo",
      nome: "Custo fixo sobre a renda",
      valor: pct(custoFixoSobreRenda),
      numero: custoFixoSobreRenda,
      faixa: semDados ? "SEM_DADO" : faixaMenorMelhor(custoFixoSobreRenda, REFERENCIA.custoFixo),
      referencia: "até 50% dá flexibilidade · acima de 60% o orçamento trava",
      leitura:
        custoFixoSobreRenda > REFERENCIA.custoFixo.atencao
          ? "Boa parte da renda já está comprometida antes de você decidir qualquer coisa. Cortar exige mexer em contrato, não em hábito."
          : "Sobra espaço no orçamento para escolhas e para absorver susto.",
    },
    {
      chave: "endividamento",
      nome: "Dívida sobre renda anual",
      valor: pct(endividamento),
      numero: endividamento,
      faixa: semDados ? "SEM_DADO" : faixaMenorMelhor(endividamento, REFERENCIA.endividamento),
      referencia: "até 30% administrável · acima de 100% compromete mais de um ano de renda",
      leitura: `Sua dívida total equivale a ${formatarDecimal(endividamento / 100 / 100 * 12, 1)} mês(es) de renda.`,
    },
    {
      chave: "essencial",
      nome: "Gasto essencial",
      valor: pct(bps(dre.essenciaisCentavos, despesa)),
      numero: bps(dre.essenciaisCentavos, despesa),
      faixa: "SEM_DADO",
      referencia: "sem faixa certa — depende do momento de vida",
      leitura:
        dre.supefluasCentavos > 0
          ? `${formatarMoeda(dre.supefluasCentavos)} do mês foram para categorias não essenciais. É onde o corte dói menos.`
          : "Quase tudo do mês foi essencial. Cortar aqui exige mudança maior, não ajuste fino.",
    },
  ]

  // ── Nota e situação ─────────────────────────────────────
  const pontuados = indicadores.filter((linha) => linha.faixa !== "SEM_DADO")
  const media =
    pontuados.length === 0
      ? 0
      : Math.round(
          pontuados.reduce(
            (soma, linha) => soma + (linha.faixa === "BOM" ? 100 : linha.faixa === "ATENCAO" ? 60 : 20),
            0,
          ) / pontuados.length,
        )

  // A média sozinha mente: quatro indicadores bons e um crítico davam nota 84
  // ao lado do rótulo "situação crítica". Em finanças o pior item manda —
  // estar sem reserva não é compensado por ter pouco custo fixo. Por isso a
  // nota tem teto pela pior faixa encontrada.
  const temCritico = pontuados.some((linha) => linha.faixa === "CRITICO")
  const teto = negativoEmConta > 0 ? 40 : temCritico ? 55 : 100
  const nota = Math.min(media, teto)

  const situacao: Diagnostico["situacao"] =
    negativoEmConta > 0 || nota < 35 ? "CRITICO" : nota < 55 ? "APERTADO" : nota < 75 ? "ATENCAO" : "SAUDAVEL"

  // ── Leitura ─────────────────────────────────────────────
  const pontosFortes: string[] = []
  const riscos: string[] = []

  for (const indicador of indicadores) {
    if (indicador.faixa === "BOM") pontosFortes.push(`${indicador.nome}: ${indicador.valor}. ${indicador.leitura}`)
    if (indicador.faixa === "CRITICO") riscos.push(`${indicador.nome}: ${indicador.valor}. ${indicador.leitura}`)
  }

  if (negativoEmConta > 0) {
    riscos.unshift(
      `Conta no negativo em ${formatarMoeda(negativoEmConta)}. Cheque especial cobra até 8% ao mês — mais que qualquer outra dívida comum.`,
    )
  }

  const primeiroNegativo = panorama.projecao.find((linha) => linha.negativo)
  if (primeiroNegativo) {
    riscos.push(
      `A projeção mostra o caixa negativo em ${rotuloCompetencia(primeiroNegativo.competencia)} se nada mudar.`,
    )
  }

  // ── Prioridades ─────────────────────────────────────────
  const prioridades: Prioridade[] = []

  if (negativoEmConta > 0) {
    prioridades.push({
      ordem: prioridades.length + 1,
      titulo: "Sair do cheque especial",
      porque: `É o juro mais caro que você paga. ${formatarMoeda(negativoEmConta)} a 8% ao mês custam ${formatarMoeda(Math.round(negativoEmConta * 0.08))} por mês só de juros.`,
      acao: "Direcionar toda a sobra do mês para zerar o saldo negativo antes de qualquer outra meta.",
      impactoMensalCentavos: Math.round(negativoEmConta * 0.08),
    })
  }

  const jurosAlto = panorama.dividas.lista.find((divida) => divida.jurosMensalBps >= 500)
  if (jurosAlto) {
    prioridades.push({
      ordem: prioridades.length + 1,
      titulo: `Renegociar ${jurosAlto.credor}`,
      porque: `Cobra ${formatarDecimal(jurosAlto.jurosMensalBps / 100, 2)}% ao mês sobre ${formatarMoeda(jurosAlto.saldoDevedorCentavos)}.`,
      acao: "Cotar portabilidade ou crédito com garantia. Trocar juro caro por barato reduz o total sem aumentar a dívida.",
      impactoMensalCentavos: Math.round(jurosAlto.saldoDevedorCentavos * (jurosAlto.jurosMensalBps / 10_000) * 0.5),
    })
  }

  if (taxaPoupanca < REFERENCIA.taxaPoupanca.atencao && dre.supefluasCentavos > 0) {
    const alvo = Math.round(dre.supefluasCentavos * 0.2)
    prioridades.push({
      ordem: prioridades.length + 1,
      titulo: "Abrir folga no mês",
      porque: `Sua sobra é ${pct(taxaPoupanca)} da renda. Abaixo de 10% não se forma reserva.`,
      acao: `Cortar 20% do que é não essencial libera cerca de ${formatarMoeda(alvo)} por mês.`,
      impactoMensalCentavos: alvo,
    })
  }

  if (liquidez < REFERENCIA.liquidez.atencao && negativoEmConta === 0) {
    prioridades.push({
      ordem: prioridades.length + 1,
      titulo: "Formar reserva de emergência",
      porque: `Hoje o disponível cobre ${formatarDecimal(liquidez, 1)} mês(es). O alvo é ${panorama.lar.mesesReserva}.`,
      acao: `Guardar até chegar a ${formatarMoeda(custoEssencialMensal * panorama.lar.mesesReserva)}, em algo com liquidez diária.`,
    })
  }

  if (panorama.mes.naoCategorizadas > 0) {
    prioridades.push({
      ordem: prioridades.length + 1,
      titulo: "Fechar a classificação do mês",
      porque: `${panorama.mes.naoCategorizadas} lançamento(s) sem categoria distorcem todo indicador acima.`,
      acao: "Classificar os pendentes. Cada correção vira regra e o próximo mês já vem classificado.",
    })
  }

  if (prioridades.length === 0) {
    prioridades.push({
      ordem: 1,
      titulo: "Manter e direcionar a sobra",
      porque: "Os indicadores estão nas faixas saudáveis.",
      acao: "Com reserva completa e sem dívida cara, a sobra pode ir para metas de prazo mais longo.",
    })
  }

  const parecer = montarParecer({ situacao, nota, dre, balanco, receita, negativoEmConta, liquidez, panorama })

  return {
    competencia: panorama.competencia,
    dre,
    balanco,
    indicadores,
    nota,
    situacao,
    pontosFortes,
    riscos,
    prioridades,
    parecer,
  }
}

/** Abertura do parecer: situação, número que a sustenta e o que fazer. */
function montarParecer(params: {
  situacao: Diagnostico["situacao"]
  nota: number
  dre: Dre
  balanco: Balanco
  receita: number
  negativoEmConta: number
  liquidez: number
  panorama: Panorama
}): string {
  const { situacao, dre, balanco, negativoEmConta, liquidez, panorama } = params

  const abertura = {
    SAUDAVEL: "Situação saudável.",
    ATENCAO: "Situação estável, com pontos a corrigir.",
    APERTADO: "Situação apertada.",
    CRITICO: "Situação crítica.",
  }[situacao]

  const linhas = [
    `${abertura} Em ${rotuloCompetencia(dre.competencia)} entraram ${formatarMoeda(dre.receitasCentavos)} e saíram ${formatarMoeda(dre.despesasCentavos)}, resultado de ${formatarMoeda(dre.resultadoCentavos)}.`,
    `Seu patrimônio líquido — o que você tem menos o que deve — é ${formatarMoeda(balanco.patrimonioLiquidoCentavos)}.`,
  ]

  if (negativoEmConta > 0) {
    linhas.push(
      `O ponto mais caro é o saldo negativo em conta (${formatarMoeda(negativoEmConta)}): ele consome dinheiro todo mês antes de qualquer decisão sua.`,
    )
  } else if (liquidez < 3) {
    linhas.push("A fragilidade principal é a falta de reserva: qualquer imprevisto hoje viraria dívida.")
  } else if (panorama.dividas.totalCentavos > 0) {
    linhas.push("Com a reserva de pé, o foco passa a ser reduzir o custo das dívidas em aberto.")
  }

  return linhas.join(" ")
}
