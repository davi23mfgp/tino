/**
 * A ida ao banco da conciliação da maquininha. A regra mora em `./maquininha`,
 * pura e testada; aqui só se junta o Balcão no formato que ela lê.
 */

import { prisma } from "@/lib/prisma"
import type { PagamentoDoBalcao } from "@/lib/loja/maquininha"

const DIA = 86_400_000
const FORMAS = ["DEBITO", "CREDITO_VISTA", "CREDITO_PARCELADO", "PIX"] as const

/**
 * Pagamentos de cartão e Pix das vendas do período, com dia e hora no fuso do
 * lar: a maquininha já fala na hora local, e a venda das 22h não pode virar
 * o dia seguinte pelo relógio do servidor. A janela vai um dia além do
 * arquivo, porque há quem lance no Balcão no dia seguinte.
 */
export async function pagamentosDoBalcao(lojaId: string, de: string, ate: string, fuso: string): Promise<PagamentoDoBalcao[]> {
  const pagamentos = await prisma.pagamentoVenda.findMany({
    where: {
      forma: { in: [...FORMAS] },
      venda: { lojaId, cancelada: false, criadoEm: { gte: new Date(Date.parse(`${de}T00:00:00Z`) - DIA), lt: new Date(Date.parse(`${ate}T00:00:00Z`) + 3 * DIA) } },
    },
    select: {
      id: true, forma: true, parcelas: true, valorCentavos: true, taxaBps: true, valorLiquidoCentavos: true, previsaoRecebimentoEm: true, recebidoEm: true,
      venda: { select: { numero: true, criadoEm: true } },
    },
    orderBy: { venda: { criadoEm: "asc" } },
  })
  return pagamentos.map((pagamento) => ({
    id: pagamento.id,
    vendaNumero: pagamento.venda.numero,
    dia: pagamento.venda.criadoEm.toLocaleDateString("en-CA", { timeZone: fuso }),
    hora: pagamento.venda.criadoEm.toLocaleTimeString("en-GB", { timeZone: fuso, hour: "2-digit", minute: "2-digit", hour12: false }),
    forma: pagamento.forma,
    parcelas: pagamento.parcelas,
    valorCentavos: pagamento.valorCentavos,
    taxaBps: pagamento.taxaBps,
    liquidoCentavos: pagamento.valorLiquidoCentavos,
    // A previsão é o instante da venda mais o prazo: o dia dela também se lê no fuso.
    previsao: pagamento.previsaoRecebimentoEm.toLocaleDateString("en-CA", { timeZone: fuso }),
    recebido: pagamento.recebidoEm !== null,
  }))
}
