import { createHmac, timingSafeEqual } from "node:crypto"

/**
 * Comparação de segredo em tempo constante.
 *
 * `a === b` para na primeira letra diferente, e o tempo de resposta vaza quantas
 * letras do segredo o atacante já acertou. Com tentativas suficientes dá para
 * reconstruir o segredo letra a letra. Vazio nunca bate: segredo não
 * configurado não pode virar "qualquer um entra".
 */
export function segredoConfere(recebido: string | null | undefined, esperado: string | null | undefined): boolean {
  if (!recebido || !esperado) return false
  const a = Buffer.from(recebido)
  const b = Buffer.from(esperado)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

/**
 * Confere a assinatura HMAC-SHA256 que a Meta manda em `X-Hub-Signature-256`.
 *
 * Sem isto, quem descobrisse a URL do webhook poderia forjar mensagem com o
 * telefone de qualquer cliente conectado: lançar gasto na conta dele e receber
 * de volta os números dele. A assinatura é calculada sobre o corpo cru, por
 * isso a rota precisa ler `text()` antes de interpretar o JSON.
 */
export function assinaturaMetaConfere(corpoCru: string, cabecalho: string | null, segredoApp: string | undefined) {
  if (!cabecalho || !segredoApp) return false
  const esperado = "sha256=" + createHmac("sha256", segredoApp).update(corpoCru, "utf8").digest("hex")
  return segredoConfere(cabecalho, esperado)
}
