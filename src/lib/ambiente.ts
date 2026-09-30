/**
 * Conferência das variáveis de ambiente na subida do servidor.
 *
 * Dois tipos de falha:
 * - **Fatal**: sem ela o app roda inseguro (sessão forjável, banco errado).
 *   Em produção o servidor não sobe — melhor fora do ar do que aberto.
 * - **Par incompleto**: uma integração ligada sem o segredo que a protege
 *   (ex.: token do WhatsApp sem a chave que confere a assinatura). O app sobe,
 *   a integração recusa tudo, e o log diz exatamente o que falta.
 *
 * Nunca imprime o valor de nenhuma variável — só o nome.
 */

type Problema = { variavel: string; motivo: string; fatal: boolean }

const PARES: Array<{ liga: string; exige: string[]; motivo: string }> = [
  {
    liga: "WHATSAPP_TOKEN",
    exige: ["WHATSAPP_APP_SECRET", "WHATSAPP_VERIFY_TOKEN"],
    motivo: "sem a chave do app o webhook não confere a assinatura da Meta",
  },
  { liga: "TELEGRAM_BOT_TOKEN", exige: ["TELEGRAM_WEBHOOK_SEGREDO"], motivo: "webhook do Telegram ficaria aberto" },
  { liga: "STRIPE_SECRET_KEY", exige: ["STRIPE_WEBHOOK_SECRET"], motivo: "webhook da Stripe sem assinatura" },
  {
    liga: "MERCADO_PAGO_ACCESS_TOKEN",
    exige: ["MERCADO_PAGO_WEBHOOK_SECRET"],
    motivo: "webhook do Mercado Pago sem assinatura",
  },
  { liga: "VAPID_PUBLIC_KEY", exige: ["VAPID_PRIVATE_KEY", "CRON_SECRET"], motivo: "lembrete sem proteção do cron" },
  { liga: "RESEND_API_KEY", exige: ["RESEND_WEBHOOK_SECRET"], motivo: "recebimento de fatura sem assinatura" },
]

function conexaoComTls(endereco: string): boolean {
  try { return ["require", "verify-full", "verify-ca"].includes(new URL(endereco).searchParams.get("sslmode") ?? "") }
  catch { return false }
}

export function conferirAmbiente(env: NodeJS.ProcessEnv = process.env): Problema[] {
  const problemas: Problema[] = []
  const producao = env.NODE_ENV === "production"

  if (!env.DATABASE_URL) problemas.push({ variavel: "DATABASE_URL", motivo: "ausente", fatal: true })
  if (!env.JWT_SECRET || env.JWT_SECRET.length < 32) {
    problemas.push({ variavel: "JWT_SECRET", motivo: "ausente ou com menos de 32 caracteres", fatal: true })
  }
  // Banco gerenciado sem TLS trafega extrato de gente em claro pela internet.
  if (producao && env.DATABASE_URL && !conexaoComTls(env.DATABASE_URL)) {
    problemas.push({ variavel: "DATABASE_URL", motivo: "sem sslmode=require em produção", fatal: true })
  }
  if (producao && env.DIRECT_URL && !conexaoComTls(env.DIRECT_URL)) {
    problemas.push({ variavel: "DIRECT_URL", motivo: "sem TLS na conexão de migração", fatal: true })
  }
  if (!env.MFA_CHAVE_CRIPTOGRAFIA || !/^[a-fA-F0-9]{64}$/.test(env.MFA_CHAVE_CRIPTOGRAFIA)) {
    problemas.push({ variavel: "MFA_CHAVE_CRIPTOGRAFIA", motivo: "configure 32 bytes em hexadecimal para habilitar a proteção em dois fatores", fatal: producao })
  }
  if (env.TINO_LOG_QUERIES === "1" && producao) {
    problemas.push({ variavel: "TINO_LOG_QUERIES", motivo: "instrumentação de consultas deve permanecer desligada em produção", fatal: true })
  }

  for (const par of PARES) {
    if (!env[par.liga]) continue
    for (const exigida of par.exige) {
      if (!env[exigida]) problemas.push({ variavel: exigida, motivo: `${par.liga} ligado, mas ${par.motivo}`, fatal: false })
    }
  }

  return problemas
}
