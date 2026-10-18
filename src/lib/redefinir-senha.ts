/**
 * Recuperar senha por e-mail (item 1.9 do plano, 06/10/2026).
 *
 * Antes, "Esqueci a senha" abria um e-mail para o Davi: cada cliente que
 * esquecesse a senha virava um chamado. As regras, e o porquê de cada uma:
 *
 * - **O link vale 30 minutos e uma vez só.** Link de senha esquecido na caixa
 *   de entrada não pode abrir a conta uma semana depois.
 * - **No banco fica só o hash do token.** Quem lê o banco não usa o link.
 * - **A resposta é a mesma, exista o e-mail ou não.** Senão a tela diria a
 *   quem varre e-mails quem tem conta no Tino.
 * - **Admin não recupera por aqui.** A conta de admin troca a senha pelo
 *   build (`ADMIN_REDEFINIR_SENHA`); um link por e-mail seria uma porta a
 *   mais para o painel que vê a conta de todo mundo.
 * - **Trocar a senha derruba as outras sessões.** Quem pediu o link pode estar
 *   tirando alguém da conta.
 */

import { createHash, randomBytes } from "node:crypto"

export const VALIDADE_MINUTOS = 30

export function gerarTokenDeRedefinicao(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url")
  return { token, hash: hashDoToken(token) }
}

export function hashDoToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

/** Vale se ainda há pedido aberto e ele não passou dos 30 minutos. */
export function redefinicaoValida(conta: { redefinicaoSenhaHash: string | null; redefinicaoSenhaExpiraEm: Date | null }, agora: Date): boolean {
  return Boolean(conta.redefinicaoSenhaHash && conta.redefinicaoSenhaExpiraEm && conta.redefinicaoSenhaExpiraEm.getTime() > agora.getTime())
}

/** Quem pode pedir o link: conta que existe e não é de admin. */
export function podePedirRedefinicao(conta: { admin: boolean } | null): boolean {
  return Boolean(conta) && !conta!.admin
}

/**
 * Endereço do link. Em produção vem da Vercel, nunca do cabeçalho da
 * requisição: o cabeçalho `Host` é do cliente, e um link de senha que aponta
 * para outro site entrega a conta (envenenamento do link de redefinição).
 */
export function origemDoLink(ambiente: Record<string, string | undefined>, origemDaRequisicao: string): string {
  if (ambiente.VERCEL_ENV === "production" && ambiente.VERCEL_PROJECT_PRODUCTION_URL) return `https://${ambiente.VERCEL_PROJECT_PRODUCTION_URL}`
  if (ambiente.VERCEL_ENV && ambiente.VERCEL_URL) return `https://${ambiente.VERCEL_URL}`
  return origemDaRequisicao
}

export function emailConfigurado(ambiente: Record<string, string | undefined>): boolean {
  return Boolean(ambiente.RESEND_API_KEY && ambiente.EMAIL_REMETENTE)
}
