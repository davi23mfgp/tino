/**
 * Webhook do Mercado Pago.
 *
 * Três regras, nesta ordem, e nenhuma delas é opcional:
 *   1. conferir o `x-signature` antes de tocar em qualquer coisa;
 *   2. reler o recurso na API do provedor, nunca acreditar no corpo;
 *   3. registrar o evento para que a reentrega não cobre duas vezes.
 *
 * O corpo é lido cru (`text()`) porque a conferência da assinatura depende dos
 * bytes exatos que chegaram.
 */

import { NextResponse } from "next/server"

import { aplicarEvento, gateway, GatewayNaoConfigurado, WebhookInvalido } from "@/lib/pagamento"

/// Nunca em cache nem pré-renderizado: é uma rota de efeito colateral.
export const dynamic = "force-dynamic"

export async function POST(requisicao: Request) {
  const corpoCru = await requisicao.text()

  try {
    const efeito = await gateway("MERCADO_PAGO").lerWebhook(requisicao, corpoCru)
    // Evento de tipo que não nos interessa. 200 encerra a fila de reentrega —
    // devolver erro faria o Mercado Pago reenviá-lo indefinidamente.
    if (!efeito) return NextResponse.json({ ignorado: true })

    const resultado = await aplicarEvento("MERCADO_PAGO", efeito)
    return NextResponse.json({ recebido: true, repetido: resultado === "repetido" })
  } catch (excecao) {
    if (excecao instanceof WebhookInvalido) {
      console.warn("[tino] webhook do Mercado Pago recusado:", excecao.message)
      return NextResponse.json({ erro: "Assinatura inválida." }, { status: 400 })
    }

    // Sem chave configurada a rota não tem como conferir nada. 503 faz o
    // provedor reenviar depois, que é o certo enquanto o Davi não colou a
    // credencial.
    if (excecao instanceof GatewayNaoConfigurado) {
      console.warn("[tino] webhook do Mercado Pago sem credencial:", excecao.message)
      return NextResponse.json({ erro: "Gateway não configurado." }, { status: 503 })
    }

    console.error("[tino] falha ao processar webhook do Mercado Pago", excecao)
    // 500 pede reentrega. Engolir a falha com 200 perderia o pagamento em
    // silêncio, e ninguém descobriria antes do cliente reclamar.
    return NextResponse.json({ erro: "Falha ao processar." }, { status: 500 })
  }
}
