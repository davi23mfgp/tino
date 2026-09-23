import { prisma } from "@/lib/prisma"
import { ErroDeUso, comSessao, corpo, ok } from "@/lib/api"
import { campo, doLar, regexSegura, validar, z } from "@/lib/validar"
import { categorizar, type RegraAplicavel } from "@/lib/categorizar"

export const GET = comSessao(async (sessao) =>
  ok(
    await prisma.regraCategorizacao.findMany({
      where: { larId: sessao.larId },
      include: { categoria: { select: { nome: true, cor: true, icone: true } } },
      orderBy: [{ prioridade: "desc" }, { acertos: "desc" }],
    }),
  ),
)

export const POST = comSessao(async (sessao, requisicao) => {
  const dados = validar(
    z.object({
      padrao: campo.textoObrigatorio(100),
      categoriaId: campo.id(),
      regex: z.boolean().default(false),
      renomearPara: campo.texto(120).optional(),
      membroId: campo.id().nullish(),
      tags: z.array(campo.textoObrigatorio(40)).max(20).default([]),
      prioridade: campo.inteiro(0, 1000).default(100),
    }),
    await corpo(requisicao),
  )
  if (dados.regex && !regexSegura(dados.padrao)) throw new ErroDeUso("Expressão regular não permitida.")
  await doLar(sessao.larId, { categoria: dados.categoriaId, membro: dados.membroId })

  const regra = await prisma.regraCategorizacao.create({
    data: {
      larId: sessao.larId,
      padrao: dados.padrao,
      categoriaId: dados.categoriaId,
      regex: dados.regex,
      renomearPara: dados.renomearPara || null,
      membroId: dados.membroId ?? null,
      tags: dados.tags,
      prioridade: dados.prioridade,
    },
  })

  return ok(regra, 201)
})

export const PATCH = comSessao(async (sessao, requisicao) => {
  const dados = validar(
    z.object({
      id: campo.id(),
      ativa: z.boolean().optional(),
      padrao: campo.textoObrigatorio(100).optional(),
      categoriaId: campo.id().optional(),
      renomearPara: campo.texto(120).optional(),
    }),
    await corpo(requisicao),
  )

  const regra = await prisma.regraCategorizacao.findFirst({ where: { id: dados.id, larId: sessao.larId } })
  if (!regra) throw new ErroDeUso("Regra não encontrada.", 404)
  if (regra.regex && dados.padrao !== undefined && !regexSegura(dados.padrao)) {
    throw new ErroDeUso("Expressão regular não permitida.")
  }
  await doLar(sessao.larId, { categoria: dados.categoriaId })

  return ok(
    await prisma.regraCategorizacao.update({
      where: { id: dados.id },
      data: {
        ...(dados.ativa !== undefined ? { ativa: dados.ativa } : {}),
        ...(dados.padrao !== undefined ? { padrao: dados.padrao } : {}),
        ...(dados.categoriaId !== undefined ? { categoriaId: dados.categoriaId } : {}),
        ...(dados.renomearPara !== undefined ? { renomearPara: dados.renomearPara || null } : {}),
      },
    }),
  )
})

export const DELETE = comSessao(async (sessao, requisicao) => {
  const id = new URL(requisicao.url).searchParams.get("id")
  if (!id) throw new ErroDeUso("Informe a regra.")
  await prisma.regraCategorizacao.deleteMany({ where: { id, larId: sessao.larId } })
  return ok({ removida: true })
})

/**
 * Reprocessa as regras sobre lançamentos já existentes.
 *
 * Por padrão só toca no que está sem categoria: recategorizar em massa o que o
 * usuário já classificou à mão apagaria o trabalho dele sem aviso.
 */
export const PUT = comSessao(async (sessao, requisicao) => {
  const dados = validar(
    z.object({ incluirJaCategorizados: z.boolean().optional(), competencia: campo.competencia().optional() }),
    await corpo(requisicao),
  )

  const [regras, categorias, transacoes] = await Promise.all([
    prisma.regraCategorizacao.findMany({ where: { larId: sessao.larId, ativa: true } }),
    prisma.categoria.findMany({ where: { larId: sessao.larId }, select: { id: true, nome: true } }),
    prisma.transacao.findMany({
      where: {
        larId: sessao.larId,
        tipo: { not: "TRANSFERENCIA" },
        ...(dados.incluirJaCategorizados ? {} : { categoriaId: null }),
        ...(dados.competencia ? { competencia: dados.competencia } : {}),
      },
      select: { id: true, descricao: true, descricaoOriginal: true, categoriaId: true },
    }),
  ])

  const mapa = new Map(categorias.map((categoria) => [categoria.nome, categoria.id]))
  const acertosPorRegra = new Map<string, number>()
  let atualizadas = 0

  for (const transacao of transacoes) {
    const sugestao = categorizar(
      transacao.descricaoOriginal ?? transacao.descricao,
      regras as unknown as RegraAplicavel[],
      mapa,
    )
    if (!sugestao.categoriaId || sugestao.categoriaId === transacao.categoriaId) continue

    await prisma.transacao.update({
      where: { id: transacao.id },
      data: {
        categoriaId: sugestao.categoriaId,
        ...(sugestao.regraId && sugestao.descricaoLimpa ? { descricao: sugestao.descricaoLimpa } : {}),
      },
    })
    atualizadas += 1
    if (sugestao.regraId) acertosPorRegra.set(sugestao.regraId, (acertosPorRegra.get(sugestao.regraId) ?? 0) + 1)
  }

  await Promise.all(
    [...acertosPorRegra.entries()].map(([id, quantidade]) =>
      prisma.regraCategorizacao.update({ where: { id }, data: { acertos: { increment: quantidade } } }),
    ),
  )

  return ok({ analisadas: transacoes.length, atualizadas })
})
