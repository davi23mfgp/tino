/**
 * Plano de pagamento — o "me ajuda a ir pagando".
 *
 * Junta as três coisas que na vida real disputam o mesmo dinheiro e que quase
 * nenhum app soma junto:
 * 1. saldo negativo em conta (cheque especial — o juro mais caro do país);
 * 2. fatura de cartão do mês;
 * 3. parcelas já compradas que vão cair nos próximos meses.
 *
 * A saída é um roteiro por mês: quanto sobra, para onde vai, o que fica de pé.
 */

import { bpsParaTaxa } from "@/lib/dinheiro"
import { competenciaMaisMeses } from "@/lib/datas"

export interface AlvoPagamento {
  id: string
  nome: string
  tipo: "CHEQUE_ESPECIAL" | "ROTATIVO" | "FATURA" | "PARCELAMENTO" | "EMPRESTIMO"
  saldoCentavos: number
  /// Juro que o saldo cobra por mês, em bps. Parcelamento sem juro entra 0.
  jurosMensalBps: number
  /// Mínimo que sai todo mês de qualquer jeito (parcela já contratada).
  minimoMensalCentavos: number
}

export interface PassoMensal {
  competencia: string
  rendaCentavos: number
  custoDeVidaCentavos: number
  parcelasFixasCentavos: number
  sobraCentavos: number
  /// Para onde a sobra foi neste mês.
  pagamentos: { id: string; nome: string; valorCentavos: number; motivo: string }[]
  jurosDoMesCentavos: number
  dividaRestanteCentavos: number
}

export interface PlanoPagamento {
  passos: PassoMensal[]
  mesesAteLimpar: number | null
  totalJurosCentavos: number
  /// Ordem de ataque, do mais caro para o mais barato.
  ordem: { id: string; nome: string; jurosMensalBps: number; saldoCentavos: number }[]
  /// O que fazer primeiro, em uma frase.
  primeiroPasso: string
  avisos: string[]
}

/**
 * Monta o plano.
 *
 * A ordem é sempre por juro (avalanche): com cheque especial em jogo, qualquer
 * outra ordem custa caro demais para ser defensável — 8% ao mês dobra a dívida
 * em menos de um ano.
 */
export function montarPlanoPagamento(params: {
  competenciaInicial: string
  alvos: AlvoPagamento[]
  rendaMensalCentavos: number
  custoDeVidaMensalCentavos: number
  /// Parcelas por competência que já estão contratadas e não dá para adiar.
  parcelasPorCompetencia?: Record<string, number>
  limiteMeses?: number
}): PlanoPagamento {
  const limite = params.limiteMeses ?? 60
  const alvos = params.alvos.map((alvo) => ({ ...alvo })).filter((alvo) => alvo.saldoCentavos > 0)
  const ordem = [...alvos]
    .sort((a, b) => b.jurosMensalBps - a.jurosMensalBps)
    .map((alvo) => ({ id: alvo.id, nome: alvo.nome, jurosMensalBps: alvo.jurosMensalBps, saldoCentavos: alvo.saldoCentavos }))

  const passos: PassoMensal[] = []
  const avisos: string[] = []
  let totalJuros = 0
  let mesesAteLimpar: number | null = null

  for (let m = 0; m < limite; m += 1) {
    const competencia = competenciaMaisMeses(params.competenciaInicial, m)
    const parcelasFixas = params.parcelasPorCompetencia?.[competencia] ?? 0

    // Juro incide antes de qualquer pagamento: é assim que o banco calcula, e
    // projetar o contrário faria o plano parecer mais rápido do que é.
    let jurosDoMes = 0
    for (const alvo of alvos) {
      if (alvo.saldoCentavos <= 0) continue
      const juros = Math.round(alvo.saldoCentavos * bpsParaTaxa(alvo.jurosMensalBps))
      alvo.saldoCentavos += juros
      jurosDoMes += juros
    }
    totalJuros += jurosDoMes

    const sobra = params.rendaMensalCentavos - params.custoDeVidaMensalCentavos - parcelasFixas
    const pagamentos: PassoMensal["pagamentos"] = []
    let disponivel = Math.max(0, sobra)

    if (sobra < 0 && m === 0) {
      avisos.push(
        "Neste mês as parcelas já contratadas mais o custo de vida passam da renda. Antes de pagar dívida, é preciso cortar despesa ou entrar com renda extra.",
      )
    }

    // Mínimos primeiro: deixar de pagar parcela contratada gera multa e
    // negativação, o que custa mais que o juro que se economizaria.
    for (const alvo of alvos) {
      if (alvo.saldoCentavos <= 0 || alvo.minimoMensalCentavos <= 0) continue
      const valor = Math.min(alvo.minimoMensalCentavos, alvo.saldoCentavos, disponivel)
      if (valor <= 0) continue
      alvo.saldoCentavos -= valor
      disponivel -= valor
      pagamentos.push({ id: alvo.id, nome: alvo.nome, valorCentavos: valor, motivo: "parcela mínima" })
    }

    // O que sobrou vai inteiro para a dívida mais cara viva.
    while (disponivel > 0) {
      const alvo = [...alvos]
        .filter((candidato) => candidato.saldoCentavos > 0)
        .sort((a, b) => b.jurosMensalBps - a.jurosMensalBps)[0]
      if (!alvo) break

      const valor = Math.min(disponivel, alvo.saldoCentavos)
      alvo.saldoCentavos -= valor
      disponivel -= valor

      const existente = pagamentos.find((pagamento) => pagamento.id === alvo.id)
      if (existente) {
        existente.valorCentavos += valor
        existente.motivo = "parcela mínima + sobra do mês"
      } else {
        pagamentos.push({ id: alvo.id, nome: alvo.nome, valorCentavos: valor, motivo: "maior juro da fila" })
      }
    }

    const restante = alvos.reduce((soma, alvo) => soma + Math.max(0, alvo.saldoCentavos), 0)
    passos.push({
      competencia,
      rendaCentavos: params.rendaMensalCentavos,
      custoDeVidaCentavos: params.custoDeVidaMensalCentavos,
      parcelasFixasCentavos: parcelasFixas,
      sobraCentavos: sobra,
      pagamentos,
      jurosDoMesCentavos: jurosDoMes,
      dividaRestanteCentavos: restante,
    })

    if (restante <= 0) {
      mesesAteLimpar = m + 1
      break
    }

    // Dívida cresceu mesmo com tudo o que havia: sem corte de gasto ou renda
    // nova, o plano não fecha. Melhor dizer isso do que projetar 60 meses de ilusão.
    if (m > 0 && restante >= passos[m - 1].dividaRestanteCentavos && sobra <= 0) {
      avisos.push(
        "Com a renda e o custo de vida atuais, a dívida cresce mais rápido do que os pagamentos. O plano só fecha cortando despesa, renegociando o juro ou aumentando a renda.",
      )
      break
    }
  }

  const maisCara = ordem[0]
  // Frase de INTERFACE, não de relatório: teto de 12 palavras, sem taxa e sem
  // jargão (SPEC-CALEN-PRECISO, PARTE 3). A taxa não sumiu do produto — ela
  // continua em `ordem[]`, que é o que a tela /plano desenha item a item. O
  // que ela deixou de fazer é abrir o Início, onde ninguém pediu por ela.
  const primeiroPasso = maisCara
    ? `Pague ${maisCara.nome} primeiro. Rende mais que qualquer outra.`
    : "Sem dívida aberta. A sobra pode ir para a reserva."

  return {
    passos,
    mesesAteLimpar,
    totalJurosCentavos: totalJuros,
    ordem,
    primeiroPasso,
    avisos,
  }
}
