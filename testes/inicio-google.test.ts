import assert from "node:assert/strict"
import { test } from "node:test"
import { GET } from "../src/app/api/auth/google/route"

test("início Google preserva cookies no domínio do retorno e não reutiliza estado", async () => {
  const anterior = { id: process.env.GOOGLE_CLIENT_ID, segredo: process.env.GOOGLE_CLIENT_SECRET, retorno: process.env.GOOGLE_REDIRECT_URI }
  process.env.GOOGLE_CLIENT_ID = "cliente-teste"
  process.env.GOOGLE_CLIENT_SECRET = "segredo-teste"
  process.env.GOOGLE_REDIRECT_URI = "https://principal.example/api/auth/google/retorno"
  try {
    const alias = await GET(new Request("https://alias.example/api/auth/google?manter=0"))
    assert.equal(alias.headers.get("location"), "https://principal.example/api/auth/google?manter=0")
    assert.equal(alias.headers.get("set-cookie"), null)
    assert.equal(alias.headers.get("cache-control"), "no-store")
    const primeira = await GET(new Request("https://principal.example/api/auth/google?manter=0"))
    const segunda = await GET(new Request("https://principal.example/api/auth/google"))
    const url = new URL(primeira.headers.get("location")!)
    assert.equal(url.hostname, "accounts.google.com")
    assert.equal(url.searchParams.get("redirect_uri"), process.env.GOOGLE_REDIRECT_URI)
    assert.notEqual(url.searchParams.get("state"), new URL(segunda.headers.get("location")!).searchParams.get("state"))
    assert.match(primeira.headers.get("set-cookie")!, /google_estado=/)
    assert.match(primeira.headers.get("set-cookie")!, /google_manter=0/)
    assert.equal(primeira.headers.get("cache-control"), "no-store")
  } finally {
    for (const [chave, valor] of Object.entries({ GOOGLE_CLIENT_ID: anterior.id, GOOGLE_CLIENT_SECRET: anterior.segredo, GOOGLE_REDIRECT_URI: anterior.retorno })) {
      if (valor === undefined) delete process.env[chave]; else process.env[chave] = valor
    }
  }
})
