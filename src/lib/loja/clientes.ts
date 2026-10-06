/**
 * Clientes e orçamentos da loja, lidos do banco num formato só.
 *
 * As regras (situação, para retomar, fechamento) moram em `./orcamento`,
 * puras; aqui fica só a ida ao banco e a conversão para aqueles tipos.
 */

import { randomBytes } from "node:crypto"
import type { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { ErroDeUso } from "@/lib/api"
import { totalDaVenda } from "@/lib/loja/venda"
import type { MotivoPerda, OrcamentoResumo, StatusOrcamento } from "@/lib/loja/orcamento"

export const SELECAO_RESUMO = {
  id: true, numero: true, status: true, totalCentavos: true, validoAte: true, enviadoEm: true,
  aberturas: true, ultimaAberturaEm: true, aprovadoPeloCliente: true, motivoPerda: true, criadoEm: true,
  venda: { select: { numero: true } },
} satisfies Prisma.OrcamentoLojaSelect

type LinhaResumo = Prisma.OrcamentoLojaGetPayload<{ select: typeof SELECAO_RESUMO }>

export function paraResumo(linha: LinhaResumo): OrcamentoResumo {
  return {
    id: linha.id,
    numero: linha.numero,
    status: linha.status as StatusOrcamento,
    totalCentavos: linha.totalCentavos,
    validoAte: linha.validoAte,
    enviadoEm: linha.enviadoEm,
    aberturas: linha.aberturas,
    ultimaAberturaEm: linha.ultimaAberturaEm,
    aprovadoPeloCliente: linha.aprovadoPeloCliente,
    motivoPerda: (linha.motivoPerda as MotivoPerda | null) ?? null,
    vendaNumero: linha.venda?.numero ?? null,
    criadoEm: linha.criadoEm,
  }
}

/** Fiado ainda não recebido, por cliente. A mesma conta da tela Fiado. */
export async function fiadoPorCliente(lojaId: string): Promise<Map<string, number>> {
  const pagamentos = await prisma.pagamentoVenda.findMany({
    where: { forma: "FIADO", recebidoEm: null, venda: { lojaId, cancelada: false, clienteId: { not: null } } },
    select: { valorCentavos: true, venda: { select: { clienteId: true } } },
  })
  const mapa = new Map<string, number>()
  for (const pagamento of pagamentos) {
    const id = pagamento.venda.clienteId as string
    mapa.set(id, (mapa.get(id) ?? 0) + pagamento.valorCentavos)
  }
  return mapa
}

export async function clientesComOrcamentos(lojaId: string) {
  return prisma.clienteLoja.findMany({
    where: { lojaId },
    orderBy: { nome: "asc" },
    include: { orcamentos: { select: SELECAO_RESUMO, orderBy: { criadoEm: "desc" } } },
  })
}

/// 24 bytes viram 32 caracteres: impossível de adivinhar, curto o bastante
/// para caber numa mensagem de WhatsApp sem quebrar a linha.
export const novoToken = () => randomBytes(24).toString("base64url")

export interface ItemInformado {
  produtoId?: string
  servicoId?: string
  descricao: string
  quantidade: number
  precoUnitarioCentavos: number
}

/**
 * Confere que produto e serviço são desta loja e devolve os itens prontos
 * para gravar. Item de outra loja num orçamento viraria, no Balcão, baixa de
 * estoque na prateleira de outra pessoa.
 */
export async function conferirItens(lojaId: string, itens: ItemInformado[]) {
  if (itens.some((item) => item.produtoId && item.servicoId)) throw new ErroDeUso("Um item não pode ser produto e serviço ao mesmo tempo.")
  const idsProduto = [...new Set(itens.flatMap((item) => (item.produtoId ? [item.produtoId] : [])))]
  const idsServico = [...new Set(itens.flatMap((item) => (item.servicoId ? [item.servicoId] : [])))]
  if (idsProduto.length > 0 && (await prisma.produtoLoja.count({ where: { id: { in: idsProduto }, lojaId } })) !== idsProduto.length) {
    throw new ErroDeUso("Produto não encontrado nesta loja.", 404)
  }
  if (idsServico.length > 0 && (await prisma.servicoLoja.count({ where: { id: { in: idsServico }, lojaId } })) !== idsServico.length) {
    throw new ErroDeUso("Serviço não encontrado nesta loja.", 404)
  }
  return itens.map((item, ordem) => ({
    produtoId: item.produtoId ?? null,
    servicoId: item.servicoId ?? null,
    descricao: item.descricao,
    quantidade: item.quantidade,
    precoUnitarioCentavos: item.precoUnitarioCentavos,
    totalCentavos: item.quantidade * item.precoUnitarioCentavos,
    ordem,
  }))
}

/**
 * Total e condições, conferidos no servidor. O desconto nunca zera o
 * orçamento, e a entrada não passa do total: as duas coisas viram, no link
 * do cliente, um "R$ 0,00" ou uma parcela negativa.
 */
export function conferirValores(itens: ItemInformado[], descontoCentavos: number, entradaCentavos: number | null) {
  const bruto = totalDaVenda(itens)
  if (descontoCentavos >= bruto) throw new ErroDeUso("O desconto precisa ser menor que o valor dos itens.")
  const totalCentavos = totalDaVenda(itens, descontoCentavos)
  if (entradaCentavos !== null && entradaCentavos >= totalCentavos) throw new ErroDeUso("A entrada precisa ser menor que o total.")
  return totalCentavos
}

/** Número do próximo orçamento da loja. A unicidade fica com o banco. */
export async function proximoNumeroDeOrcamento(transacao: Prisma.TransactionClient, lojaId: string) {
  const ultimo = await transacao.orcamentoLoja.findFirst({ where: { lojaId }, orderBy: { numero: "desc" }, select: { numero: true } })
  return (ultimo?.numero ?? 0) + 1
}

export const SELECAO_COMPLETA = {
  ...SELECAO_RESUMO,
  versao: true, descontoCentavos: true, entradaCentavos: true, parcelas: true, observacao: true, linkToken: true,
  primeiraAberturaEm: true, aprovadoEm: true, perdidoEm: true, motivoPerdaDetalhe: true, convertidoEm: true,
  clienteId: true,
  cliente: { select: { id: true, nome: true, telefone: true } },
  itens: {
    orderBy: { ordem: "asc" },
    select: { id: true, produtoId: true, servicoId: true, descricao: true, quantidade: true, precoUnitarioCentavos: true, totalCentavos: true },
  },
} satisfies Prisma.OrcamentoLojaSelect
