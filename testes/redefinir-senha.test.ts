import assert from "node:assert/strict"
import { test } from "node:test"

import { emailConfigurado, gerarTokenDeRedefinicao, hashDoToken, origemDoLink, podePedirRedefinicao, redefinicaoValida } from "../src/lib/redefinir-senha"

test("o link vale até expirar e só com pedido aberto", () => {
  const agora = new Date("2026-10-06T12:00:00Z")
  assert.equal(redefinicaoValida({ redefinicaoSenhaHash: "h", redefinicaoSenhaExpiraEm: new Date("2026-10-06T12:29:00Z") }, agora), true)
  assert.equal(redefinicaoValida({ redefinicaoSenhaHash: "h", redefinicaoSenhaExpiraEm: new Date("2026-10-06T11:59:00Z") }, agora), false)
  // Link já usado: os campos foram apagados.
  assert.equal(redefinicaoValida({ redefinicaoSenhaHash: null, redefinicaoSenhaExpiraEm: null }, agora), false)
})

test("admin não recupera senha por e-mail", () => {
  assert.equal(podePedirRedefinicao({ admin: false }), true)
  assert.equal(podePedirRedefinicao({ admin: true }), false)
  assert.equal(podePedirRedefinicao(null), false)
})

test("no banco fica só o hash, e cada token é novo", () => {
  const a = gerarTokenDeRedefinicao()
  const b = gerarTokenDeRedefinicao()
  assert.notEqual(a.token, b.token)
  assert.equal(a.hash, hashDoToken(a.token))
  assert.notEqual(a.hash, a.token)
})

test("em produção o link usa o endereço da Vercel, não o cabeçalho da requisição", () => {
  const forjado = "https://site-do-golpe.com"
  assert.equal(origemDoLink({ VERCEL_ENV: "production", VERCEL_PROJECT_PRODUCTION_URL: "tino-kappa.vercel.app" }, forjado), "https://tino-kappa.vercel.app")
  assert.equal(origemDoLink({ VERCEL_ENV: "preview", VERCEL_URL: "tino-abc.vercel.app" }, forjado), "https://tino-abc.vercel.app")
  assert.equal(origemDoLink({}, "http://localhost:3100"), "http://localhost:3100")
})

test("sem Resend e remetente, o e-mail não está ligado", () => {
  assert.equal(emailConfigurado({}), false)
  assert.equal(emailConfigurado({ RESEND_API_KEY: "x" }), false)
  assert.equal(emailConfigurado({ RESEND_API_KEY: "x", EMAIL_REMETENTE: "Tino <oi@tino.app>" }), true)
})
