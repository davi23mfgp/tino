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
