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
  // A mensagem diz se falta ou se o formato está errado: "configure" para uma
  // chave que já estava cadastrada (com aspas, espaço ou em base64) mandava o
  // Davi cadastrar de novo o que ele já tinha feito (06/10/2026).
  const mfa = process.env.MFA_CHAVE_CRIPTOGRAFIA
  if (!mfa) problemas.push("MFA_CHAVE_CRIPTOGRAFIA (falta neste ambiente)")
  else if (!/^[a-fA-F0-9]{64}$/.test(mfa)) {
    const extra = mfa.trim() !== mfa ? ", com espaço ou quebra de linha" : /^["']|["']$/.test(mfa) ? ", com aspas" : ""
    problemas.push(`MFA_CHAVE_CRIPTOGRAFIA (formato errado: tem ${mfa.length} caracteres${extra}; precisa de 64, só 0-9 e a-f)`)
  }
  if (!process.env.JWT_SECRET) problemas.push("JWT_SECRET (falta neste ambiente)")
  else if (process.env.JWT_SECRET.length < 32) problemas.push(`JWT_SECRET (curto: ${process.env.JWT_SECRET.length} caracteres, mínimo 32)`)
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
