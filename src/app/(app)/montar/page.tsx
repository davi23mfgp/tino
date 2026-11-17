import type { Metadata } from "next"

import { sessaoDaPagina } from "@/lib/pagina"
import { prisma } from "@/lib/prisma"
import { competenciaAtual } from "@/lib/datas"
import { feitosDoRoteiro } from "@/lib/roteiro-feitos"
import { Roteiro, type EstadoDoRoteiro } from "./roteiro"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "Montar o seu Tino · Tino", robots: { index: false, follow: false } }

/**
 * Montar o seu Tino (passo 61, opção B, escolhida pelo Davi em 10/11/2026).
 *
 * Quem nunca usou abre o app vazio e não sabe a ordem. Aqui são 5 perguntas,
 * uma por tela. O que já foi feito vem dos dados, não de uma marca guardada:
 * quem cadastrou a conta por outra tela não precisa responder de novo.
 */
export default async function Montar({ searchParams }: { searchParams: Promise<{ passo?: string }> }) {
  const sessao = await sessaoDaPagina()
  // A lista do Início manda para o passo certo: `/montar?passo=3`.
  const pedido = Number((await searchParams).passo)
  const passoPedido = Number.isInteger(pedido) && pedido >= 1 && pedido <= 5 ? pedido - 1 : null
  const larId = sessao.larId
  const [contas, membro, receitas, despesas, limites, lancamentos, categorias] = await Promise.all([
    prisma.conta.findMany({ where: { larId, arquivada: false, tipo: { not: "INVESTIMENTO" } }, select: { id: true, nome: true, tipo: true, instituicao: true }, orderBy: { criadoEm: "asc" } }),
    sessao.membroId ? prisma.membro.findUnique({ where: { id: sessao.membroId }, select: { rendaMensalCentavos: true } }) : null,
    prisma.recorrencia.count({ where: { larId, tipo: "RECEITA", ativa: true } }),
    prisma.recorrencia.count({ where: { larId, tipo: "DESPESA", ativa: true } }),
    prisma.orcamento.count({ where: { larId, competencia: competenciaAtual() } }),
    prisma.transacao.count({ where: { larId } }),
    prisma.categoria.findMany({ where: { larId }, select: { id: true, nome: true, tipo: true } }),
  ])

  const estado: EstadoDoRoteiro = {
    feitos: feitosDoRoteiro({ contas, rendasFixas: receitas, rendaDeclaradaCentavos: membro?.rendaMensalCentavos ?? 0, contasFixas: despesas, limitesDoMes: limites, lancamentos }),
    contas,
    categorias,
    competencia: competenciaAtual(),
  }
  return <Roteiro estado={estado} passoInicial={passoPedido} />
}
