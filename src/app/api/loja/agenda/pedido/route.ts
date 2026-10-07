import { prisma } from "@/lib/prisma"
import { comSessao, corpo, ok } from "@/lib/api"
import { instanteNoFuso, lerPedidoDeAgenda, textoDaProposta } from "@/lib/loja/pedido-agenda"
import { campo, validar, z } from "@/lib/validar"

export const dynamic = "force-dynamic"

/**
 * O assessor lê o pedido ("amanhã às 15h com a Ana") e devolve a PROPOSTA.
 * Não grava nada: quem marca é a pessoa, num toque, pela rota de
 * compromissos (regra 5). O que faltar volta em `faltando`.
 */
export const POST = comSessao(async (sessao, requisicao) => {
  const { texto } = validar(z.object({ texto: campo.textoObrigatorio(300) }), await corpo(requisicao))
  const lar = await prisma.lar.findUnique({ where: { id: sessao.larId }, select: { fusoHorario: true } })
  const fuso = lar?.fusoHorario ?? "America/Sao_Paulo"
  const pedido = lerPedidoDeAgenda(texto, new Date(), fuso)
  return ok({
    pedido,
    proposta: textoDaProposta(pedido),
    inicioEm: pedido.dia && pedido.hora ? instanteNoFuso(pedido.dia, pedido.hora, fuso).toISOString() : null,
  })
})
