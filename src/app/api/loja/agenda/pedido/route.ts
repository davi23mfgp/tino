import { prisma } from "@/lib/prisma"
import { comSessao, corpo, ok } from "@/lib/api"
import { lojaDoLar } from "@/lib/loja/dados"
import { acharCliente, instanteNoFuso, lerPedidoDeAgenda, textoDaProposta } from "@/lib/loja/pedido-agenda"
import { campo, validar, z } from "@/lib/validar"

export const dynamic = "force-dynamic"

/**
 * O assessor lê o pedido ("amanhã às 15h com a Ana") e devolve a PROPOSTA.
 * Não grava nada: quem marca é a pessoa, num toque, pela rota de
 * compromissos (regra 5). O que faltar volta em `faltando`, e a cliente
 * dita ("com a Ana") volta já procurada entre as da loja: uma só vem
 * escolhida; mais de uma volta como candidatas, e a tela pergunta qual.
 */
export const POST = comSessao(async (sessao, requisicao) => {
  const { texto } = validar(z.object({ texto: campo.textoObrigatorio(300) }), await corpo(requisicao))
  const lar = await prisma.lar.findUnique({ where: { id: sessao.larId }, select: { fusoHorario: true } })
  const fuso = lar?.fusoHorario ?? "America/Sao_Paulo"
  const pedido = lerPedidoDeAgenda(texto, new Date(), fuso)
  const loja = await lojaDoLar(sessao.larId)
  const clientes = pedido.cliente ? await prisma.clienteLoja.findMany({ where: { lojaId: loja.id }, select: { id: true, nome: true, telefone: true } }) : []
  return ok({
    cliente: acharCliente(pedido.cliente, clientes),
    pedido,
    proposta: textoDaProposta(pedido),
    inicioEm: pedido.dia && pedido.hora ? instanteNoFuso(pedido.dia, pedido.hora, fuso).toISOString() : null,
  })
})
