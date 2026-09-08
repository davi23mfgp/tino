import assert from "node:assert/strict"
import { createHmac } from "node:crypto"
import { after, before, describe, it } from "node:test"

import { gatewayMercadoPago } from "@/lib/pagamento/mercadopago"
import { gatewayStripe } from "@/lib/pagamento/stripe"
import { GatewayNaoConfigurado, WebhookInvalido } from "@/lib/pagamento/tipos"

/**
 * A conferência de assinatura do webhook é a única barreira entre um POST
 * qualquer e uma conta virando "paga" no banco. É o teste que precisa falhar se
 * alguém mexer nela.
 */

const SEGREDO_STRIPE = "whsec_teste_nao_e_chave_real"
const SEGREDO_MP = "segredo_de_teste_do_mercado_pago"

function requisicaoStripe(corpo: string, cabecalho: string): Request {
  return new Request("https://tino.local/api/webhooks/stripe", {
    method: "POST",
    headers: { "stripe-signature": cabecalho },
    body: corpo,
  })
}

function assinarStripe(corpo: string, carimbo: number, segredo = SEGREDO_STRIPE): string {
  const hmac = createHmac("sha256", segredo).update(`${carimbo}.${corpo}`).digest("hex")
  return `t=${carimbo},v1=${hmac}`
}

describe("webhook da Stripe", () => {
  const antes = { chave: process.env.STRIPE_SECRET_KEY, segredo: process.env.STRIPE_WEBHOOK_SECRET }

  before(() => {
    process.env.STRIPE_WEBHOOK_SECRET = SEGREDO_STRIPE
  })

  after(() => {
    process.env.STRIPE_SECRET_KEY = antes.chave
    process.env.STRIPE_WEBHOOK_SECRET = antes.segredo
  })

  it("aceita evento com assinatura válida e traduz o status", async () => {
    const corpo = JSON.stringify({
      id: "evt_1",
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_1",
          status: "past_due",
          customer: "cus_1",
          metadata: { assinaturaId: "assinatura-local-1" },
          items: { data: [{ current_period_end: 1_800_000_000 }] },
        },
      },
    })
    const carimbo = Math.floor(Date.now() / 1000)

    const efeito = await gatewayStripe.lerWebhook(requisicaoStripe(corpo, assinarStripe(corpo, carimbo)), corpo)

    assert.ok(efeito)
    assert.equal(efeito.idEvento, "evt_1")
    assert.equal(efeito.idExterno, "sub_1")
    assert.equal(efeito.referencia, "assinatura-local-1")
    // past_due é inadimplência, não cancelamento: a Stripe ainda vai tentar de
    // novo, e tratar como cancelada faria a tela oferecer uma segunda
    // assinatura ao mesmo cliente.
    assert.equal(efeito.status, "INADIMPLENTE")
    assert.equal(efeito.proximaCobrancaEm?.getTime(), 1_800_000_000_000)
  })

  it("recusa assinatura calculada com outro segredo", async () => {
    const corpo = JSON.stringify({ id: "evt_2", type: "invoice.paid", data: { object: {} } })
    const carimbo = Math.floor(Date.now() / 1000)
    const forjada = assinarStripe(corpo, carimbo, "segredo-do-atacante")

    await assert.rejects(
      () => gatewayStripe.lerWebhook(requisicaoStripe(corpo, forjada), corpo),
      (erro: unknown) => erro instanceof WebhookInvalido,
    )
  })

  it("recusa corpo alterado depois de assinado", async () => {
    const original = JSON.stringify({ id: "evt_3", type: "invoice.paid", data: { object: { amount_paid: 100 } } })
    const carimbo = Math.floor(Date.now() / 1000)
    const cabecalho = assinarStripe(original, carimbo)
    const adulterado = original.replace("100", "999999")

    await assert.rejects(
      () => gatewayStripe.lerWebhook(requisicaoStripe(adulterado, cabecalho), adulterado),
      (erro: unknown) => erro instanceof WebhookInvalido,
    )
  })

  it("recusa evento fora da janela de tempo, mesmo com assinatura boa", async () => {
    const corpo = JSON.stringify({ id: "evt_4", type: "invoice.paid", data: { object: {} } })
    // Uma hora atrás: assinatura válida, mas é reapresentação de evento antigo.
    const velho = Math.floor(Date.now() / 1000) - 3600

    await assert.rejects(
      () => gatewayStripe.lerWebhook(requisicaoStripe(corpo, assinarStripe(corpo, velho)), corpo),
      (erro: unknown) => erro instanceof WebhookInvalido,
    )
  })

  it("recusa evento sem cabeçalho de assinatura", async () => {
    const corpo = JSON.stringify({ id: "evt_5", type: "invoice.paid", data: { object: {} } })
    const requisicao = new Request("https://tino.local/api/webhooks/stripe", { method: "POST", body: corpo })

    await assert.rejects(
      () => gatewayStripe.lerWebhook(requisicao, corpo),
      (erro: unknown) => erro instanceof WebhookInvalido,
    )
  })

  it("ignora tipo de evento que não interessa, sem erro", async () => {
    const corpo = JSON.stringify({ id: "evt_6", type: "payment_intent.created", data: { object: {} } })
    const carimbo = Math.floor(Date.now() / 1000)

    const efeito = await gatewayStripe.lerWebhook(requisicaoStripe(corpo, assinarStripe(corpo, carimbo)), corpo)
    assert.equal(efeito, null)
  })

  it("traduz invoice.paid em cobrança paga", async () => {
    const corpo = JSON.stringify({
      id: "evt_7",
      type: "invoice.paid",
      data: {
        object: {
          id: "in_1",
          subscription: "sub_9",
          amount_paid: 1990,
          status_transitions: { paid_at: 1_700_000_000 },
        },
      },
    })
    const carimbo = Math.floor(Date.now() / 1000)

    const efeito = await gatewayStripe.lerWebhook(requisicaoStripe(corpo, assinarStripe(corpo, carimbo)), corpo)

    assert.equal(efeito?.status, "ATIVA")
    assert.equal(efeito?.cobranca?.status, "PAGA")
    // Valor em centavos, do jeito que a Stripe manda e do jeito que gravamos.
    assert.equal(efeito?.cobranca?.valorCentavos, 1990)
  })

  it("declara-se não configurado sem STRIPE_SECRET_KEY", () => {
    delete process.env.STRIPE_SECRET_KEY
    assert.equal(gatewayStripe.configurado(), false)
    process.env.STRIPE_SECRET_KEY = "sk_test_falsa"
    assert.equal(gatewayStripe.configurado(), true)
  })
})

