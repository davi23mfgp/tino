import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { test } from "node:test"

import { tituloDaRota, todosOsGrupos } from "../src/lib/navegacao-grupos"
import { textoDeMeses } from "../src/lib/dinheiro"
import { chavesSuperadas } from "../src/lib/tino/alertas"

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

test("meses no texto: vírgula decimal e plural da língua, nunca \"mês(es)\"", () => {
  assert.equal(textoDeMeses(1.2), "1,2 mês")
  assert.equal(textoDeMeses(1), "1 mês")
  assert.equal(textoDeMeses(2), "2 meses")
  assert.equal(textoDeMeses(6.04), "6 meses")
  assert.equal(textoDeMeses(0.5), "0,5 mês")
  assert.equal(textoDeMeses(1.96), "2 meses")
  assert.equal(textoDeMeses(3, 0), "3 meses")
  const fontes = ["diagnostico", "simulador", "chat", "alertas"].map((nome) => fs.readFileSync(path.join(__dirname, `../src/lib/tino/${nome}.ts`), "utf8"))
  assert.ok(fontes.every((fonte) => !fonte.includes("mês(es)")))
})

test("aviso de estado de mês passado sai da lista; aviso de evento fica", () => {
  const chaves = ["reserva_baixa:2026-09", "reserva_baixa:2026-10", "divida_alta:2026-08", "orcamento_estourado:2026-09:cat1", "fatura_acima_limite:2026-09:c1", "sem_categoria:2026-10"]
  assert.deepEqual(chavesSuperadas(chaves, "2026-10"), ["reserva_baixa:2026-09", "divida_alta:2026-08"])
})
