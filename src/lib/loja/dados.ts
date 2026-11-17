/**
 * Acesso ao banco da loja.
 *
 * Fica fora das rotas para que a tela, o teste de fumaça e uma futura tela de
 * relatório leiam a loja pelo mesmo caminho — o motivo de `panorama.ts` existir
 * no Tino pessoal é o mesmo aqui: dois cálculos do mesmo número divergem.
 */

import type { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { ErroDeUso } from "@/lib/api"

import { negocioAtivo } from "./areas"

import type { FormaPagamento, RegraDeRecebimento } from "./venda"

/**
 * A loja do lar, criada na primeira visita.
 *
 * Criar sozinha evita uma tela de "cadastre sua loja" antes da primeira venda.
 * Quem abre o Tino.mei quer vender, não preencher formulário.
 */
export async function lojaDoLar(larId: string, nomeSugerido = "Minha loja") {
  const lojas = await prisma.loja.findMany({ where: { larId }, orderBy: { criadoEm: "asc" } })
  const ativa = negocioAtivo(lojas, await negocioEscolhido())
  if (ativa) return ativa

  return prisma.loja.create({ data: { larId, nome: nomeSugerido } })
}

/**
 * O negócio que a pessoa escolheu na troca do topo (passo 38). Fica num
 * cookie, e não no token, porque trocar de negócio não é entrar de novo: o
 * token continua o mesmo. Fora de uma requisição (teste, script) não há
 * cookie, e vale o negócio mais antigo.
 */
export const COOKIE_NEGOCIO = "tino_negocio"

async function negocioEscolhido(): Promise<string | undefined> {
  try {
    const { cookies } = await import("next/headers")
    return (await cookies()).get(COOKIE_NEGOCIO)?.value
  } catch {
    return undefined
  }
}

export async function regrasDeRecebimento(lojaId: string): Promise<RegraDeRecebimento[]> {
  const linhas = await prisma.formaRecebimento.findMany({ where: { lojaId } })
  return linhas.map((linha) => ({
    forma: linha.forma as FormaPagamento,
    taxaBps: linha.taxaBps,
    prazoDias: linha.prazoDias,
  }))
}

/** Caixa aberto agora, se houver. Venda sem caixa aberto é registrada mesmo assim. */
export function caixaAberto(lojaId: string) {
  return prisma.caixa.findFirst({
    where: { lojaId, fechadoEm: null },
    orderBy: { abertoEm: "desc" },
    include: { sangrias: true },
  })
}

/**
 * Próximo número da venda.
 *
 * Sequencial por loja para o dono e o cliente falarem do mesmo pedido. Vem do
 * maior número já gravado, não de uma contagem: venda cancelada continua
 * ocupando o número dela, e reaproveitar número faria dois pedidos diferentes
 * atenderem pelo mesmo nome.
 */
/**
 * Próximo número de venda, dentro da transação que cria a venda.
 *
 * A trava por loja segura o segundo balcão até o primeiro gravar: sem ela,
 * duas vendas no mesmo instante liam o mesmo "último número", e a segunda
 * batia na chave única e devolvia erro 500 com o carrinho já montado
 * (auditoria, Lote 5). A trava solta sozinha no fim da transação.
 */
export async function proximoNumero(transacao: Prisma.TransactionClient, lojaId: string): Promise<number> {
  await transacao.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${"numero-venda:" + lojaId}))::text`
  const ultima = await transacao.vendaLoja.findFirst({
    where: { lojaId },
    orderBy: { numero: "desc" },
    select: { numero: true },
  })

  return (ultima?.numero ?? 0) + 1
}

export function exigirLoja(lojaId: string | null | undefined) {
  if (!lojaId) throw new ErroDeUso("Loja não encontrada.", 404)
  return lojaId
}
