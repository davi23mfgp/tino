/**
 * Contrato comum dos gateways de cobrança.
 *
 * O Tino vende pelos dois — Mercado Pago e Stripe — e o cliente escolhe. Sem
 * um contrato único, cada tela e cada rota precisaria saber que no Mercado Pago
 * a assinatura se chama "preapproval" e está "authorized", e que no Stripe ela
 * se chama "subscription" e está "active". O vocabulário de cada provedor
 * termina no arquivo dele.
 */

import type { CicloCobranca, ProvedorPagamento, StatusAssinatura, StatusCobranca } from "@prisma/client"

import type { CodigoDoPlano } from "@/lib/planos"

export interface PedidoDeCheckout {
  /// Id da nossa Assinatura. Vai junto como referência externa e é por ele que
  /// o webhook reencontra a linha, mesmo antes de o provedor ter devolvido o id
  /// dele.
  referencia: string
  planoId: CodigoDoPlano
  nomeDoPlano: string
  ciclo: CicloCobranca
  valorCentavos: number
  emailDoPagador: string
  /// Para onde o provedor devolve o navegador quando a pessoa termina.
  urlRetorno: string
}

export interface CheckoutCriado {
  /// Endereço do provedor para onde o navegador é enviado. O cartão nunca passa
  /// pelo Tino: dado de cartão em servidor nosso significaria PCI-DSS e uma
  /// superfície de vazamento que não temos por que carregar.
  url: string
  idExterno: string | null
  clienteExterno: string | null
}

/**
 * O que um evento de webhook muda no banco, já traduzido.
 *
 * Campo ausente significa "não mexer": um evento de pagamento não sabe nada
 * sobre a data da próxima cobrança, e sobrescrevê-la com null apagaria o que o
 * evento anterior tinha acertado.
 */
export interface EfeitoDoEvento {
  idEvento: string
  tipo: string
  /// Um dos dois localiza a assinatura: o id do provedor, ou a referência que
  /// mandamos no checkout.
  idExterno?: string
  referencia?: string
  clienteExterno?: string
  status?: StatusAssinatura
  proximaCobrancaEm?: Date
  motivoFalha?: string | null
  cobranca?: {
    idExterno: string
    status: StatusCobranca
    valorCentavos: number
    motivoFalha?: string
    pagaEm?: Date
  }
}

export interface Gateway {
  nome: ProvedorPagamento
  /// Como o botão aparece na tela.
  rotulo: string
  /// O que o cliente ganha escolhendo este — a tela precisa dizer, senão a
  /// escolha entre dois nomes de empresa não significa nada para quem só quer
  /// pagar.
  formasDePagamento: string
  /// Falso quando falta variável de ambiente. O app inteiro continua de pé:
  /// a tela mostra o motivo e desabilita o botão em vez de estourar.
  configurado(): boolean
  criarCheckout(pedido: PedidoDeCheckout): Promise<CheckoutCriado>
  cancelar(idExterno: string): Promise<void>
  /**
   * Confere a assinatura do webhook e traduz o evento.
   *
   * Devolve null quando o evento é de um tipo que não nos interessa — assinar
   * um evento e ignorá-lo é diferente de recusá-lo, e só o segundo faz o
   * provedor reenviar.
   *
   * Lança quando a assinatura não confere: payload não verificado não encosta
   * no banco.
   */
  lerWebhook(requisicao: Request, corpoCru: string): Promise<EfeitoDoEvento | null>
}

/** Assinatura de webhook inválida. A rota devolve 400 e não processa nada. */
export class WebhookInvalido extends Error {}

/** Falta chave de API. A tela mostra a mensagem; o build não quebra. */
export class GatewayNaoConfigurado extends Error {}
