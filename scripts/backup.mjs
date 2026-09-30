import { mkdir } from "node:fs/promises"
import { resolve } from "node:path"
import { ambientePostgres, criarCopia, lerChaveBackup, verificarCopia } from "./copia-segura.mjs"

try {
  if (!process.env.BACKUP_DATABASE_URL) throw new Error("Configure BACKUP_DATABASE_URL com uma conexão direta de leitura.")
  const diretorio = resolve(process.env.BACKUP_DIRETORIO ?? ".backups")
  await mkdir(diretorio, { recursive: true, mode: 0o700 })
  const destino = resolve(diretorio, `tino-${new Date().toISOString().replace(/[:.]/g, "-")}.dump.enc`)
  const chave = lerChaveBackup(process.env.BACKUP_CHAVE_CRIPTOGRAFIA)
  await criarCopia({ destino, chave, ambiente: ambientePostgres(process.env.BACKUP_DATABASE_URL) })
  await verificarCopia(destino, chave)
  console.log(`Backup cifrado e autenticado: ${destino}`)
} catch (falha) {
  console.error(falha instanceof Error ? falha.message : "Não foi possível concluir o backup.")
  process.exitCode = 1
}
