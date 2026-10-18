import { prisma } from "@/lib/prisma"
import { ErroDeUso, comSessao, corpo, ok } from "@/lib/api"
import { lojaDoLar } from "@/lib/loja/dados"
import { instanteNoFuso } from "@/lib/loja/pedido-agenda"
import { campo, validar, z } from "@/lib/validar"

export const dynamic = "force-dynamic"

const dia = () => z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "use AAAA-MM-DD")
const esquema = z.object({
  ajustes: z.array(z.object({
    pagamentoId: campo.id(),
    recebidoEm: dia().optional(),
    previsao: dia().optional(),
    liquidoCentavos: campo.centavos().optional(),
  })).min(1).max(500),
})

/**
 * Grava as correções que a pessoa confirmou depois de conferir a planilha:
 * marcar recebido, a data em que cai e o líquido que a maquininha pagou de
 * fato. Só pagamento de venda desta loja, não cancelada, e o líquido nunca
 * passa do valor da venda. A taxa é refeita a partir do líquido, para os dois
 * continuarem dizendo a mesma coisa.
 */
export const POST = comSessao(async (sessao, requisicao) => {
  const { ajustes } = validar(esquema, await corpo(requisicao))
  const loja = await lojaDoLar(sessao.larId)
  const lar = await prisma.lar.findUnique({ where: { id: sessao.larId }, select: { fusoHorario: true } })
  const fuso = lar?.fusoHorario ?? "America/Sao_Paulo"
  const pagamentos = await prisma.pagamentoVenda.findMany({
    where: { id: { in: ajustes.map((ajuste) => ajuste.pagamentoId) }, forma: { in: ["DEBITO", "CREDITO_VISTA", "CREDITO_PARCELADO", "PIX"] }, venda: { lojaId: loja.id, cancelada: false } },
    select: { id: true, valorCentavos: true },
  })
  const daLoja = new Map(pagamentos.map((pagamento) => [pagamento.id, pagamento]))
  if (daLoja.size !== new Set(ajustes.map((ajuste) => ajuste.pagamentoId)).size) throw new ErroDeUso("Algum pagamento não é desta loja ou foi cancelado.", 404)

  // Meio-dia no fuso: o dia é o que importa, e meio-dia não vira outro dia em fuso nenhum do Brasil.
  const noDia = (texto: string) => instanteNoFuso(texto, "12:00", fuso)
  await prisma.$transaction(ajustes.map((ajuste) => {
    const valor = daLoja.get(ajuste.pagamentoId)!.valorCentavos
    if (ajuste.liquidoCentavos !== undefined && (ajuste.liquidoCentavos <= 0 || ajuste.liquidoCentavos > valor)) {
      throw new ErroDeUso("O líquido tem de ser maior que zero e não passar do valor da venda.")
    }
    return prisma.pagamentoVenda.update({
      where: { id: ajuste.pagamentoId },
      data: {
        ...(ajuste.recebidoEm ? { recebidoEm: noDia(ajuste.recebidoEm), previsaoRecebimentoEm: noDia(ajuste.recebidoEm) } : {}),
        ...(ajuste.previsao && !ajuste.recebidoEm ? { previsaoRecebimentoEm: noDia(ajuste.previsao) } : {}),
        ...(ajuste.liquidoCentavos !== undefined
          ? { valorLiquidoCentavos: ajuste.liquidoCentavos, taxaBps: Math.round(((valor - ajuste.liquidoCentavos) * 10_000) / valor) }
          : {}),
      },
    })
  }))
  return ok({ ajustados: ajustes.length })
})
