import type { Metadata } from "next"

import { sessaoDaPagina } from "@/lib/pagina"
import { prisma } from "@/lib/prisma"
import { competenciaAtual } from "@/lib/datas"
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
export default async function Montar() {
  const sessao = await sessaoDaPagina()
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
    // O cadastro já cria "Conta corrente" e "Carteira", sem banco: só conta
    // com banco escolhido ou cartão vale como passo feito, senão o roteiro
    // começaria pulando a pergunta 1 para todo mundo.
    feitos: [contas.some((conta) => conta.tipo === "CARTAO_CREDITO" || Boolean(conta.instituicao)), receitas > 0 || (membro?.rendaMensalCentavos ?? 0) > 0, despesas > 0, limites > 0, lancamentos > 0],
    contas,
    categorias,
    competencia: competenciaAtual(),
  }
  return <Roteiro estado={estado} />
}
