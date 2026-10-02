import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

// Executa a condição real do build, substituindo apenas o acesso ao banco.
const codigo = readFileSync("scripts/semear-se-pedido.mjs", "utf8")
  .replace('await import("./demo.mjs")', "await executarDemo()")
  .replace('await import("./demo-mei.mjs")', "await executarDemoMei()")
const FuncaoAssincrona = Object.getPrototypeOf(async function () {}).constructor

async function executar(env: Record<string, string>) {
  let pessoal = 0
  let mei = 0
  await new FuncaoAssincrona("process", "console", "executarDemo", "executarDemoMei", codigo)(
    { env }, { log: () => {} }, async () => { pessoal++ }, async () => { mei++ },
  )
  return { pessoal, mei }
}

test("build prepara demo automaticamente somente na prévia de segurança", async () => {
  assert.deepEqual(await executar({ VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: "codex/continuacao-tino" }), { pessoal: 1, mei: 0 })
})
test("produção cria somente a demo MEI; outras branches e ambiente local não criam demos", async () => {
  assert.deepEqual(await executar({ VERCEL_ENV: "production", VERCEL_GIT_COMMIT_REF: "main" }), { pessoal: 0, mei: 1 })
  for (const env of [
    { VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: "main" },
    { VERCEL_ENV: "local", VERCEL_GIT_COMMIT_REF: "codex/continuacao-tino" },
  ]) assert.deepEqual(await executar(env), { pessoal: 0, mei: 0 })
  assert.deepEqual(await executar({}), { pessoal: 0, mei: 0 })
})
test("recriação explicitamente solicitada mantém comando existente", async () => {
  assert.deepEqual(await executar({ SEMEAR_DEMO: "1" }), { pessoal: 1, mei: 0 })
})
