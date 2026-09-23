import { prisma } from "@/lib/prisma"
import { comSessao, corpo, ok, ErroDeUso } from "@/lib/api"
import { GrupoCategoria, TipoTransacao } from "@prisma/client"
import { campo, doLar, validar, z } from "@/lib/validar"

type Contexto = { params: Promise<{ id: string }> }

export const PATCH = comSessao<Contexto>(async (sessao, requisicao, contexto) => {
  const { id } = await contexto.params
  // `strict`: campo fora da lista é recusado, não ignorado em silêncio.
  const atualizacao = validar(
    z
      .object({
        nome: campo.textoObrigatorio(60),
        grupo: z.enum(GrupoCategoria),
        tipo: z.enum(TipoTransacao),
        essencial: z.boolean(),
        cor: campo.texto(30),
        icone: campo.texto(40),
        paiId: campo.id().nullable(),
        ordem: campo.inteiro(0, 10_000),
      })
      .partial()
      .strict(),
    await corpo(requisicao),
  )

  const categoria = await prisma.categoria.findFirst({ where: { id, larId: sessao.larId } })
  if (!categoria) throw new ErroDeUso("Categoria não encontrada.", 404)
  if (atualizacao.paiId === id) throw new ErroDeUso("Uma categoria não pode ser mãe dela mesma.")
  await doLar(sessao.larId, { categoria: atualizacao.paiId })

  return ok(await prisma.categoria.update({ where: { id }, data: atualizacao }))
})

export const DELETE = comSessao<Contexto>(async (sessao, requisicao, contexto) => {
  const { id } = await contexto.params
  const destinoId = new URL(requisicao.url).searchParams.get("moverPara")

  const categoria = await prisma.categoria.findFirst({
    where: { id, larId: sessao.larId },
    include: { _count: { select: { transacoes: true } } },
  })
  if (!categoria) throw new ErroDeUso("Categoria não encontrada.", 404)
  if (categoria.sistema) throw new ErroDeUso("Categoria do sistema não pode ser excluída. Você pode renomeá-la.")

  // Excluir categoria com histórico deixaria meses fechados sem classificação.
  // Ou o usuário indica para onde mover, ou os lançamentos ficam sem categoria
  // de forma explícita — nunca somem.
  if (categoria._count.transacoes > 0) {
    await prisma.transacao.updateMany({
      where: { larId: sessao.larId, categoriaId: id },
      data: { categoriaId: destinoId ?? null },
    })
  }

  await prisma.orcamento.deleteMany({ where: { larId: sessao.larId, categoriaId: id } })
  await prisma.regraCategorizacao.deleteMany({ where: { larId: sessao.larId, categoriaId: id } })
  await prisma.categoria.delete({ where: { id } })

  return ok({ removida: true, lancamentosMovidos: categoria._count.transacoes })
})
