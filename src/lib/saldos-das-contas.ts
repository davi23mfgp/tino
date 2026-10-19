import { prisma } from "@/lib/prisma"

/**
 * Saldo de cada conta, sempre derivado dos lançamentos, nunca um campo gravado:
 * campo de saldo desatualiza no primeiro lançamento editado ou apagado.
 *
 * Transferência move saldo entre contas sem ser receita nem despesa. A ponta
 * de destino é a que aponta para a de origem, a mesma regra do panorama, para
 * as telas nunca mostrarem saldos diferentes. Fica aqui para a tela de Bancos e
 * a rota /api/contas usarem a mesma conta.
 */
export async function saldosDasContas(larId: string, contas: { id: string; saldoInicialCentavos: number }[]): Promise<Map<string, number>> {
  const [movimentos, transferencias] = await Promise.all([
    prisma.transacao.groupBy({ by: ["contaId", "tipo"], where: { larId, pago: true, tipo: { in: ["RECEITA", "DESPESA"] } }, _sum: { valorCentavos: true } }),
    prisma.transacao.findMany({ where: { larId, pago: true, tipo: "TRANSFERENCIA" }, select: { contaId: true, valorCentavos: true, transferenciaParId: true } }),
  ])
  const somar = (contaId: string, tipo: string) => movimentos.find((m) => m.contaId === contaId && m.tipo === tipo)?._sum.valorCentavos ?? 0
  return new Map(contas.map((conta) => [conta.id,
    conta.saldoInicialCentavos + somar(conta.id, "RECEITA") - somar(conta.id, "DESPESA")
      + transferencias.filter((linha) => linha.contaId === conta.id).reduce((soma, linha) => soma + (linha.transferenciaParId ? linha.valorCentavos : -linha.valorCentavos), 0),
  ]))
}
