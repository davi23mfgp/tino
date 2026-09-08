/**
 * Métricas do negócio para o painel do admin.
 *
 * Três números bastam no começo, e é o que a literatura de SaaS brasileira
 * repete (Superlógica, PipeRun, Metrikia): MRR, para saber se a receita cresce;
 * churn, para saber se o cliente fica; e inadimplência, para saber se o que foi
 * vendido está sendo recebido. LTV e CAC ficam de fora enquanto não houver
 * gasto de aquisição para dividir — indicador sem dado é número inventado, e o
 * app inteiro existe para não fazer isso.
 *
 * Tudo em centavos, como no resto: MRR em float acumularia erro justo no número
 * que o dono usa para decidir preço.
 */

import type { CicloCobranca, StatusAssinatura } from "@prisma/client"

export interface AssinaturaParaMetrica {
  status: StatusAssinatura
  ciclo: CicloCobranca
  valorCentavos: number
}

/**
 * Receita recorrente mensal.
 *
 * O plano anual entra pelo duodécimo, não pelo valor cheio: contar R$ 199 de
 * uma anual como receita do mês faria o MRR pular em janeiro e despencar em
 * fevereiro sem que nada tivesse acontecido no negócio.
 *
 * Só assinatura ATIVA conta. Quem está em teste ainda não pagou nada, e quem
 * está inadimplente é receita contratada que não entrou — mostrar as duas no
 * MRR é a forma mais rápida de acreditar num faturamento que não existe.
 */
export function mrrCentavos(assinaturas: AssinaturaParaMetrica[]): number {
  return assinaturas
    .filter((linha) => linha.status === "ATIVA")
    .reduce((soma, linha) => soma + (linha.ciclo === "ANUAL" ? Math.round(linha.valorCentavos / 12) : linha.valorCentavos), 0)
}

/** MRR travado em inadimplência: contratado, vencido e ainda não recebido. */
export function mrrEmRiscoCentavos(assinaturas: AssinaturaParaMetrica[]): number {
  return assinaturas
    .filter((linha) => linha.status === "INADIMPLENTE")
    .reduce((soma, linha) => soma + (linha.ciclo === "ANUAL" ? Math.round(linha.valorCentavos / 12) : linha.valorCentavos), 0)
}

/**
 * Churn do período, em pontos-base.
 *
 * Cancelados no período sobre a base que existia no início dele. Base zero
 * devolve zero, e não uma divisão por zero disfarçada de 100%: sem cliente no
 * início do mês não houve cancelamento nenhum a medir.
 */
export function churnBps(canceladosNoPeriodo: number, ativosNoInicio: number): number {
  if (ativosNoInicio <= 0) return 0
  return Math.round((canceladosNoPeriodo / ativosNoInicio) * 10_000)
}

/** Receita média por conta ativa. Zero ativos devolve zero. */
export function arpuCentavos(assinaturas: AssinaturaParaMetrica[]): number {
  const ativas = assinaturas.filter((linha) => linha.status === "ATIVA").length
  if (ativas === 0) return 0
  return Math.round(mrrCentavos(assinaturas) / ativas)
}

export interface ContagemPorStatus {
  TESTE: number
  PENDENTE: number
  ATIVA: number
  INADIMPLENTE: number
  CANCELADA: number
}

export function contarPorStatus(assinaturas: { status: StatusAssinatura }[]): ContagemPorStatus {
  const zerado: ContagemPorStatus = { TESTE: 0, PENDENTE: 0, ATIVA: 0, INADIMPLENTE: 0, CANCELADA: 0 }
  for (const linha of assinaturas) zerado[linha.status] += 1
  return zerado
}
