/**
 * `prisma migrate deploy` com novas tentativas.
 *
 * O banco de produção hiberna quando fica sem uso. O primeiro pedido acorda a
 * instância, e esse primeiro pedido é justamente o da migração no build — que
 * estoura o tempo e derruba o deploy inteiro com `P1002`, antes mesmo de o
 * `next build` começar. Foi o que aconteceu em 14/09: dois deploys seguidos
 * perdidos por isso, com o código já correto.
 *
 * Três tentativas, com espera crescente. Se todas falharem, o build falha
 * mesmo: subir a aplicação com o banco atrás do schema é pior do que não
 * subir.
 */
import { spawnSync } from "node:child_process"

// Variável faltando não é banco dormindo: tentar de novo não resolve, e a
// mensagem "o banco não respondeu" mandava procurar o problema no lugar
// errado. Acontece quando um projeto da Vercel não tem as variáveis (projeto
// novo, ou variável marcada só para Production num deploy de Preview).
const faltando = ["DATABASE_URL", "DIRECT_URL"].filter((nome) => !process.env[nome])
if (faltando.length) {
  console.error(
    `Falta ${faltando.join(" e ")} neste ambiente (${process.env.VERCEL_ENV ?? "local"}). ` +
      "Na Vercel: Settings → Environment Variables, marque Production e Preview.",
  )
  process.exit(1)
}

// Preview sem os novos segredos não deve sequer migrar um banco compartilhado
// por configuração antiga. Validar antes de tocar a conexão, não só no Next.
if (process.env.VERCEL_ENV) {
  const problemas = []
  if (!/^[a-fA-F0-9]{64}$/.test(process.env.MFA_CHAVE_CRIPTOGRAFIA ?? "")) problemas.push("MFA_CHAVE_CRIPTOGRAFIA")
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) problemas.push("JWT_SECRET")
  for (const nome of ["DATABASE_URL", "DIRECT_URL"]) {
    let tls = false
    try { tls = ["require", "verify-full", "verify-ca"].includes(new URL(process.env[nome]).searchParams.get("sslmode")) } catch {}
    if (!tls) problemas.push(`${nome} com TLS`)
  }
  if (problemas.length) {
    console.error(`Configure antes de migrar: ${problemas.join(", ")}. Nenhuma migration foi executada.`)
    process.exit(1)
  }
}

const TENTATIVAS = 3
const ESPERA_MS = [0, 5_000, 15_000]

for (let tentativa = 0; tentativa < TENTATIVAS; tentativa += 1) {
  if (ESPERA_MS[tentativa]) {
    console.log(`Banco não respondeu. Nova tentativa em ${ESPERA_MS[tentativa] / 1000}s…`)
    await new Promise((resolve) => setTimeout(resolve, ESPERA_MS[tentativa]))
  }

  const resultado = spawnSync("npx", ["prisma", "migrate", "deploy"], { stdio: "inherit", shell: true })
  if (resultado.status === 0) process.exit(0)

  console.error(`Tentativa ${tentativa + 1} de ${TENTATIVAS} falhou.`)
}

console.error("O banco não respondeu em nenhuma das tentativas. O deploy para aqui de propósito.")
process.exit(1)
