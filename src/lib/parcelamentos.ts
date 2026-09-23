/**
 * Compras parceladas no cartão.
 *
 * O parcelamento é o que mais estraga previsão de orçamento no Brasil: a compra
 * aparece uma vez no extrato e depois some, mas continua tomando um pedaço de
 * cada fatura por meses. Aqui cada parcela vira uma linha datada, para que a
 * projeção mostre o compromisso antes de ele chegar.
 */

import type { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { competenciaMaisMeses, diaSeguro, partesCompetencia } from "@/lib/datas"
import { ratear } from "@/lib/dinheiro"

export interface EntradaParcelamento {
  larId: string
  contaId: string
  descricao: string
  estabelecimento?: string | null
  categoriaId?: string | null
  valorTotalCentavos: number
  parcelasTotal: number
  parcelasPagas?: number
  dataCompra: Date
  primeiraCompetencia: string
  diaVencimento: number
}

/**
 * Cria o parcelamento e todas as parcelas.
 *
 * O valor total é rateado centavo a centavo: R$ 2.970,96 em 12x não é
 * 12 × R$ 247,58 exatos, e é essa diferença de centavos que faz a soma das
 * parcelas não bater com a fatura do banco.
 */
export async function criarParcelamento(entrada: EntradaParcelamento, cliente: Prisma.TransactionClient = prisma) {
  const valores = ratear(entrada.valorTotalCentavos, entrada.parcelasTotal)
  const pagas = entrada.parcelasPagas ?? 0

  return cliente.parcelamento.create({
    data: {
      larId: entrada.larId,
      contaId: entrada.contaId,
      descricao: entrada.descricao,
      estabelecimento: entrada.estabelecimento ?? null,
      categoriaId: entrada.categoriaId ?? null,
      valorTotalCentavos: entrada.valorTotalCentavos,
      parcelaCentavos: valores[0],
      parcelasTotal: entrada.parcelasTotal,
      parcelasPagas: pagas,
      dataCompra: entrada.dataCompra,
      primeiraCompetencia: entrada.primeiraCompetencia,
      parcelas: {
        create: valores.map((valorCentavos, indice) => {
          const competencia = competenciaMaisMeses(entrada.primeiraCompetencia, indice)
          const { ano, mes } = partesCompetencia(competencia)
          return {
            numero: indice + 1,
            competencia,
            vencimento: diaSeguro(ano, mes, entrada.diaVencimento),
            valorCentavos,
            paga: indice < pagas,
          }
        }),
      },
    },
    include: { parcelas: { orderBy: { numero: "asc" } } },
  })
}

export interface CompromissoMensal {
  competencia: string
  totalCentavos: number
  itens: { parcelamentoId: string; descricao: string; numero: number; de: number; valorCentavos: number }[]
}

/**
 * Quanto de parcela já está comprometido em cada mês à frente.
 * É o número que entra na projeção de caixa e no plano de pagamento.
 */
export async function compromissosFuturos(larId: string, meses = 18): Promise<CompromissoMensal[]> {
  const parcelamentos = await prisma.parcelamento.findMany({
    where: { larId, ativo: true },
    include: { parcelas: { where: { paga: false }, orderBy: { numero: "asc" } } },
  })

  const porCompetencia = new Map<string, CompromissoMensal>()

  for (const parcelamento of parcelamentos) {
    for (const parcela of parcelamento.parcelas) {
      const linha = porCompetencia.get(parcela.competencia) ?? {
        competencia: parcela.competencia,
        totalCentavos: 0,
        itens: [],
      }
      linha.totalCentavos += parcela.valorCentavos
      linha.itens.push({
        parcelamentoId: parcelamento.id,
        descricao: parcelamento.descricao,
        numero: parcela.numero,
        de: parcelamento.parcelasTotal,
        valorCentavos: parcela.valorCentavos,
      })
      porCompetencia.set(parcela.competencia, linha)
    }
  }

  return [...porCompetencia.values()]
    .sort((a, b) => a.competencia.localeCompare(b.competencia))
    .slice(0, meses)
    .map((linha) => ({ ...linha, itens: linha.itens.sort((a, b) => b.valorCentavos - a.valorCentavos) }))
}

export interface ResumoParcelamentos {
  emAndamento: number
  valorTotalCentavos: number
  jaPagoCentavos: number
  restanteCentavos: number
  percentualPago: number
  ultimaCompetencia: string | null
  /// Quanto sai por mês daqui em diante, no mês mais pesado.
  maiorMensalCentavos: number
}

export async function resumoParcelamentos(larId: string): Promise<ResumoParcelamentos> {
  const parcelamentos = await prisma.parcelamento.findMany({
    where: { larId, ativo: true },
    include: { parcelas: true },
  })

  const todas = parcelamentos.flatMap((parcelamento) => parcelamento.parcelas)
  const total = todas.reduce((soma, parcela) => soma + parcela.valorCentavos, 0)
  const pago = todas.filter((parcela) => parcela.paga).reduce((soma, parcela) => soma + parcela.valorCentavos, 0)

  const porMes = new Map<string, number>()
  for (const parcela of todas.filter((p) => !p.paga)) {
    porMes.set(parcela.competencia, (porMes.get(parcela.competencia) ?? 0) + parcela.valorCentavos)
  }

  const competencias = todas.map((parcela) => parcela.competencia).sort()

  return {
    emAndamento: parcelamentos.filter((p) => p.parcelas.some((parcela) => !parcela.paga)).length,
    valorTotalCentavos: total,
    jaPagoCentavos: pago,
    restanteCentavos: total - pago,
    percentualPago: total > 0 ? Math.round((pago / total) * 100) : 0,
    ultimaCompetencia: competencias[competencias.length - 1] ?? null,
    maiorMensalCentavos: Math.max(0, ...porMes.values()),
  }
}
