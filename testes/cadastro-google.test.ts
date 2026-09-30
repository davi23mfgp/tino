import assert from "node:assert/strict"
import { test } from "node:test"

import { criarCadastroGoogle, lerCadastroGoogle } from "../src/lib/google-login"

test("cadastro Google aceita apenas identidade assinada", async () => {
  const anterior = process.env.JWT_SECRET
  process.env.JWT_SECRET = "teste-cadastro-google-segredo-com-mais-de-32-caracteres"
  try {
    const identidade = { googleId: "google-123", email: "nova@gmail.com", nome: "Nova Pessoa" }
    const token = await criarCadastroGoogle(identidade)
    assert.deepEqual(await lerCadastroGoogle(token), identidade)
    assert.equal(await lerCadastroGoogle(`${token.slice(0, -1)}${token.endsWith("a") ? "b" : "a"}`), null)
    assert.equal(await lerCadastroGoogle(undefined), null)
  } finally {
    if (anterior === undefined) delete process.env.JWT_SECRET
    else process.env.JWT_SECRET = anterior
  }
})
