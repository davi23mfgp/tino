import { prisma } from "@/lib/prisma"
import { comSessao, corpo, ok, ErroDeUso } from "@/lib/api"
import { competenciaDe } from "@/lib/datas"
import { regraAPartirDeCorrecao } from "@/lib/categorizar"

type Contexto = { params: Promise<{ id: string }> }

export const PATCH = comSessao<Contexto>(async (sessao, requisicao, contexto) => {
  const { id } = await contexto.params
  const dados = await corpo<{
    descricao?: string
    valorCentavos?: number
    data?: string
    categoriaId?: string | null
    membroId?: string | null
    contaId?: string
    pago?: boolean
    observacao?: string
    tags?: string[]
    meiFaturamento?: boolean
    /// Quando true, a correção de categoria vira regra e passa a valer para os
    /// próximos lançamentos parecidos.
    criarRegra?: boolean
  }>(requisicao)

  const atual = await prisma.transacao.findFirst({ where: { id, larId: sessao.larId } })
  if (!atual) throw new ErroDeUso("Lançamento não encontrado.", 404)

  if(atual.metaId && (dados.valorCentavos!==undefined || dados.contaId!==undefined || dados.pago!==undefined || dados.data!==undefined)) throw new ErroDeUso("Altere aportes pela área Metas para preservar o saldo.")
  if(dados.valorCentavos!==undefined && (!Number.isSafeInteger(dados.valorCentavos)||dados.valorCentavos<=0||dados.valorCentavos>2147483647))throw new ErroDeUso("Valor inválido.")
  if(dados.categoriaId && !await prisma.categoria.findFirst({where:{id:dados.categoriaId,larId:sessao.larId}}))throw new ErroDeUso("Categoria inválida.")
  if(dados.contaId && !await prisma.conta.findFirst({where:{id:dados.contaId,larId:sessao.larId,arquivada:false}}))throw new ErroDeUso("Conta inválida.")
  if(dados.membroId && !await prisma.membro.findFirst({where:{id:dados.membroId,larId:sessao.larId}}))throw new ErroDeUso("Membro inválido.")
  const data = dados.data ? new Date(dados.data) : undefined
  if (data && Number.isNaN(data.getTime())) throw new ErroDeUso("Data inválida.")

  const transacao = await prisma.transacao.update({
    where: { id },
    data: {
      ...(dados.descricao !== undefined ? { descricao: dados.descricao.trim() } : {}),
      ...(dados.valorCentavos !== undefined ? { valorCentavos: Math.abs(dados.valorCentavos) } : {}),
      ...(data ? { data, competencia: competenciaDe(data) } : {}),
      ...(dados.categoriaId !== undefined ? { categoriaId: dados.categoriaId } : {}),
      ...(dados.membroId !== undefined ? { membroId: dados.membroId } : {}),
      ...(dados.contaId !== undefined ? { contaId: dados.contaId } : {}),
      ...(dados.pago !== undefined ? { pago: dados.pago } : {}),
      ...(dados.observacao !== undefined ? { observacao: dados.observacao } : {}),
      ...(dados.tags !== undefined ? { tags: dados.tags } : {}),
      ...(dados.meiFaturamento !== undefined ? { meiFaturamento: dados.meiFaturamento } : {}),
    },
    include: { categoria: true, conta: true },
  })

  // É aqui que o Tino aprende: o usuário corrige uma vez e não corrige mais.
  if (dados.criarRegra && dados.categoriaId) {
    const base = regraAPartirDeCorrecao({
      descricaoOriginal: atual.descricaoOriginal ?? atual.descricao,
      categoriaId: dados.categoriaId,
      membroId: dados.membroId ?? undefined,
    })

    const jaTem = await prisma.regraCategorizacao.findFirst({
      where: { larId: sessao.larId, padrao: base.padrao },
    })

    if (jaTem) {
      await prisma.regraCategorizacao.update({
        where: { id: jaTem.id },
        data: { categoriaId: base.categoriaId, ativa: true },
      })
    } else {
      await prisma.regraCategorizacao.create({ data: { larId: sessao.larId, ...base } })
    }
  }

  return ok(transacao)
})

export const DELETE = comSessao<Contexto>(async (sessao, _requisicao, contexto) => {
  const { id } = await contexto.params

  const transacao = await prisma.transacao.findFirst({ where: { id, larId: sessao.larId } })
  if (!transacao) throw new ErroDeUso("Lançamento não encontrado.", 404)

  if(transacao.metaId)throw new ErroDeUso("Registre uma retirada em Metas para corrigir o aporte.")

  // Apagar só um lado de uma transferência deixaria dinheiro aparecendo do nada
  // na conta de destino. As duas pontas saem juntas.
  const par = transacao.transferenciaParId
  await prisma.transacao.deleteMany({
    where: {
      larId: sessao.larId,
      OR: [{ id }, ...(par ? [{ id: par }] : []), { transferenciaParId: id }],
    },
  })

  return ok({ removido: true })
})
