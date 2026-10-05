/**
 * Agenda, ordens de serviço e avisos da loja, lidos do banco num formato só.
 * As regras moram em `./agenda`, puras; aqui fica a ida ao banco.
 */

import type { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { lembretes, type Etapa, type OrdemDia } from "@/lib/loja/agenda"

export const SELECAO_ORDEM = {
  id: true, numero: true, objeto: true, servico: true, naEntrada: true, etapa: true, etapasEm: true, prazoEm: true,
  valorCentavos: true, checklist: true, orcamentoId: true, vendaId: true, linkToken: true, criadoEm: true,
  cliente: { select: { id: true, nome: true, telefone: true } },
  orcamento: { select: { numero: true, status: true, aprovadoPeloCliente: true } },
  venda: { select: { numero: true } },
} satisfies Prisma.OrdemServicoLojaSelect

export type LinhaOrdem = Prisma.OrdemServicoLojaGetPayload<{ select: typeof SELECAO_ORDEM }>

export const paraOrdemDia = (linha: Pick<LinhaOrdem, "id" | "numero" | "objeto" | "servico" | "etapa" | "prazoEm" | "valorCentavos" | "cliente">): OrdemDia => ({
  id: linha.id, numero: linha.numero, cliente: linha.cliente.nome, objeto: linha.objeto, servico: linha.servico,
  etapa: linha.etapa as Etapa, prazoEm: linha.prazoEm, valorCentavos: linha.valorCentavos,
})

export async function proximoNumeroDeOrdem(transacao: Prisma.TransactionClient, lojaId: string) {
  const ultima = await transacao.ordemServicoLoja.findFirst({ where: { lojaId }, orderBy: { numero: "desc" }, select: { numero: true } })
  return (ultima?.numero ?? 0) + 1
}

/**
 * Grava os lembretes do dia (sem duplicar, pela chave) e devolve os avisos
 * dos últimos 30 dias. Lembrete calculado e aviso de evento (o cliente
 * aprovou) moram na mesma tabela para o "lido" valer igual para os dois.
 */
export async function avisosDaLoja(lojaId: string, fuso: string | undefined, agora = new Date()) {
  const [ordens, orcamentos] = await Promise.all([
    prisma.ordemServicoLoja.findMany({ where: { lojaId, etapa: { notIn: ["ENTREGUE", "PRONTO"] }, prazoEm: { not: null } }, select: SELECAO_ORDEM }),
    prisma.orcamentoLoja.findMany({
      where: { lojaId, status: "ENVIADO", validoAte: { gte: new Date(agora.getTime() - 86_400_000), lte: new Date(agora.getTime() + 3 * 86_400_000) } },
      select: { id: true, numero: true, status: true, validoAte: true, aberturas: true, clienteId: true, cliente: { select: { nome: true } } },
    }),
  ])
  const gerados = lembretes(
    { ordens: ordens.map(paraOrdemDia), orcamentos: orcamentos.map((o) => ({ ...o, cliente: o.cliente.nome })) },
    agora,
    fuso,
  )
  if (gerados.length > 0) await prisma.avisoLoja.createMany({ data: gerados.map((aviso) => ({ ...aviso, lojaId })), skipDuplicates: true })
  return prisma.avisoLoja.findMany({
    where: { lojaId, criadoEm: { gte: new Date(agora.getTime() - 30 * 86_400_000) } },
    orderBy: { criadoEm: "desc" },
    take: 50,
  })
}
