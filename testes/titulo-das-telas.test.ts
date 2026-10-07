import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { test } from "node:test"

import { tituloDaRota, todosOsGrupos } from "../src/lib/navegacao-grupos"

// Telas que só redirecionam: o topo nunca aparece nelas.
const SO_REDIRECIONAM = new Set(["/conectar", "/parcelamentos"])

function rotasDoApp(pasta: string, prefixo = ""): string[] {
  const rotas: string[] = []
  for (const item of fs.readdirSync(pasta, { withFileTypes: true })) {
    if (!item.isDirectory() || item.name.startsWith("[") || item.name.startsWith("_")) continue
    const rota = `${prefixo}/${item.name}`
    if (fs.existsSync(path.join(pasta, item.name, "page.tsx"))) rotas.push(rota)
    rotas.push(...rotasDoApp(path.join(pasta, item.name), rota))
  }
  return rotas
}

test("toda tela do app tem nome no topo, não só \"Tino\"", () => {
  const rotas = rotasDoApp(path.join(__dirname, "../src/app/(app)")).filter((rota) => !SO_REDIRECIONAM.has(rota))
  assert.ok(rotas.length > 30)
  // O topo usa os grupos do modo da conta: o do negócio nas telas da loja e do MEI, o pessoal no resto.
  const doNegocio = (rota: string) => rota === "/mei" || rota.startsWith("/loja")
  const semNome = rotas.filter((rota) => tituloDaRota(todosOsGrupos(doNegocio(rota)), rota) === null)
  assert.deepEqual(semNome, [])
})
