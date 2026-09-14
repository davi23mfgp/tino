import { prisma } from "@/lib/prisma"
import { comSessao, corpo, ok, ErroDeUso } from "@/lib/api"
import { competenciaAtual } from "@/lib/datas"

type Contexto = { params: Promise<{ id: string }> }
type Linha = { categoriaId: string; limiteCentavos: number }

function dinheiroValido(valor: unknown): valor is number {
  return Number.isSafeInteger(valor) && Number(valor) >= 0 && Number(valor) <= 2_147_483_647
}

export const GET = comSessao<Contexto>(async (sessao, req, contexto) => {
  const { id } = await contexto.params
  const competencia = new URL(req.url).searchParams.get("competencia")
  if (!competencia || !/^\d{4}-(0[1-9]|1[0-2])$/.test(competencia)) throw new ErroDeUso("Informe o mês.")
  const conta = await prisma.conta.findFirst({ where: { id, larId: sessao.larId, tipo: "CARTAO_CREDITO", arquivada: false } })
  if (!conta) throw new ErroDeUso("Cartão não encontrado.", 404)
  const plano = await prisma.orcamentoCartao.findUnique({ where: { contaId_competencia: { contaId: id, competencia } }, include: { categorias: true } })
  const possuiPlanos = plano ? true : await prisma.orcamentoCartao.count({ where: { contaId: id } }) > 0
  return ok(plano ?? { totalCentavos: !possuiPlanos && competencia === competenciaAtual() ? conta.orcamentoMensalCentavos : 0, categorias: [] })
})

export const PUT = comSessao<Contexto>(async (sessao, req, contexto) => {
  const { id } = await contexto.params
  const dados = await corpo<{ competencia: string; totalCentavos: number; categorias?: Linha[] }>(req)
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(dados?.competencia ?? "") || !dinheiroValido(dados?.totalCentavos)) throw new ErroDeUso("Informe um orçamento válido.")
  const categorias = dados.categorias ?? []
  if (!Array.isArray(categorias) || categorias.length > 200 || categorias.some((linha) => !linha || typeof linha.categoriaId !== "string" || !linha.categoriaId || !dinheiroValido(linha.limiteCentavos))) throw new ErroDeUso("Revise os valores por categoria.")
  if (new Set(categorias.map((linha) => linha.categoriaId)).size !== categorias.length) throw new ErroDeUso("Há categorias repetidas.")
  if (categorias.reduce((soma, linha) => soma + linha.limiteCentavos, 0) > dados.totalCentavos) throw new ErroDeUso("As categorias ultrapassam o orçamento total.")
  const [conta, categoriasDoLar] = await Promise.all([
    prisma.conta.findFirst({ where: { id, larId: sessao.larId, tipo: "CARTAO_CREDITO", arquivada: false } }),
    prisma.categoria.count({ where: { larId: sessao.larId, id: { in: categorias.map((linha) => linha.categoriaId) }, tipo: "DESPESA" } }),
  ])
  if (!conta) throw new ErroDeUso("Cartão não encontrado.", 404)
  if (categoriasDoLar !== categorias.length) throw new ErroDeUso("Categoria inválida.")
  const salvo = await prisma.$transaction(async (tx) => {
    const plano = await tx.orcamentoCartao.upsert({
      where: { contaId_competencia: { contaId: id, competencia: dados.competencia } },
      create: { larId: sessao.larId, contaId: id, competencia: dados.competencia, totalCentavos: dados.totalCentavos },
      update: { totalCentavos: dados.totalCentavos },
    })
    await tx.orcamentoCartaoCategoria.deleteMany({ where: { orcamentoCartaoId: plano.id } })
    if (categorias.length) await tx.orcamentoCartaoCategoria.createMany({ data: categorias.map((linha) => ({ ...linha, orcamentoCartaoId: plano.id })) })
    // Compatibilidade temporária com leitores anteriores do orçamento total.
    await tx.conta.update({ where: { id }, data: { orcamentoMensalCentavos: dados.totalCentavos } })
    return plano
  })
  return ok({ salvo: true, id: salvo.id })
})
