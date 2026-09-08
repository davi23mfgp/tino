/**
 * Stripe — assinatura por Checkout Session em modo `subscription`.
 *
 * Fluxo: POST /v1/checkout/sessions com `mode=subscription` devolve uma `url`;
 * o pagador paga no domínio da Stripe; os eventos
 * `checkout.session.completed`, `customer.subscription.*` e `invoice.*` contam
 * o resto.
 *
 * O preço vai como `price_data` em vez de um `price` cadastrado no painel:
 * dois planos vezes dois ciclos dariam quatro preços para manter em sincronia
 * com `planos.ts`, e o primeiro reajuste deixaria os dois lugares diferentes.
 *
 * Falado com a API REST direto, sem o SDK: o resto do projeto integra assim
 * (veja `open-finance/provedores/pluggy.ts`) e uma dependência a menos é uma
 * dependência a menos para atualizar.
 */

import { createHmac, timingSafeEqual } from "node:crypto"

import type { CheckoutCriado, EfeitoDoEvento, Gateway, PedidoDeCheckout } from "@/lib/pagamento/tipos"
import { GatewayNaoConfigurado, WebhookInvalido } from "@/lib/pagamento/tipos"

const BASE = "https://api.stripe.com/v1"

/// Fixada para o comportamento não mudar debaixo do app quando a Stripe
/// publica uma versão nova. Subir de versão passa a ser uma decisão, com
/// changelog lido, e não uma surpresa numa terça-feira.
const VERSAO_API = "2025-06-30.basil"

/// Janela aceita entre o carimbo do evento e agora. Cinco minutos é o padrão da
/// Stripe: sem ela, um evento capturado hoje poderia ser reenviado por um
/// atacante amanhã com a mesma assinatura válida.
const TOLERANCIA_SEGUNDOS = 300

function chave(): string {
  const valor = process.env.STRIPE_SECRET_KEY
  if (!valor) throw new GatewayNaoConfigurado("Stripe: STRIPE_SECRET_KEY não configurada.")
  return valor
}

/**
 * A API da Stripe recebe formulário, não JSON, e representa objeto aninhado
 * como `a[b][c]`. Este achatamento evita montar essas chaves na mão em cada
 * chamada, onde um colchete errado vira um campo silenciosamente ignorado.
 */
function paraFormulario(objeto: Record<string, unknown>, prefixo = ""): URLSearchParams {
  const forma = new URLSearchParams()

  for (const [chaveBruta, valor] of Object.entries(objeto)) {
    if (valor === undefined || valor === null) continue
    const nome = prefixo ? `${prefixo}[${chaveBruta}]` : chaveBruta

    if (typeof valor === "object") {
      for (const [interna, conteudo] of paraFormulario(valor as Record<string, unknown>, nome)) {
        forma.append(interna, conteudo)
      }
    } else {
      forma.append(nome, String(valor))
    }
  }

  return forma
}

async function chamar<T>(
  caminho: string,
  opcoes?: { corpo?: Record<string, unknown>; idempotencia?: string },
): Promise<T> {
  const resposta = await fetch(`${BASE}${caminho}`, {
    method: opcoes?.corpo ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${chave()}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Stripe-Version": VERSAO_API,
      ...(opcoes?.idempotencia ? { "Idempotency-Key": opcoes.idempotencia } : {}),
    },
    body: opcoes?.corpo ? paraFormulario(opcoes.corpo).toString() : undefined,
    cache: "no-store",
  })

  const texto = await resposta.text()
  if (!resposta.ok) throw new Error(`Stripe ${resposta.status}: ${texto.slice(0, 300)}`)
  return JSON.parse(texto) as T
}

interface Assinatura {
  id: string
  status: "trialing" | "active" | "past_due" | "unpaid" | "canceled" | "incomplete" | "incomplete_expired" | "paused"
  customer: string
  current_period_end?: number
  cancel_at_period_end?: boolean
  metadata?: Record<string, string>
  items?: { data?: { current_period_end?: number }[] }
}

