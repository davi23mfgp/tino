import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

// Executa a condição real do build, substituindo apenas o acesso ao banco.
const codigo = readFileSync("scripts/semear-se-pedido.mjs", "utf8")
  .replace('await import("./demo.mjs")', "await executarDemo()")
const FuncaoAssincrona = Object.getPrototypeOf(async function () {}).constructor

async function executar(env: Record<string, string>) {
  let chamadas = 0
  await new FuncaoAssincrona("process", "console", "executarDemo", codigo)(
    { env }, { log: () => {} }, async () => { chamadas++ },
  )
  return chamadas
}

test("build prepara demo automaticamente somente na prévia de segurança", async () => {
  assert.equal(await executar({ VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: "codex/continuacao-tino" }), 1)
})
test("produção, outras branches e ambiente local não criam demo automaticamente", async () => {
  for (const env of [
    { VERCEL_ENV: "production", VERCEL_GIT_COMMIT_REF: "codex/continuacao-tino" },
    { VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: "main" },
    { VERCEL_ENV: "local", VERCEL_GIT_COMMIT_REF: "codex/continuacao-tino" },
  ]) assert.equal(await executar(env), 0)
  assert.equal(await executar({}), 0)
})
test("recriação explicitamente solicitada mantém comando existente", async () => {
  assert.equal(await executar({ SEMEAR_DEMO: "1" }), 1)
})
