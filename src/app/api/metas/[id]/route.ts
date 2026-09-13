import { prisma } from "@/lib/prisma"
import { comSessao, corpo, ok, ErroDeUso } from "@/lib/api"
import { inteiroMeta, periodoMetas, validarDadosMeta } from "@/lib/metas"

type Contexto = { params: Promise<{ id: string }> }

export const PATCH = comSessao<Contexto>(async (sessao, requisicao, contexto) => {
  const { id } = await contexto.params
  return ok(await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${id}))`
    const meta = await tx.meta.findFirst({ where: { id, larId: sessao.larId } })
    if (!meta) throw new ErroDeUso("Meta não encontrada.", 404)
    const entrada = await corpo<Record<string, unknown>>(requisicao)
    if (entrada && "saldoCentavos" in entrada && entrada.saldoCentavos !== meta.saldoCentavos) throw new ErroDeUso("Use aporte ou retirada para alterar o saldo.")
    const dados = await validarDadosMeta(sessao.larId, entrada, meta)
    return tx.meta.update({ where: { id }, data: dados })
  }))
})

export const DELETE = comSessao<Contexto>(async (sessao, _requisicao, contexto) => {
  const { id } = await contexto.params
  return ok(await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${id}))`
    const meta = await tx.meta.findFirst({ where: { id, larId: sessao.larId } })
    if (!meta) throw new ErroDeUso("Meta não encontrada.", 404)
    await tx.transacao.updateMany({ where: { metaId: id, larId: sessao.larId }, data: { metaId: null } })
    await tx.meta.delete({ where: { id } })
    return { removida: true }
  }))
})

export const POST = comSessao<Contexto>(async (sessao, requisicao, contexto) => {
  const { id } = await contexto.params
  const dados = await corpo<{ valorCentavos: number; contaId?: string; data?: string; retirada?: boolean; chave?: string; transacaoId?: string }>(requisicao)
  if (!dados || typeof dados !== "object") throw new ErroDeUso("Aporte inválido.")
  const valor = inteiroMeta(dados.valorCentavos, "Valor do aporte", 1)
  if (dados.retirada !== undefined && typeof dados.retirada !== "boolean") throw new ErroDeUso("Retirada inválida.")
  if (typeof dados.chave !== "string" || !/^[a-zA-Z0-9-]{16,80}$/.test(dados.chave)) throw new ErroDeUso("Identificador do aporte inválido.")
  const data = dados.data ? new Date(dados.data) : new Date()
  if (!Number.isFinite(data.getTime()) || data > new Date()) throw new ErroDeUso("Use a data em que o aporte aconteceu, até hoje.")
  const hashImport = `meta:${id}:${dados.chave}`
  const resultado = await prisma.$transaction(async (tx) => {
    // Serializa saldo, retirada e repetição da mesma requisição sem tabela nova.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${id}))`
    const meta = await tx.meta.findFirst({ where: { id, larId: sessao.larId } })
    if (!meta) throw new ErroDeUso("Meta não encontrada.", 404)
    const existente = await tx.transacao.findUnique({ where: { larId_hashImport: { larId: sessao.larId, hashImport } } })
    if (existente) return { meta, lancamento: existente }
    if (meta.status === "CANCELADA" || meta.status === "PAUSADA") throw new ErroDeUso("Retome a meta antes de movimentar.")
    const contaId = dados.contaId ?? meta.contaId
    if (typeof contaId !== "string" || !await tx.conta.findFirst({ where: { id: contaId, larId: sessao.larId, tipo: { not: "CARTAO_CREDITO" } } })) throw new ErroDeUso("Vincule uma conta do seu lar, exceto cartão.")
    const delta = dados.retirada ? -valor : valor
    inteiroMeta(meta.saldoCentavos + delta, "Saldo resultante")
    const tipo = dados.retirada ? "RECEITA" : "DESPESA"
    let lancamento
    if (dados.transacaoId) {
      const original = await tx.transacao.findFirst({ where: { id: dados.transacaoId, larId: sessao.larId, contaId, pago: true, tipo, valorCentavos: valor, data: { lte: new Date() } } })
      if (!original) throw new ErroDeUso("Lançamento incompatível com este aporte.")
      if (original.metaId === id) return { meta, lancamento: original }
      if (original.metaId || original.dividaId) throw new ErroDeUso("Lançamento já vinculado.")
      const vinculo = await tx.transacao.updateMany({ where: { id: original.id, metaId: null, larId: sessao.larId }, data: { metaId: id } })
      if (vinculo.count !== 1) throw new ErroDeUso("Lançamento já utilizado.")
      lancamento = { ...original, metaId: id }
    } else {
      lancamento = await tx.transacao.create({ data: {
        larId: sessao.larId, contaId, metaId: id, data, valorCentavos: valor, tipo, pago: true,
        descricao: `${dados.retirada ? "Retirada" : "Aporte"} — ${meta.nome}`,
        competencia: periodoMetas(data).competencia, membroId: sessao.membroId, hashImport,
      } })
    }
    const atualizada = await tx.meta.update({ where: { id }, data: {
      saldoCentavos: { increment: delta },
      status: meta.saldoCentavos + delta >= meta.alvoCentavos ? "CONCLUIDA" : "ATIVA",
    } })
    return { meta: atualizada, lancamento }
  })
  return ok(resultado, 201)
})
