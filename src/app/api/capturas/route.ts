import { prisma } from "@/lib/prisma"
import { comSessao, corpo, ok, ErroDeUso } from "@/lib/api"
import { confirmarCaptura, gerarChave } from "@/lib/captura"
import { regraAPartirDeCorrecao } from "@/lib/categorizar"

export const dynamic = "force-dynamic"

/** Fila de conferência: o que chegou do celular e ainda não virou lançamento. */
export const GET = comSessao(async (sessao, requisicao) => {
  const url = new URL(requisicao.url)
  const status = url.searchParams.get("status") ?? "PENDENTE"

  const [capturas, chaves, pendentes] = await Promise.all([
    prisma.captura.findMany({
      where: { larId: sessao.larId, ...(status === "TODAS" ? {} : { status: status as never }) },
      orderBy: { criadoEm: "desc" },
      take: 100,
    }),
    prisma.chaveCaptura.findMany({
      where: { larId: sessao.larId },
      orderBy: { criadoEm: "desc" },
      // O hash nunca sai daqui: só o sufixo serve para o usuário reconhecer.
      select: { id: true, nome: true, sufixo: true, origem: true, ativa: true, ultimoUso: true, usos: true },
    }),
    prisma.captura.count({ where: { larId: sessao.larId, status: "PENDENTE" } }),
  ])

  return ok({ capturas, chaves, pendentes })
})

/** Confirma uma captura, virando lançamento. */
export const POST = comSessao(async (sessao, requisicao) => {
  const dados = await corpo<{
    capturaId: string
    contaId?: string
    categoriaId?: string | null
    valorCentavos?: number
    descricao?: string
    /// Ensina o Tino: a categoria escolhida vira regra para os próximos.
    criarRegra?: boolean
  }>(requisicao)

  const captura = await prisma.captura.findFirst({
    where: { id: dados.capturaId, larId: sessao.larId },
  })
  if (!captura) throw new ErroDeUso("Captura não encontrada.", 404)

  const transacao = await confirmarCaptura({
    larId: sessao.larId,
    capturaId: dados.capturaId,
    contaId: dados.contaId,
    categoriaId: dados.categoriaId,
    valorCentavos: dados.valorCentavos,
    descricao: dados.descricao,
    membroId: sessao.membroId,
  })

  if (dados.criarRegra && dados.categoriaId && captura.estabelecimento) {
    const base = regraAPartirDeCorrecao({
      descricaoOriginal: captura.estabelecimento,
      categoriaId: dados.categoriaId,
    })
    const jaTem = await prisma.regraCategorizacao.findFirst({
      where: { larId: sessao.larId, padrao: base.padrao },
    })
    if (!jaTem) await prisma.regraCategorizacao.create({ data: { larId: sessao.larId, ...base } })
  }

  return ok(transacao, 201)
})

/** Descarta uma captura (compra negada, duplicada, aviso). */
export const PATCH = comSessao(async (sessao, requisicao) => {
  const dados = await corpo<{ capturaId: string }>(requisicao)

  await prisma.captura.updateMany({
    where: { id: dados.capturaId, larId: sessao.larId },
    data: { status: "DESCARTADA", decididoEm: new Date() },
  })

  return ok({ descartada: true })
})

/**
 * Cria uma chave de captura.
 *
 * O valor em claro aparece uma única vez, nesta resposta: guardá-lo permitiria
 * a quem lesse o banco lançar gastos em nome do dono da conta.
 */
export const PUT = comSessao(async (sessao, requisicao) => {
  const dados = await corpo<{ nome?: string; origem?: string; chatId?: string }>(requisicao)
  const { valor, hash, sufixo } = gerarChave()

  const chave = await prisma.chaveCaptura.create({
    data: {
      larId: sessao.larId,
      nome: dados.nome?.trim() || "Meu celular",
      chaveHash: hash,
      sufixo,
      origem: (dados.origem ?? "NOTIFICACAO") as never,
      chatId: dados.chatId ?? null,
    },
  })

  return ok({ id: chave.id, nome: chave.nome, chave: valor, sufixo }, 201)
})

export const DELETE = comSessao(async (sessao, requisicao) => {
  const id = new URL(requisicao.url).searchParams.get("chaveId")
  if (!id) throw new ErroDeUso("Informe a chave.")

  await prisma.chaveCaptura.updateMany({
    where: { id, larId: sessao.larId },
    data: { ativa: false },
  })

  return ok({ revogada: true })
})
