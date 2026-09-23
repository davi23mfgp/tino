/**
 * Parcela lida na fatura vira compromisso nas faturas seguintes.
 *
 * A fatura mostra "10/12" e para aí; o que importa para a projeção são as duas
 * parcelas que ainda vêm. Cada compra parcelada importada vira (ou atualiza)
 * um parcelamento, com as parcelas já cobradas marcadas como pagas e as
 * restantes em aberto — é delas que vivem a projeção e o plano de pagamento.
 *
 * O mês de cada parcela sai do vencimento impresso na fatura: a parcela 10
 * está na fatura que vence em setembro, então a 11 está na de outubro. O que
 * é estimativa, e está dito aqui: o valor das parcelas restantes é o da
 * parcela atual. Parcela de cartão é fixa; a diferença, quando há, é de
 * centavos de arredondamento na última.
 */

import type { Prisma } from "@prisma/client"

import { limparDescricao } from "@/lib/categorizar"
import { competenciaMaisMeses } from "@/lib/datas"
import { criarParcelamento } from "@/lib/parcelamentos"

export interface LancamentoParcelado {
  descricao: string
  descricaoOriginal?: string
  valorCentavos: number
  categoriaId?: string | null
  parcelaAtual: number
  parcelasTotal: number
  dataCompra: Date
  /// "AAAA-MM" da fatura em que esta parcela foi cobrada.
  competenciaFatura: string
}

export interface MesComprometido {
  competencia: string
  totalCentavos: number
}

export interface ParcelasFuturas {
  compras: number
  totalCentavos: number
  /// Só quando a competência da fatura é conhecida; sem ela, o mês seria chute.
  porMes: MesComprometido[]
}

/** O que as parcelas desta fatura já comprometem nas próximas. Puro, para a prévia. */
export function projetarParcelasFuturas(
  lancamentos: { valorCentavos: number; parcelaAtual?: number; parcelasTotal?: number; tipo: string }[],
  competenciaFatura?: string,
): ParcelasFuturas {
  const porMes = new Map<string, number>()
  let compras = 0
  let totalCentavos = 0
  for (const lancamento of lancamentos) {
    const { parcelaAtual: atual, parcelasTotal: total } = lancamento
    if (lancamento.tipo !== "DESPESA" || !atual || !total || atual >= total) continue
    compras += 1
    totalCentavos += (total - atual) * lancamento.valorCentavos
    if (!competenciaFatura) continue
    for (let mesesAFrente = 1; mesesAFrente <= total - atual; mesesAFrente += 1) {
      const competencia = competenciaMaisMeses(competenciaFatura, mesesAFrente)
      porMes.set(competencia, (porMes.get(competencia) ?? 0) + lancamento.valorCentavos)
    }
  }
  return {
    compras,
    totalCentavos,
    porMes: [...porMes.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([competencia, total]) => ({ competencia, totalCentavos: total })),
  }
}

/**
 * Cria o parcelamento na primeira vez que a compra aparece e, nas faturas
 * seguintes, só marca como paga a parcela que chegou. Reimportar a mesma
 * fatura não duplica nada.
 */
export async function sincronizarParcelamentos(
  tx: Prisma.TransactionClient,
  params: { larId: string; contaId: string; diaVencimento: number; lancamentos: LancamentoParcelado[] },
) {
  for (const lancamento of params.lancamentos) {
    const { parcelaAtual: atual, parcelasTotal: total } = lancamento
    if (!(total >= 2 && atual >= 1 && atual <= total)) continue

    const estabelecimento = limparDescricao(lancamento.descricaoOriginal ?? lancamento.descricao)
    const inicioDoDia = new Date(lancamento.dataCompra)
    inicioDoDia.setUTCHours(0, 0, 0, 0)
    const candidatos = await tx.parcelamento.findMany({
      where: {
        larId: params.larId,
        contaId: params.contaId,
        parcelasTotal: total,
        dataCompra: { gte: inicioDoDia, lt: new Date(inicioDoDia.getTime() + 86_400_000) },
      },
    })
    // Mesmo lojista, ou o mesmo valor de parcela — este último pega o
    // parcelamento que o usuário cadastrou à mão com outro nome.
    const existente = candidatos.find(
      (candidato) =>
        candidato.estabelecimento === estabelecimento || Math.abs(candidato.parcelaCentavos - lancamento.valorCentavos) <= 2,
    )

    if (existente) {
      await tx.parcelaCompra.updateMany({
        where: { parcelamentoId: existente.id, numero: { lte: atual }, paga: false },
        data: { paga: true, pagaEm: new Date() },
      })
      if (existente.parcelasPagas < atual) {
        await tx.parcelamento.update({ where: { id: existente.id }, data: { parcelasPagas: atual } })
      }
      continue
    }

    // Última parcela sem parcelamento anterior: não há nada à frente a projetar.
    if (atual === total) continue

    await criarParcelamento(
      {
        larId: params.larId,
        contaId: params.contaId,
        descricao: lancamento.descricao.replace(/\s*\(\d{1,2}\/\d{1,2}\)$/, ""),
        estabelecimento,
        categoriaId: lancamento.categoriaId ?? null,
        valorTotalCentavos: lancamento.valorCentavos * total,
        parcelasTotal: total,
        parcelasPagas: atual,
        dataCompra: lancamento.dataCompra,
        primeiraCompetencia: competenciaMaisMeses(lancamento.competenciaFatura, -(atual - 1)),
        diaVencimento: params.diaVencimento,
      },
      tx,
    )
  }
}
