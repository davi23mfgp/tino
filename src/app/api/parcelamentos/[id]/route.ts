import { prisma } from "@/lib/prisma"
import { comSessao, corpo, ok, ErroDeUso } from "@/lib/api"

type Contexto = { params: Promise<{ id: string }> }

export const PATCH = comSessao<Contexto>(async (sessao, requisicao, contexto) => {
  const { id } = await contexto.params
  const dados = await corpo<{
    descricao?: string
    categoriaId?: string | null
    ativo?: boolean
    /// Marca as parcelas até este número como pagas (e as seguintes como abertas).
    parcelasPagas?: number
  }>(requisicao)

  const parcelamento = await prisma.parcelamento.findFirst({
    where: { id, larId: sessao.larId },
    include: { parcelas: true },
  })
  if (!parcelamento) throw new ErroDeUso("Parcelamento não encontrado.", 404)

  if(dados.categoriaId && !await prisma.categoria.findFirst({where:{id:dados.categoriaId,larId:sessao.larId}}))throw new ErroDeUso("Categoria inválida.")
  if(dados.parcelasPagas!==undefined && (!Number.isInteger(dados.parcelasPagas)||dados.parcelasPagas<0||dados.parcelasPagas>parcelamento.parcelasTotal))throw new ErroDeUso("Quantidade de parcelas inválida.")
  if (dados.parcelasPagas !== undefined) {
    const ate = Math.max(0, Math.min(dados.parcelasPagas, parcelamento.parcelasTotal))
    // As duas atualizações são espelhadas de propósito: corrigir para menos
    // precisa reabrir as parcelas que deixaram de estar pagas.
    await prisma.parcelaCompra.updateMany({
      where: { parcelamentoId: id, numero: { lte: ate } },
      data: { paga: true },
    })
    await prisma.parcelaCompra.updateMany({
      where: { parcelamentoId: id, numero: { gt: ate } },
      data: { paga: false, pagaEm: null },
    })
  }

  const atualizado = await prisma.parcelamento.update({
    where: { id },
    data: {
      ...(dados.descricao !== undefined ? { descricao: dados.descricao.trim() } : {}),
      ...(dados.categoriaId !== undefined ? { categoriaId: dados.categoriaId } : {}),
      ...(dados.ativo !== undefined ? { ativo: dados.ativo } : {}),
      ...(dados.parcelasPagas !== undefined ? { parcelasPagas: dados.parcelasPagas } : {}),
    },
    include: { parcelas: { orderBy: { numero: "asc" } } },
  })

  return ok(atualizado)
})

export const DELETE = comSessao<Contexto>(async (sessao, _requisicao, contexto) => {
  const { id } = await contexto.params
  const parcelamento = await prisma.parcelamento.findFirst({ where: { id, larId: sessao.larId } })
  if (!parcelamento) throw new ErroDeUso("Parcelamento não encontrado.", 404)

  await prisma.parcelamento.delete({ where: { id } })
  return ok({ removido: true })
})

/** Baixa de uma parcela específica ("paguei a de outubro"). */
export const POST = comSessao<Contexto>(async (sessao, requisicao, contexto) => {
  const { id } = await contexto.params
  const dados = await corpo<{ numero: number; paga?: boolean }>(requisicao)

  const parcelamento = await prisma.parcelamento.findFirst({ where: { id, larId: sessao.larId } })
  if (!parcelamento) throw new ErroDeUso("Parcelamento não encontrado.", 404)

  const paga = dados.paga ?? true
  await prisma.parcelaCompra.update({
    where: { parcelamentoId_numero: { parcelamentoId: id, numero: dados.numero } },
    data: { paga, pagaEm: paga ? new Date() : null },
  })

  const pagas = await prisma.parcelaCompra.count({ where: { parcelamentoId: id, paga: true } })
  await prisma.parcelamento.update({ where: { id }, data: { parcelasPagas: pagas } })

  return ok({ parcelasPagas: pagas })
})