describe("webhook do Mercado Pago", () => {
  const antes = { token: process.env.MERCADO_PAGO_ACCESS_TOKEN, segredo: process.env.MERCADO_PAGO_WEBHOOK_SECRET }

  before(() => {
    process.env.MERCADO_PAGO_WEBHOOK_SECRET = SEGREDO_MP
  })

  after(() => {
    process.env.MERCADO_PAGO_ACCESS_TOKEN = antes.token
    process.env.MERCADO_PAGO_WEBHOOK_SECRET = antes.segredo
  })

  function requisicao(cabecalhoAssinatura: string, requestId = "req-1"): Request {
    return new Request("https://tino.local/api/webhooks/mercadopago", {
      method: "POST",
      headers: { "x-signature": cabecalhoAssinatura, "x-request-id": requestId },
    })
  }

  function assinar(dataId: string, ts: string, requestId = "req-1", segredo = SEGREDO_MP): string {
    const manifesto = `id:${dataId};request-id:${requestId};ts:${ts};`
    return `ts=${ts},v1=${createHmac("sha256", segredo).update(manifesto).digest("hex")}`
  }

  it("aceita o manifesto no formato documentado e ignora tipo desconhecido", async () => {
    const corpo = JSON.stringify({ id: 1, type: "payment", data: { id: "12345" } })
    const efeito = await gatewayMercadoPago.lerWebhook(requisicao(assinar("12345", "1704908010")), corpo)
    // Assinatura conferida e evento fora do escopo de assinatura: nada a fazer,
    // e sem ida à rede.
    assert.equal(efeito, null)
  })

  it("monta o manifesto com o data.id em minúsculas", async () => {
    // A documentação avisa: o id chega com maiúsculas mas foi assinado em
    // minúsculas. Sem o toLowerCase, todo evento com id alfanumérico é recusado.
    const corpo = JSON.stringify({ id: 2, type: "payment", data: { id: "ABC123" } })
    const efeito = await gatewayMercadoPago.lerWebhook(requisicao(assinar("abc123", "1704908011")), corpo)
    assert.equal(efeito, null)
  })

  it("recusa assinatura de outro segredo", async () => {
    const corpo = JSON.stringify({ id: 3, type: "payment", data: { id: "999" } })
    const forjada = assinar("999", "1704908012", "req-1", "segredo-do-atacante")

    await assert.rejects(
      () => gatewayMercadoPago.lerWebhook(requisicao(forjada), corpo),
      (erro: unknown) => erro instanceof WebhookInvalido,
    )
  })

  it("recusa quando o x-request-id não é o que foi assinado", async () => {
    const corpo = JSON.stringify({ id: 4, type: "payment", data: { id: "777" } })
    const cabecalho = assinar("777", "1704908013", "req-original")

    await assert.rejects(
      () => gatewayMercadoPago.lerWebhook(requisicao(cabecalho, "req-trocado"), corpo),
      (erro: unknown) => erro instanceof WebhookInvalido,
    )
  })

  it("recusa notificação sem x-signature", async () => {
    const corpo = JSON.stringify({ id: 5, type: "payment", data: { id: "555" } })
    const semCabecalho = new Request("https://tino.local/api/webhooks/mercadopago", { method: "POST" })

    await assert.rejects(
      () => gatewayMercadoPago.lerWebhook(semCabecalho, corpo),
      (erro: unknown) => erro instanceof WebhookInvalido,
    )
  })

  it("reclama de segredo ausente em vez de aceitar qualquer coisa", async () => {
    delete process.env.MERCADO_PAGO_WEBHOOK_SECRET
    const corpo = JSON.stringify({ id: 6, type: "payment", data: { id: "111" } })

    await assert.rejects(
      () => gatewayMercadoPago.lerWebhook(requisicao("ts=1,v1=qualquer"), corpo),
      (erro: unknown) => erro instanceof GatewayNaoConfigurado,
    )

    process.env.MERCADO_PAGO_WEBHOOK_SECRET = SEGREDO_MP
  })

  it("declara-se não configurado sem MERCADO_PAGO_ACCESS_TOKEN", () => {
    delete process.env.MERCADO_PAGO_ACCESS_TOKEN
    assert.equal(gatewayMercadoPago.configurado(), false)
    process.env.MERCADO_PAGO_ACCESS_TOKEN = "TEST-falsa"
    assert.equal(gatewayMercadoPago.configurado(), true)
  })
})
