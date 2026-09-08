/**
 * Mercado Pago — assinatura recorrente pela API de Preapproval.
 *
 * Fluxo, conforme a referência de Subscriptions do Mercado Pago:
 *   POST /preapproval com `status: "pending"` devolve um `init_point`;
 *   o pagador escolhe o meio de pagamento no site do Mercado Pago;
 *   a assinatura passa a `authorized` e o webhook avisa.
 *
 * Sem plano associado (`preapproval_plan_id`) de propósito: com dois planos e
 * dois ciclos seriam quatro planos cadastrados no painel do Mercado Pago, e
 * mudar preço exigiria mexer lá e aqui. O valor vai no próprio preapproval.
 *
 * Nenhuma chave fica em código. Sem `MERCADO_PAGO_ACCESS_TOKEN` o gateway se
 * declara não configurado e a tela desabilita o botão — o app continua inteiro.
 */

import { createHmac, timingSafeEqual } from "node:crypto"

import type { CheckoutCriado, EfeitoDoEvento, Gateway, PedidoDeCheckout } from "@/lib/pagamento/tipos"
import { GatewayNaoConfigurado, WebhookInvalido } from "@/lib/pagamento/tipos"

const BASE = "https://api.mercadopago.com"

function token(): string {
  const valor = process.env.MERCADO_PAGO_ACCESS_TOKEN
  if (!valor) throw new GatewayNaoConfigurado("Mercado Pago: MERCADO_PAGO_ACCESS_TOKEN não configurado.")
  return valor
}

async function chamar<T>(caminho: string, init?: RequestInit & { idempotencia?: string }): Promise<T> {
  const { idempotencia, ...resto } = init ?? {}

  const resposta = await fetch(`${BASE}${caminho}`, {
    ...resto,
    headers: {
      Authorization: `Bearer ${token()}`,
      "Content-Type": "application/json",
      // Reenvio do mesmo pedido não pode virar uma segunda assinatura cobrando
      // o cliente duas vezes.
      ...(idempotencia ? { "X-Idempotency-Key": idempotencia } : {}),
      ...(resto.headers ?? {}),
    },
    cache: "no-store",
  })

  const texto = await resposta.text()
  if (!resposta.ok) throw new Error(`Mercado Pago ${resposta.status}: ${texto.slice(0, 300)}`)
  return (texto ? JSON.parse(texto) : null) as T
}

/** Centavos -> reais. O Mercado Pago cobra em unidade decimal, não em centavos. */
function paraReais(centavos: number): number {
  return Number((centavos / 100).toFixed(2))
}

interface Preapproval {
  id: string
  status: "pending" | "authorized" | "paused" | "cancelled"
  init_point?: string
  external_reference?: string
  next_payment_date?: string
  payer_id?: number
  auto_recurring?: { transaction_amount?: number }
}

interface PagamentoAutorizado {
  id: number | string
  preapproval_id: string
  status: "scheduled" | "processed" | "recycling" | "cancelled"
  transaction_amount?: number
  payment?: { id?: number; status?: string; status_detail?: string }
  debit_date?: string
  next_retry_date?: string
}

/** "authorized" vira ATIVA e "paused" vira INADIMPLENTE: o Mercado Pago pausa a
 * assinatura quando as tentativas de cobrança se esgotam, e chamar isso de
 * cancelamento faria a tela oferecer "assinar de novo" a quem só precisa
 * trocar o cartão. */
const STATUS_ASSINATURA = {
  pending: "PENDENTE",
  authorized: "ATIVA",
  paused: "INADIMPLENTE",
  cancelled: "CANCELADA",
} as const

/**
 * Confere o `x-signature` do webhook.
 *
 * O Mercado Pago manda `ts=...,v1=...`, onde v1 é o HMAC-SHA256, em hexadecimal,
 * do template `id:<data.id>;request-id:<x-request-id>;ts:<ts>;` assinado com o
 * segredo do webhook. O `data.id` entra sempre em minúsculas — a documentação
 * avisa que ele pode chegar com maiúsculas na notificação e mesmo assim ter
 * sido assinado em minúsculas.
 */
