/**
 * Webhook da Stripe.
 *
 * O corpo é lido com `text()` e não com `json()`: a assinatura é calculada
 * sobre os bytes exatos que chegaram, e passar pelo `JSON.parse` para
 * reserializar depois muda espaços e ordem de chave — a assinatura deixa de
 * bater e todo evento legítimo passa a ser recusado.
 */

import { NextResponse } from "next/server"

import { aplicarEvento, gateway, GatewayNaoConfigurado, WebhookInvalido } from "@/lib/pagamento"

export const dynamic = "force-dynamic"

export async function POST(requisicao: Request) {
  const corpoCru = await requisicao.text()

  try {
    const efeito = await gateway("STRIPE").lerWebhook(requisicao, corpoCru)
    // 200 em evento ignorado: a Stripe desabilita endpoints que respondem erro
    // com frequência, e os tipos que não tratamos são a maioria do volume.
    if (!efeito) return NextResponse.json({ ignorado: true })

    const resultado = await aplicarEvento("STRIPE", efeito)
    return NextResponse.json({ recebido: true, repetido: resultado === "repetido" })
  } catch (excecao) {
    if (excecao instanceof WebhookInvalido) {
      console.warn("[tino] webhook da Stripe recusado:", excecao.message)
      return NextResponse.json({ erro: "Assinatura inválida." }, { status: 400 })
    }

    if (excecao instanceof GatewayNaoConfigurado) {
      console.warn("[tino] webhook da Stripe sem credencial:", excecao.message)
      return NextResponse.json({ erro: "Gateway não configurado." }, { status: 503 })
    }

    console.error("[tino] falha ao processar webhook da Stripe", excecao)
    return NextResponse.json({ erro: "Falha ao processar." }, { status: 500 })
  }
}
