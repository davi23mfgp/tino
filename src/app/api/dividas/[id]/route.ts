import { prisma } from "@/lib/prisma"
import { ErroDeUso, comSessao, corpo, ok } from "@/lib/api"

type Contexto = { params: Promise<{ id: string }> }

/**
 * Editar e excluir uma dívida.
 *
 * Até 19/10/2026 só existia cadastrar: quem errava o juro, ou quitava a dívida,
 * ficava com o plano de pagamento contando com ela para sempre (revisão de uso,
 * docs/pesquisas/2026-10-19-revisao-de-uso.md).
 */

/** Centavos ou bps vindos do cliente: inteiro, não negativo e que cabe no banco. */
function inteiro(valor: unknown, rotulo: string, minimo = 0) {
  const numero = Number(valor)
  if (!Number.isSafeInteger(numero) || numero < minimo || numero > 2_147_483_647) throw new ErroDeUso(`${rotulo}: valor inválido.`)
  return numero
}

export const PATCH = comSessao<Contexto>(async (sessao, requisicao, contexto) => {
  const { id } = await contexto.params
  const atual = await prisma.divida.findFirst({ where: { id, larId: sessao.larId } })
  if (!atual) throw new ErroDeUso("Dívida não encontrada.", 404)

  const dados = await corpo<{
    credor?: string
    saldoDevedorCentavos?: number
    jurosMensalBps?: number
    parcelaCentavos?: number
    parcelasTotal?: number | null
    parcelasPagas?: number
    diaVencimento?: number
    quitada?: boolean
  }>(requisicao)

  if (dados.credor !== undefined && !dados.credor.trim()) throw new ErroDeUso("Informe para quem você deve.")
  if (dados.diaVencimento !== undefined && (inteiro(dados.diaVencimento, "Dia do vencimento", 1) > 31)) throw new ErroDeUso("Dia do vencimento: de 1 a 31.")

  const divida = await prisma.divida.update({
    where: { id },
    data: {
      ...(dados.credor !== undefined ? { credor: dados.credor.trim().slice(0, 120) } : {}),
      ...(dados.saldoDevedorCentavos !== undefined ? { saldoDevedorCentavos: inteiro(dados.saldoDevedorCentavos, "Saldo a quitar") } : {}),
      ...(dados.jurosMensalBps !== undefined ? { jurosMensalBps: inteiro(dados.jurosMensalBps, "Juros ao mês") } : {}),
      ...(dados.parcelaCentavos !== undefined ? { parcelaCentavos: inteiro(dados.parcelaCentavos, "Parcela") } : {}),
      ...(dados.parcelasTotal !== undefined ? { parcelasTotal: dados.parcelasTotal === null ? null : inteiro(dados.parcelasTotal, "Total de parcelas", 1) } : {}),
      ...(dados.parcelasPagas !== undefined ? { parcelasPagas: inteiro(dados.parcelasPagas, "Parcelas pagas") } : {}),
      ...(dados.diaVencimento !== undefined ? { diaVencimento: dados.diaVencimento } : {}),
      // Quitar guarda a data: o histórico mostra quando a pessoa ficou livre.
      ...(dados.quitada !== undefined ? { quitada: dados.quitada, quitadaEm: dados.quitada ? (atual.quitadaEm ?? new Date()) : null } : {}),
    },
  })
  return ok(divida)
})

export const DELETE = comSessao<Contexto>(async (sessao, _requisicao, contexto) => {
  const { id } = await contexto.params
  const divida = await prisma.divida.findFirst({ where: { id, larId: sessao.larId } })
  if (!divida) throw new ErroDeUso("Dívida não encontrada.", 404)
  // Os pagamentos já lançados ficam no extrato: o dinheiro saiu de verdade.
  // Só perdem o vínculo com a dívida apagada.
  await prisma.$transaction([
    prisma.transacao.updateMany({ where: { dividaId: id, larId: sessao.larId }, data: { dividaId: null } }),
    prisma.divida.delete({ where: { id } }),
  ])
  return ok({ removida: true })
})
