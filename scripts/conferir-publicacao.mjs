// Somente leitura: esta conferência não conecta ao banco nem executa migrations.
const problemas = []
const exigir = (nome) => {
  if (!process.env[nome]) problemas.push(`${nome}: ausente`)
}
for (const nome of ["DATABASE_URL", "DIRECT_URL", "JWT_SECRET", "MFA_CHAVE_CRIPTOGRAFIA", "MONITORAMENTO_SEGREDO", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REDIRECT_URI"]) exigir(nome)
for (const nome of ["DATABASE_URL", "DIRECT_URL"]) {
  if (!process.env[nome]) continue
  try {
    const url = new URL(process.env[nome])
    if (!["postgres:", "postgresql:"].includes(url.protocol) || !["require", "verify-ca", "verify-full"].includes(url.searchParams.get("sslmode"))) problemas.push(`${nome}: exige conexão Postgres com TLS`)
  } catch { problemas.push(`${nome}: endereço inválido`) }
}
if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) problemas.push("JWT_SECRET: precisa de pelo menos 32 caracteres aleatórios")
if (process.env.MFA_CHAVE_CRIPTOGRAFIA && !/^[a-fA-F0-9]{64}$/.test(process.env.MFA_CHAVE_CRIPTOGRAFIA)) problemas.push("MFA_CHAVE_CRIPTOGRAFIA: precisa de 32 bytes em hexadecimal")
if (process.env.MONITORAMENTO_SEGREDO && process.env.MONITORAMENTO_SEGREDO.length < 32) problemas.push("MONITORAMENTO_SEGREDO: precisa de pelo menos 32 caracteres aleatórios")
const chaves = ["JWT_SECRET", "MFA_CHAVE_CRIPTOGRAFIA", "MONITORAMENTO_SEGREDO"].map(nome => process.env[nome]).filter(Boolean)
if (new Set(chaves).size !== chaves.length) problemas.push("Segredos: use chaves distintas por finalidade")
if (process.env.GOOGLE_REDIRECT_URI) {
  try {
    const url = new URL(process.env.GOOGLE_REDIRECT_URI)
    if (url.protocol !== "https:" || url.pathname !== "/api/auth/google/retorno" || url.search || url.hash) problemas.push("GOOGLE_REDIRECT_URI: exige HTTPS e caminho /api/auth/google/retorno sem parâmetros")
  } catch { problemas.push("GOOGLE_REDIRECT_URI: endereço inválido") }
}
if (process.env.TINO_LOG_QUERIES === "1") problemas.push("TINO_LOG_QUERIES: desligue antes de publicar")
if (problemas.length) {
  console.error("Conferência não aprovada (nenhum valor secreto foi exibido):\n" + problemas.map(item => `- ${item}`).join("\n"))
  process.exitCode = 1
} else console.log("Variáveis locais conferidas. Ainda é necessário comprovar banco Preview separado, permissões, Secrets do GitHub, backups, monitor e fluxos reais conforme CONTINUAR-SEGURANCA.md.")