/// `past_due` e `unpaid` são inadimplência, não cancelamento: a Stripe ainda vai
/// tentar cobrar de novo, e oferecer "assinar outra vez" a quem só precisa
/// trocar o cartão criaria uma segunda assinatura cobrando o mesmo cliente.
const STATUS_ASSINATURA = {
  trialing: "TESTE",
  active: "ATIVA",
  past_due: "INADIMPLENTE",
  unpaid: "INADIMPLENTE",
  paused: "INADIMPLENTE",
  canceled: "CANCELADA",
  incomplete: "PENDENTE",
  incomplete_expired: "CANCELADA",
} as const

/** A partir da versão Basil o fim do período vive no item, não na assinatura. */
function fimDoPeriodo(assinatura: Assinatura): Date | undefined {
  const marca = assinatura.items?.data?.[0]?.current_period_end ?? assinatura.current_period_end
  return marca ? new Date(marca * 1000) : undefined
}

/**
 * Confere o `stripe-signature`.
 *
 * O cabeçalho traz `t=<carimbo>` e um ou mais `v1=<hmac>`. O HMAC-SHA256 é
 * calculado sobre `<carimbo>.<corpo cru>` com o segredo do endpoint. O corpo
 * tem de ser exatamente os bytes recebidos: passar pelo `JSON.parse` e
 * reserializar muda espaços e ordem, e a assinatura deixa de bater.
 */
function conferirAssinatura(requisicao: Request, corpoCru: string) {
  const segredo = process.env.STRIPE_WEBHOOK_SECRET
  if (!segredo) throw new GatewayNaoConfigurado("Stripe: STRIPE_WEBHOOK_SECRET não configurado.")

  const cabecalho = requisicao.headers.get("stripe-signature")
  if (!cabecalho) throw new WebhookInvalido("Evento sem stripe-signature.")

  let carimbo = ""
  const assinaturas: string[] = []
  for (const pedaco of cabecalho.split(",")) {
    const [nome, valor] = pedaco.split("=")
    if (nome?.trim() === "t") carimbo = valor?.trim() ?? ""
    if (nome?.trim() === "v1" && valor) assinaturas.push(valor.trim())
  }

  if (!carimbo || assinaturas.length === 0) throw new WebhookInvalido("stripe-signature sem t ou v1.")

  const idade = Math.abs(Date.now() / 1000 - Number(carimbo))
  if (!Number.isFinite(idade) || idade > TOLERANCIA_SEGUNDOS) throw new WebhookInvalido("Evento fora da janela de tempo.")

  const esperado = createHmac("sha256", segredo).update(`${carimbo}.${corpoCru}`).digest("hex")
  const referencia = Buffer.from(esperado, "utf8")

  const confere = assinaturas.some((candidata) => {
    const recebida = Buffer.from(candidata, "utf8")
    return recebida.length === referencia.length && timingSafeEqual(recebida, referencia)
  })

  if (!confere) throw new WebhookInvalido("Assinatura do webhook não confere.")
}

