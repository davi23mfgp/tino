import assert from "node:assert/strict"
import { randomBytes } from "node:crypto"
import { test } from "node:test"
import { abrirSegredo, cifrarSegredo } from "@/lib/criptografia"
import { codificarBase32, codigoTotp, conferirTotp, criarCodigosRecuperacao, hashRecuperacao } from "@/lib/totp"
import { origemPermitida } from "@/lib/origem-segura"
import { politicaDeConteudo } from "@/lib/politica-conteudo"

test("TOTP coincide com os seis vetores publicados na RFC 6238 (SHA-1)", () => {
  const segredo = codificarBase32(Buffer.from("12345678901234567890"))
  for (const [segundos, esperado] of [[59, "94287082"], [1111111109, "07081804"], [1111111111, "14050471"], [1234567890, "89005924"], [2000000000, "69279037"], [20000000000, "65353130"]] as const) {
    assert.equal(codigoTotp(segredo, Math.floor(segundos / 30), 8), esperado)
  }
})

test("TOTP rejeita reutilização, código antigo, formato inválido e aceita tolerância de um passo", () => {
  const segredo = codificarBase32(Buffer.from("12345678901234567890"))
  const agora = 1234567890000, passo = Math.floor(agora / 30000)
  const codigo = codigoTotp(segredo, passo)
  assert.equal(conferirTotp(segredo, codigo, null, agora), passo)
  assert.equal(conferirTotp(segredo, codigo, passo, agora), null)
  assert.equal(conferirTotp(segredo, codigoTotp(segredo, passo - 2), null, agora), null)
  assert.equal(conferirTotp(segredo, "1234567", null, agora), null)
  assert.equal(conferirTotp(segredo, codigoTotp(segredo, passo + 1), null, agora), passo + 1)
})

test("segredo cifrado só abre com a chave e o contexto corretos, e detecta adulteração", () => {
  const chave = randomBytes(32), contexto = "mfa:usuario-a"
  const primeiro = cifrarSegredo("SEGREDO", contexto, chave)
  assert.notEqual(primeiro, cifrarSegredo("SEGREDO", contexto, chave))
  assert.equal(abrirSegredo(primeiro, contexto, chave), "SEGREDO")
  assert.throws(() => abrirSegredo(primeiro, "mfa:usuario-b", chave))
  assert.throws(() => abrirSegredo(primeiro, contexto, randomBytes(32)))
  const partes = primeiro.split("."); partes[3] = Buffer.from("adulterado").toString("base64url")
  assert.throws(() => abrirSegredo(partes.join("."), contexto, chave))
  assert.throws(() => abrirSegredo("v0.x.y.z", contexto, chave))
})

test("recuperação tem códigos distintos de alta entropia, armazenados como hash", () => {
  const codigos = criarCodigosRecuperacao()
  assert.equal(new Set(codigos).size, 8)
  for (const codigo of codigos) {
    assert.match(codigo, /^[a-f0-9]{24}$/)
    assert.match(hashRecuperacao(codigo), /^[a-f0-9]{64}$/)
    assert.equal(hashRecuperacao(codigo.toUpperCase()), hashRecuperacao(codigo))
  }
})

test("escrita com sessão recusa origem alheia, ausente, null e metadado cross-site", () => {
  const pedido = (headers: Record<string, string>, method = "POST") => new Request("https://tino.example/api/contas", { method, headers })
  assert.equal(origemPermitida(pedido({ cookie: "sessao=x", origin: "https://tino.example" })), true)
  for (const origin of ["https://ataque.example", "null", "https://tino.example.ataque.example"]) {
    assert.equal(origemPermitida(pedido({ cookie: "sessao=x", origin })), false)
  }
  assert.equal(origemPermitida(pedido({ cookie: "sessao=x" })), false)
  assert.equal(origemPermitida(pedido({ origin: "https://tino.example", "sec-fetch-site": "cross-site" })), false)
  assert.equal(origemPermitida(pedido({ authorization: "Bearer chave" })), true)
  assert.equal(origemPermitida(pedido({}, "GET")), true)
  assert.equal(origemPermitida(new Request("http://localhost:3014/api/contas", { method: "POST", headers: { host: "127.0.0.1:3014", origin: "http://127.0.0.1:3014", cookie: "sessao=x" } })), true)
  assert.equal(origemPermitida(pedido({ origin: "https://outro.example", "x-forwarded-host": "outro.example", cookie: "sessao=x" })), false)
})

test("CSP de produção não permite script inline sem nonce nem eval", () => {
  const politica = politicaDeConteudo("nonce-exemplo")
  const scripts = politica.split(";").find((item) => item.includes("script-src"))!
  assert.ok(scripts.includes("'nonce-nonce-exemplo'"))
  assert.ok(!scripts.includes("unsafe-inline") && !scripts.includes("unsafe-eval"))
  assert.ok(politica.includes("frame-ancestors 'none'"))
  assert.ok(politicaDeConteudo("n", true).includes("'unsafe-eval'"))
})
