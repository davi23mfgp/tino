import { execFileSync } from "node:child_process"
import { resolve } from "node:path"
import { ambientePostgres, lerChaveBackup, restaurarCopia } from "./copia-segura.mjs"

try {
  if (process.env.CONFIRMAR_RESTAURACAO !== "BANCO_ISOLADO_VAZIO") throw new Error("Restauração exige CONFIRMAR_RESTAURACAO=BANCO_ISOLADO_VAZIO.")
  if (!process.env.RESTAURACAO_DATABASE_URL || !process.argv[2]) throw new Error("Informe arquivo e RESTAURACAO_DATABASE_URL do banco isolado.")
  const destino = new URL(process.env.RESTAURACAO_DATABASE_URL)
  for (const endereco of [process.env.DATABASE_URL, process.env.DIRECT_URL, process.env.BACKUP_DATABASE_URL].filter(Boolean)) {
    const atual = new URL(endereco)
    if (atual.hostname.replace("-pooler", "") === destino.hostname.replace("-pooler", "") && (atual.port || "5432") === (destino.port || "5432") && atual.pathname === destino.pathname) throw new Error("Restauração não pode apontar para o banco de origem/produção.")
  }
  const ambiente = ambientePostgres(process.env.RESTAURACAO_DATABASE_URL)
  const tabelas = execFileSync("psql", ["-X", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-c", "SELECT count(*) FROM pg_catalog.pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema')"], { env: ambiente, stdio: ["ignore", "pipe", "ignore"] }).toString().trim()
  if (tabelas !== "0") throw new Error("O banco de restauração precisa estar vazio. Nenhuma tabela foi apagada.")
  await restaurarCopia({ origem: resolve(process.argv[2]), chave: lerChaveBackup(process.env.BACKUP_CHAVE_CRIPTOGRAFIA), ambiente })
  console.log("Restauração concluída em banco isolado. Confira integridade e aplicação antes de qualquer troca de produção.")
} catch (falha) {
  console.error(falha instanceof Error ? falha.message : "Não foi possível restaurar o backup.")
  process.exitCode = 1
}