function conferirAssinatura(requisicao: Request, dataId: string) {
  const segredo = process.env.MERCADO_PAGO_WEBHOOK_SECRET
  if (!segredo) throw new GatewayNaoConfigurado("Mercado Pago: MERCADO_PAGO_WEBHOOK_SECRET não configurado.")

  const cabecalho = requisicao.headers.get("x-signature")
  if (!cabecalho) throw new WebhookInvalido("Notificação sem x-signature.")

  const partes = Object.fromEntries(
    cabecalho.split(",").map((pedaco) => {
      const [chave, ...valor] = pedaco.split("=")
      return [chave.trim(), valor.join("=").trim()]
    }),
  )

  const ts = partes.ts
  const v1 = partes.v1
  if (!ts || !v1) throw new WebhookInvalido("x-signature sem ts ou v1.")

  const requestId = requisicao.headers.get("x-request-id") ?? ""
  const manifesto = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`
  const esperado = createHmac("sha256", segredo).update(manifesto).digest("hex")

  const a = Buffer.from(esperado, "utf8")
  const b = Buffer.from(v1, "utf8")
  // Comparação de tempo constante: `===` vaza, pelo tempo de resposta, quantos
  // caracteres iniciais o atacante já acertou.
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new WebhookInvalido("Assinatura do webhook não confere.")
}

export const gatewayMercadoPago: Gateway = {
  nome: "MERCADO_PAGO",
  rotulo: "Mercado Pago",
  formasDePagamento: "Cartão de crédito, débito e saldo em conta do Mercado Pago.",

  configurado() {
    return Boolean(process.env.MERCADO_PAGO_ACCESS_TOKEN)
  },

  async criarCheckout(pedido: PedidoDeCheckout): Promise<CheckoutCriado> {
    const preapproval = await chamar<Preapproval>("/preapproval", {
      method: "POST",
      idempotencia: pedido.referencia,
      body: JSON.stringify({
        reason: `Tino — ${pedido.nomeDoPlano}`,
        external_reference: pedido.referencia,
        payer_email: pedido.emailDoPagador,
        back_url: pedido.urlRetorno,
        // "pending" é o que faz o Mercado Pago devolver o init_point para o
        // pagador escolher o meio de pagamento. "authorized" exigiria um
        // card_token, e token de cartão só existe se o cartão passar por aqui.
        status: "pending",
        auto_recurring: {
          frequency: 1,
          frequency_type: pedido.ciclo === "ANUAL" ? "years" : "months",
          transaction_amount: paraReais(pedido.valorCentavos),
          currency_id: "BRL",
        },
      }),
    })

    if (!preapproval.init_point) throw new Error("Mercado Pago não devolveu o endereço de pagamento.")

    return {
      url: preapproval.init_point,
      idExterno: preapproval.id,
      clienteExterno: preapproval.payer_id ? String(preapproval.payer_id) : null,
    }
  },

  async cancelar(idExterno: string) {
    await chamar(`/preapproval/${idExterno}`, {
      method: "PUT",
      body: JSON.stringify({ status: "cancelled" }),
    })
  },

  async lerWebhook(requisicao, corpoCru): Promise<EfeitoDoEvento | null> {
    let aviso: { id?: string | number; type?: string; topic?: string; action?: string; data?: { id?: string } }
    try {
      aviso = JSON.parse(corpoCru)
    } catch {
      throw new WebhookInvalido("Corpo da notificação não é JSON.")
    }

    const dataId = aviso.data?.id
    if (!dataId) return null

    conferirAssinatura(requisicao, String(dataId))

    const tipo = aviso.type ?? aviso.topic ?? ""
    // O id do evento é o da notificação. Duas notificações do mesmo recurso são
    // eventos diferentes (uma criou, outra autorizou) e precisam ser processadas.
    const idEvento = String(aviso.id ?? `${tipo}:${dataId}`)

    // O recurso é sempre relido da API. O corpo da notificação traz só o id, e
    // mesmo se trouxesse o status, acreditar no corpo é acreditar em quem
    // chamou a rota.
    if (tipo === "subscription_preapproval") {
      const assinatura = await chamar<Preapproval>(`/preapproval/${dataId}`)
      return {
        idEvento,
        tipo,
        idExterno: assinatura.id,
        referencia: assinatura.external_reference,
        clienteExterno: assinatura.payer_id ? String(assinatura.payer_id) : undefined,
        status: STATUS_ASSINATURA[assinatura.status],
        proximaCobrancaEm: assinatura.next_payment_date ? new Date(assinatura.next_payment_date) : undefined,
        motivoFalha: assinatura.status === "authorized" ? null : undefined,
      }
    }

    if (tipo === "subscription_authorized_payment") {
      const cobranca = await chamar<PagamentoAutorizado>(`/authorized_payments/${dataId}`)
      const pago = cobranca.status === "processed" && cobranca.payment?.status === "approved"
      const falhou = cobranca.status === "recycling" || cobranca.payment?.status === "rejected"

      return {
        idEvento,
        tipo,
        idExterno: cobranca.preapproval_id,
        status: pago ? "ATIVA" : falhou ? "INADIMPLENTE" : undefined,
        motivoFalha: pago ? null : falhou ? (cobranca.payment?.status_detail ?? "Cobrança recusada.") : undefined,
        cobranca: {
          idExterno: String(cobranca.id),
          status: pago ? "PAGA" : falhou ? "FALHOU" : "PENDENTE",
          valorCentavos: Math.round((cobranca.transaction_amount ?? 0) * 100),
          motivoFalha: falhou ? (cobranca.payment?.status_detail ?? undefined) : undefined,
          pagaEm: pago && cobranca.debit_date ? new Date(cobranca.debit_date) : pago ? new Date() : undefined,
        },
      }
    }

    // Notificação de pagamento avulso, teste do painel, etc. Ignorada de
    // propósito — e com 200, senão o Mercado Pago reenvia para sempre.
    return null
  },
}
