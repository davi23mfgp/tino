/**
 * Acesso ao banco da loja.
 *
 * Fica fora das rotas para que a tela, o teste de fumaça e uma futura tela de
 * relatório leiam a loja pelo mesmo caminho — o motivo de `panorama.ts` existir
 * no Tino pessoal é o mesmo aqui: dois cálculos do mesmo número divergem.
 */

import { prisma } from "@/lib/prisma"
import { ErroDeUso } from "@/lib/api"

import type { FormaPagamento, RegraDeRecebimento } from "./venda"
import { competenciaDaVenda } from "@/lib/loja/contas"

/**
 * A loja do lar, criada na primeira visita.
 *
 * Criar sozinha evita uma tela de "cadastre sua loja" antes da primeira venda.
 * Quem abre o Tino.mei quer vender, não preencher formulário.
 */
export async function lojaDoLar(larId: string, nomeSugerido = "Minha loja") {
  const existente = await prisma.loja.findFirst({ where: { larId }, orderBy: { criadoEm: "asc" } })
  if (existente) return existente

  return prisma.loja.create({ data: { larId, nome: nomeSugerido } })
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
export async function proximoNumero(lojaId: string): Promise<number> {
  const ultima = await prisma.vendaLoja.findFirst({
    where: { lojaId },
    orderBy: { numero: "desc" },
    select: { numero: true },
  })

  return (ultima?.numero ?? 0) + 1
}

/**
 * Joga o faturamento da venda na competência do MEI.
 *
 * É o que dispensa a digitação mensal: quem vende no balcão não vai abrir a
 * tela do MEI todo mês para redigitar o que já registrou aqui. Sem perfil MEI
 * ligado não faz nada — o lar pode ter loja sem ser MEI.
 */
export async function somarNoFaturamentoMei(larId: string, data: Date, valorCentavos: number) {
  const perfil = await prisma.meiPerfil.findUnique({ where: { larId } })
  if (!perfil) return

  const lar = await prisma.lar.findUnique({ where: { id: larId }, select: { fusoHorario: true } })
  const competencia = competenciaDaVenda(data, lar?.fusoHorario)

  await prisma.meiCompetencia.upsert({
    where: { larId_competencia: { larId, competencia } },
    update: { receitaComercioCentavos: { increment: valorCentavos } },
    create: { larId, competencia, receitaComercioCentavos: valorCentavos },
  })
}

export function exigirLoja(lojaId: string | null | undefined) {
  if (!lojaId) throw new ErroDeUso("Loja não encontrada.", 404)
  return lojaId
}