export const gatewayStripe: Gateway = {
  nome: "STRIPE",
  rotulo: "Stripe",
  formasDePagamento: "Cartão de crédito nacional e internacional.",

  configurado() {
    return Boolean(process.env.STRIPE_SECRET_KEY)
  },

  async criarCheckout(pedido: PedidoDeCheckout): Promise<CheckoutCriado> {
    const sessao = await chamar<{ id: string; url?: string; customer?: string }>("/checkout/sessions", {
      idempotencia: pedido.referencia,
      corpo: {
        mode: "subscription",
        locale: "pt-BR",
        // Volta pela nossa tela em vez de por uma página da Stripe: quem acabou
        // de pagar precisa ver o próprio status, e o webhook pode ainda não ter
        // chegado quando o navegador volta.
        success_url: `${pedido.urlRetorno}?pago=1`,
        cancel_url: `${pedido.urlRetorno}?pago=0`,
        client_reference_id: pedido.referencia,
        customer_email: pedido.emailDoPagador,
        line_items: {
          0: {
            quantity: 1,
            price_data: {
              currency: "brl",
              unit_amount: pedido.valorCentavos,
              product_data: { name: `Tino — ${pedido.nomeDoPlano}` },
              recurring: { interval: pedido.ciclo === "ANUAL" ? "year" : "month" },
            },
          },
        },
        subscription_data: { metadata: { assinaturaId: pedido.referencia } },
      },
    })

    if (!sessao.url) throw new Error("Stripe não devolveu o endereço de pagamento.")
    return { url: sessao.url, idExterno: null, clienteExterno: sessao.customer ?? null }
  },

  async cancelar(idExterno: string) {
    // Cancela no fim do período, não na hora: o mês já foi pago, e cortar o
    // acesso no mesmo instante seria vender trinta dias e entregar dez.
    await chamar(`/subscriptions/${idExterno}`, { corpo: { cancel_at_period_end: true } })
  },

  async lerWebhook(requisicao, corpoCru): Promise<EfeitoDoEvento | null> {
    conferirAssinatura(requisicao, corpoCru)

    const evento = JSON.parse(corpoCru) as {
      id: string
      type: string
      data: { object: Record<string, unknown> }
    }

    const objeto = evento.data.object
    const base = { idEvento: evento.id, tipo: evento.type }

    if (evento.type === "checkout.session.completed") {
      const sessao = objeto as {
        client_reference_id?: string
        subscription?: string
        customer?: string
        payment_status?: string
      }
      return {
        ...base,
        referencia: sessao.client_reference_id,
        idExterno: sessao.subscription,
        clienteExterno: sessao.customer,
        // Só o `customer.subscription.*` diz o estado real da assinatura; aqui
        // basta registrar que o checkout voltou e amarrar os ids.
        status: sessao.payment_status === "paid" ? "ATIVA" : "PENDENTE",
      }
    }

    if (evento.type.startsWith("customer.subscription.")) {
      const assinatura = objeto as unknown as Assinatura
      const status = evento.type.endsWith(".deleted") ? "CANCELADA" : STATUS_ASSINATURA[assinatura.status]

      return {
        ...base,
        idExterno: assinatura.id,
        referencia: assinatura.metadata?.assinaturaId,
        clienteExterno: assinatura.customer,
        status,
        proximaCobrancaEm: fimDoPeriodo(assinatura),
        motivoFalha: status === "ATIVA" ? null : undefined,
      }
    }

    if (evento.type === "invoice.paid" || evento.type === "invoice.payment_failed") {
      const fatura = objeto as {
        id?: string
        subscription?: string
        parent?: { subscription_details?: { subscription?: string } }
        amount_due?: number
        amount_paid?: number
        status_transitions?: { paid_at?: number }
        last_finalization_error?: { message?: string }
      }
      const pago = evento.type === "invoice.paid"
      // A partir da Basil o vínculo com a assinatura mudou de lugar; os dois
      // caminhos ficam para a fatura não virar cobrança órfã.
      const assinaturaId = fatura.subscription ?? fatura.parent?.subscription_details?.subscription

      return {
        ...base,
        idExterno: assinaturaId,
        status: pago ? "ATIVA" : "INADIMPLENTE",
        motivoFalha: pago ? null : (fatura.last_finalization_error?.message ?? "Cobrança recusada pelo banco emissor."),
        cobranca: {
          idExterno: String(fatura.id ?? evento.id),
          status: pago ? "PAGA" : "FALHOU",
          valorCentavos: pago ? (fatura.amount_paid ?? 0) : (fatura.amount_due ?? 0),
          motivoFalha: pago ? undefined : fatura.last_finalization_error?.message,
          pagaEm: pago
            ? fatura.status_transitions?.paid_at
              ? new Date(fatura.status_transitions.paid_at * 1000)
              : new Date()
            : undefined,
        },
      }
    }

    return null
  },
}
