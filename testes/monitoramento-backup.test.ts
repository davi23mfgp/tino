import { readFileSync } from "node:fs"
import assert from "node:assert/strict"
import { test } from "node:test"

// Exercita o próprio script do workflow para não manter uma cópia da regra.
const fluxo = readFileSync(".github/workflows/monitoramento.yml", "utf8").replace(/\r\n/g, "\n")
const trecho = fluxo.split("Conferir idade do último backup restaurado")[1]!.split("      - name:")[0]!
const codigo = trecho.split("          script: |\n")[1]!.split("\n").map(linha => linha.slice(12)).join("\n")
const FuncaoAssincrona = Object.getPrototypeOf(async function () {}).constructor

async function conferir(idadeHoras: number | null, alertaAberto = false) {
  const efeitos: string[] = []
  const ultimo = idadeHoras === null ? undefined : {
    run_started_at: new Date(Date.now() - idadeHoras * 3600000).toISOString(),
    html_url: "https://github.com/exemplo/tino/actions/runs/1",
  }
  const github = {
    rest: {
      actions: { listWorkflowRuns: async (pedido: { status: string; branch: string }) => {
        assert.equal(pedido.status, "success")
        assert.equal(pedido.branch, "main")
        return { data: { workflow_runs: ultimo ? [ultimo] : [] } }
      } },
      issues: {
        listForRepo: () => {},
        create: async () => efeitos.push("abrir"),
        createComment: async () => efeitos.push("comentar"),
        update: async () => efeitos.push("fechar"),
      },
    },
    paginate: async () => alertaAberto ? [{ title: "[Monitor Tino] Backup ausente ou atrasado", number: 1 }] : [],
  }
  await new FuncaoAssincrona("github", "context", "core", codigo)(github,
    { repo: { owner: "exemplo", repo: "tino" }, payload: { repository: { default_branch: "main" } } },
    { setFailed: () => efeitos.push("falhar") })
  return efeitos
}

test("monitor alerta se nunca houve backup validado", async () => {
  assert.deepEqual(await conferir(null), ["abrir", "falhar"])
})
test("monitor alerta após 26 horas e não duplica incidente aberto", async () => {
  assert.deepEqual(await conferir(27), ["abrir", "falhar"])
  assert.deepEqual(await conferir(27, true), ["falhar"])
})
test("monitor aceita backup recente e resolve incidente anterior", async () => {
  assert.deepEqual(await conferir(1), [])
  assert.deepEqual(await conferir(1, true), ["comentar", "fechar"])
})
test("monitor recusa horário de backup no futuro", async () => {
  assert.deepEqual(await conferir(-1), ["abrir", "falhar"])
})
