import test from "node:test"
import assert from "node:assert/strict"
import { createHmac, randomBytes } from "node:crypto"

/**
 * Porteiro do webhook de faturas por e-mail.
 *
 * Assina o corpo do jeito que a Svix assina, com HMAC local — nenhum teste
 * aqui fala com a Resend nem com a rede, e nenhum chega a tocar no banco:
 * todos param antes, num dos portões (configuração ausente, assinatura
 * inválida, evento de outro tipo, destinatário desconhecido).
 */

const SEGREDO_BRUTO = randomBytes(24)
const SEGREDO = `whsec_${SEGREDO_BRUTO.toString("base64")}`

process.env.DATABASE_URL ??= "postgresql://usuario:senha@127.0.0.1:5432/tino_teste"
process.env.RESEND_API_KEY = "re_teste"
process.env.RESEND_WEBHOOK_SECRET = SEGREDO
process.env.FATURAS_EMAIL_DOMINIO = "faturas.tino.app"
process.env.FATURAS_EMAIL_SEGREDO = "segredo-de-teste-nao-usado-em-producao"

import { POST } from "../src/app/api/webhooks/faturas-email/route"
import { enderecoFaturas } from "../src/lib/faturas-email"

function assinar(corpo: string, id = "msg_teste") {
  const momento = Math.floor(Date.now() / 1000).toString()
  const assinatura = createHmac("sha256", SEGREDO_BRUTO).update(`${id}.${momento}.${corpo}`).digest("base64")
  return { "svix-id": id, "svix-timestamp": momento, "svix-signature": `v1,${assinatura}` }
}

function pedido(evento: unknown, cabecalhos?: Record<string, string>) {
  const corpo = JSON.stringify(evento)
  return new Request("https://tino.app/api/webhooks/faturas-email", {
    method: "POST",
    body: corpo,
    headers: { "content-type": "application/json", ...(cabecalhos ?? assinar(corpo)) },
  })
}

test("sem configuração o webhook responde 503 e não processa", async () => {
  const segredo = process.env.FATURAS_EMAIL_SEGREDO
  delete process.env.FATURAS_EMAIL_SEGREDO
  const resposta = await POST(pedido({ type: "email.received" }))
  assert.equal(resposta.status, 503)
  process.env.FATURAS_EMAIL_SEGREDO = segredo
})

test("assinatura ausente é recusada com 401", async () => {
  const resposta = await POST(pedido({ type: "email.received" }, {}))
  assert.equal(resposta.status, 401)
  assert.equal((await resposta.json()).erro, "Assinatura inválida.")
})

test("assinatura de outro segredo é recusada com 401", async () => {
  const corpo = JSON.stringify({ type: "email.received" })
  const momento = Math.floor(Date.now() / 1000).toString()
  const forjada = createHmac("sha256", randomBytes(24)).update(`msg_x.${momento}.${corpo}`).digest("base64")
  const resposta = await POST(
    new Request("https://tino.app/api/webhooks/faturas-email", {
      method: "POST",
      body: corpo,
      headers: { "svix-id": "msg_x", "svix-timestamp": momento, "svix-signature": `v1,${forjada}` },
    }),
  )
  assert.equal(resposta.status, 401)
})

test("corpo adulterado depois de assinado é recusado", async () => {
  const original = JSON.stringify({ type: "email.received", data: { email_id: "e1", to: [] } })
  const cabecalhos = assinar(original)
  const adulterado = JSON.stringify({ type: "email.received", data: { email_id: "e2", to: [] } })
  const resposta = await POST(
    new Request("https://tino.app/api/webhooks/faturas-email", {
      method: "POST",
      body: adulterado,
      headers: cabecalhos,
    }),
  )
  assert.equal(resposta.status, 401)
})

test("evento de outro tipo é ignorado sem tocar no banco", async () => {
  const resposta = await POST(pedido({ type: "email.delivered", data: { email_id: "e1", to: [] } }))
  assert.equal(resposta.status, 200)
  assert.deepEqual(await resposta.json(), { ignorado: true })
})

test("destinatário desconhecido é ignorado sem tocar no banco", async () => {
  const resposta = await POST(
    pedido({ type: "email.received", data: { email_id: "e1", to: ["qualquer@faturas.tino.app"] } }),
  )
  assert.equal(resposta.status, 200)
  assert.deepEqual(await resposta.json(), { ignorado: true })
})

test("assinatura de conta com domínio errado é ignorada", async () => {
  const local = enderecoFaturas("conta1")!.split("@")[0]
  const resposta = await POST(
    pedido({ type: "email.received", data: { email_id: "e1", to: [`${local}@dominio-errado.com`] } }),
  )
  assert.equal(resposta.status, 200)
  assert.deepEqual(await resposta.json(), { ignorado: true })
})
