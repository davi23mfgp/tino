import { prisma } from "@/lib/prisma"
import { comSessao, corpo, ok, ErroDeUso } from "@/lib/api"
import type { ModalidadeCasal } from "@/lib/casal"

const MODALIDADES = new Set<string>(["METADE", "PROPORCIONAL", "MESADA", "PERSONALIZADA"])

/**
 * A configuração do casal do lar.
 *
 * Devolve `null` quando nunca foi ligada — o app inteiro funciona sem isto, e
 * lar de uma pessoa só não deve nem ver a seção.
 */
export const GET = comSessao(async (sessao) => {
  return ok(
    await prisma.casal.findUnique({
      where: { larId: sessao.larId },
      include: { pessoas: { orderBy: { nome: "asc" } } },
    }),
  )
})

export const PUT = comSessao(async (sessao, requisicao) => {
  const dados = await corpo<{
    ativo?: boolean
    modalidade?: string
    pessoas?: { id?: string; nome: string; rendaCentavos?: number; mesadaCentavos?: number; quotaBps?: number }[]
  }>(requisicao)

  if (dados.modalidade && !MODALIDADES.has(dados.modalidade)) throw new ErroDeUso("Forma de dividir inválida.")

  const pessoas = dados.pessoas ?? []
  if (pessoas.length > 2) throw new ErroDeUso("A divisão é entre duas pessoas.")
  for (const pessoa of pessoas) {
    if (!pessoa.nome?.trim()) throw new ErroDeUso("Cada pessoa precisa de um nome.")
    for (const valor of [pessoa.rendaCentavos, pessoa.mesadaCentavos, pessoa.quotaBps]) {
      if (valor !== undefined && (!Number.isSafeInteger(valor) || valor < 0)) throw new ErroDeUso("Valor inválido.")
    }
  }

  const casal = await prisma.casal.upsert({
    where: { larId: sessao.larId },
    create: {
      larId: sessao.larId,
      ativo: dados.ativo ?? true,
      modalidade: (dados.modalidade ?? "METADE") as ModalidadeCasal,
    },
    update: {
      ...(dados.ativo === undefined ? {} : { ativo: dados.ativo }),
      ...(dados.modalidade ? { modalidade: dados.modalidade as ModalidadeCasal } : {}),
    },
  })

  // As duas pessoas são substituídas de uma vez: são duas linhas, e reconciliar
  // item a item custaria mais código do que reescrever.
  if (dados.pessoas) {
    await prisma.$transaction([
      prisma.pessoaDoCasal.deleteMany({ where: { casalId: casal.id } }),
      prisma.pessoaDoCasal.createMany({
        data: pessoas.map((pessoa) => ({
          casalId: casal.id,
          nome: pessoa.nome.trim().slice(0, 80),
          rendaCentavos: pessoa.rendaCentavos ?? 0,
          mesadaCentavos: pessoa.mesadaCentavos ?? 0,
          quotaBps: pessoa.quotaBps ?? 0,
        })),
      }),
    ])
  }

  return ok(
    await prisma.casal.findUnique({ where: { id: casal.id }, include: { pessoas: { orderBy: { nome: "asc" } } } }),
  )
})
