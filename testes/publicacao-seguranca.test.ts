import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { test } from "node:test"

const ambienteValido = {
  DATABASE_URL: "postgresql://execucao:senha-privada@banco.example/tino?sslmode=require",
  DIRECT_URL: "postgresql://migracao:outra-senha@banco.example/tino?sslmode=verify-full",
  JWT_SECRET: "jwt-ficticio-para-conferencia-000000000",
  MFA_CHAVE_CRIPTOGRAFIA: "ab".repeat(32),
  MONITORAMENTO_SEGREDO: "monitor-ficticio-para-conferencia-000000000",
  GOOGLE_CLIENT_ID: "cliente-ficticio",
  GOOGLE_CLIENT_SECRET: "google-segredo-privado",
  GOOGLE_REDIRECT_URI: "https://tino.example/api/auth/google/retorno",
  TINO_LOG_QUERIES: "0",
}

function conferir(alteracoes: Record<string, string> = {}) {
  // Executa o comando público sem credenciais reais: deve terminar mesmo
  // com um host inexistente, pois a conferência não pode acessar o banco.
  const resultado = spawnSync(process.execPath, ["scripts/conferir-publicacao.mjs"], {
    env: { ...process.env, ...ambienteValido, ...alteracoes }, encoding: "utf8", timeout: 5000,
  })
  assert.ifError(resultado.error)
  return { codigo: resultado.status, saida: resultado.stdout + resultado.stderr }
}

test("conferência de publicação aceita configuração sem conectar ao banco", () => {
  assert.equal(conferir().codigo, 0)
})

test("conferência recusa TLS desligado, chaves reutilizadas e callback inseguro", () => {
  const casos: Record<string, string>[] = [
    { DATABASE_URL: ambienteValido.DATABASE_URL.replace("sslmode=require", "sslmode=disable") },
    { MONITORAMENTO_SEGREDO: ambienteValido.JWT_SECRET },
    { GOOGLE_REDIRECT_URI: ambienteValido.GOOGLE_REDIRECT_URI.replace("https:", "http:") },
    { MFA_CHAVE_CRIPTOGRAFIA: "curta" },
    { TINO_LOG_QUERIES: "1" },
    { GOOGLE_CLIENT_SECRET: "" },
  ]
  for (const alteracoes of casos) assert.equal(conferir(alteracoes).codigo, 1)
})

test("erro de publicação não revela credenciais nem endereços recebidos", () => {
  const enderecoInvalido = "postgresql://usuario:senha-super-privada@banco.example/tino?sslmode=disable"
  const resultado = conferir({ DATABASE_URL: enderecoInvalido, MFA_CHAVE_CRIPTOGRAFIA: "mfa-invalida-privada" })
  assert.equal(resultado.codigo, 1)
  for (const segredo of [enderecoInvalido, "senha-super-privada", "mfa-invalida-privada", ambienteValido.JWT_SECRET, ambienteValido.GOOGLE_CLIENT_SECRET]) {
    assert.ok(!resultado.saida.includes(segredo))
  }
})
