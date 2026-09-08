/**
 * Escolha do gateway e regra de assinatura.
 *
 * Quem chama aqui não sabe qual provedor está atendendo. É o que permite o
 * cliente escolher entre Mercado Pago e Stripe sem espalhar `if` por tela,
 * rota e relatório.
 */

import type { CicloCobranca, ProvedorPagamento, StatusAssinatura } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { plano, type CodigoDoPlano } from "@/lib/planos"
import { precoVigenteCentavos, valoresVigentes } from "@/lib/parametros"
import { gatewayMercadoPago } from "@/lib/pagamento/mercadopago"
import { gatewayStripe } from "@/lib/pagamento/stripe"
import type { EfeitoDoEvento, Gateway } from "@/lib/pagamento/tipos"

export { GatewayNaoConfigurado, WebhookInvalido } from "@/lib/pagamento/tipos"
export type { EfeitoDoEvento, Gateway } from "@/lib/pagamento/tipos"

const GATEWAYS: Record<ProvedorPagamento, Gateway> = {
  MERCADO_PAGO: gatewayMercadoPago,
  STRIPE: gatewayStripe,
}

export function gateway(provedor: ProvedorPagamento): Gateway {
  return GATEWAYS[provedor]
}

export interface OpcaoDeGateway {
  provedor: ProvedorPagamento
  rotulo: string
  formasDePagamento: string
  configurado: boolean
}

/**
 * O que a tela de assinatura oferece.
 *
 * Devolve os dois sempre, com `configurado` dizendo a verdade. Esconder o
 * gateway sem chave faria a tela parecer que o produto só aceita um meio de
 * pagamento; mostrar desabilitado, com o motivo, é o que permite ao Davi ver
 * na própria tela que falta colar a chave.
 */
export function opcoesDeGateway(): OpcaoDeGateway[] {
  return (Object.keys(GATEWAYS) as ProvedorPagamento[]).map((provedor) => {
    const escolhido = GATEWAYS[provedor]
    return {
      provedor,
      rotulo: escolhido.rotulo,
      formasDePagamento: escolhido.formasDePagamento,
      configurado: escolhido.configurado(),
    }
  })
}

/**
 * O que cobrar hoje por um plano.
 *
 * Passa pelos parâmetros, e não por `planos.ts` direto, para que o valor
 * cobrado seja exatamente o que a landing anuncia depois de o Davi ajustar o
 * preço no admin.
 */
export async function valorDoPlanoCentavos(planoId: CodigoDoPlano, ciclo: CicloCobranca): Promise<number> {
  return precoVigenteCentavos(plano(planoId), ciclo, await valoresVigentes())
}

/**
 * Aplica no banco o efeito de um evento de webhook, uma única vez.
 *
 * Os dois provedores entregam "pelo menos uma vez": o mesmo evento chega de
 * novo quando a resposta demora, quando dá timeout, ou quando alguém clica em
 * reenviar no painel. Sem a trava, uma reentrega de `invoice.paid` criaria uma
 * segunda cobrança e o faturamento do painel admin passaria a mentir.
 *
 * A trava é o índice único (provedor, idEvento): quem grava primeiro ganha, e
 * quem chegar depois recebe P2002 e sai sem tocar em nada. Fazer isso com
 * `findFirst` antes do `create` deixaria a janela entre a leitura e a escrita
 * aberta para duas entregas simultâneas.
 */
export async function aplicarEvento(provedor: ProvedorPagamento, efeito: EfeitoDoEvento): Promise<"novo" | "repetido"> {
  try {
    await prisma.eventoWebhook.create({
      data: { provedor, idEvento: efeito.idEvento, tipo: efeito.tipo },
    })
  } catch (excecao) {
    const codigo = (excecao as { code?: string }).code
    if (codigo === "P2002") return "repetido"
    throw excecao
  }

  const assinatura = await localizarAssinatura(provedor, efeito)
  // Evento de uma assinatura que não é nossa (conta de teste do provedor,
  // cobrança avulsa). Fica registrado como recebido e não muda nada.
  if (!assinatura) return "novo"

  await prisma.assinatura.update({
    where: { id: assinatura.id },
    data: {
      status: efeito.status ?? undefined,
      idExterno: efeito.idExterno ?? assinatura.idExterno,
      clienteExterno: efeito.clienteExterno ?? assinatura.clienteExterno,
      proximaCobrancaEm: efeito.proximaCobrancaEm ?? undefined,
      // null zera a falha antiga (pagou, resolveu); undefined não mexe.
      motivoFalha: efeito.motivoFalha === undefined ? undefined : efeito.motivoFalha,
      inicioEm: efeito.status === "ATIVA" ? (assinatura.inicioEm ?? new Date()) : undefined,
      canceladaEm: efeito.status === "CANCELADA" ? (assinatura.canceladaEm ?? new Date()) : undefined,
    },
  })

  if (efeito.cobranca) {
    const dados = efeito.cobranca
    await prisma.cobranca.upsert({
      where: { provedor_idExterno: { provedor, idExterno: dados.idExterno } },
      create: {
        assinaturaId: assinatura.id,
        provedor,
        idExterno: dados.idExterno,
        status: dados.status,
        valorCentavos: dados.valorCentavos,
        motivoFalha: dados.motivoFalha ?? null,
        pagaEm: dados.pagaEm ?? null,
        competencia: (dados.pagaEm ?? new Date()).toISOString().slice(0, 7),
      },
      // A mesma cobrança pode ser recusada e depois aprovada na retentativa.
      update: {
        status: dados.status,
        valorCentavos: dados.valorCentavos,
        motivoFalha: dados.motivoFalha ?? null,
        pagaEm: dados.pagaEm ?? null,
      },
    })
  }

  return "novo"
}

async function localizarAssinatura(provedor: ProvedorPagamento, efeito: EfeitoDoEvento) {
  // A referência é o nosso próprio id e é o caminho mais confiável: ela existe
  // desde antes de o provedor ter atribuído um id à assinatura dele.
  if (efeito.referencia) {
    const porReferencia = await prisma.assinatura.findUnique({ where: { id: efeito.referencia } })
    if (porReferencia) return porReferencia
  }

  if (efeito.idExterno) {
    return prisma.assinatura.findFirst({ where: { provedor, idExterno: efeito.idExterno } })
  }

  return null
}

/** Rótulos em português para tela e relatório. Enum cru não se mostra a ninguém. */
export const ROTULO_STATUS: Record<StatusAssinatura, string> = {
  TESTE: "Em teste",
  PENDENTE: "Aguardando pagamento",
  ATIVA: "Ativa",
  INADIMPLENTE: "Pagamento em atraso",
  CANCELADA: "Cancelada",
}

export const ROTULO_PROVEDOR: Record<ProvedorPagamento, string> = {
  MERCADO_PAGO: "Mercado Pago",
  STRIPE: "Stripe",
}
