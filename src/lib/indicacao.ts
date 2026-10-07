/**
 * Indicação (item 2.6, estudo em
 * `docs/pesquisas/2026-10-07-pix-rodape-motivos-indicacao.md`): cada conta
 * tem um código curto, o link de cadastro leva `?ref=CÓDIGO`, e a origem do
 * cadastro (item 1.6) já grava o `ref`. O prêmio (um mês grátis para os dois,
 * como o Dropbox fez com espaço) depende da cobrança ligada; até lá, a tela
 * conta quem chegou e quem já paga, e não promete o mês.
 */

import { randomBytes } from "node:crypto"

// Sem 0, O, 1, I e L: código lido em voz alta ou copiado à mão não confunde.
const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
export const TAMANHO_DO_CODIGO = 6

export function gerarCodigoDeIndicacao(bytes: Uint8Array = randomBytes(TAMANHO_DO_CODIGO)): string {
  return Array.from(bytes.slice(0, TAMANHO_DO_CODIGO), (byte) => ALFABETO[byte % ALFABETO.length]).join("")
}

export function codigoValido(texto: string): boolean {
  return new RegExp(`^[${ALFABETO}]{${TAMANHO_DO_CODIGO}}$`).test(texto)
}

/** O link vai para o cadastro do mesmo produto de quem indica: o MEI indica MEI. */
export function linkDeIndicacao(origem: string, codigo: string, produto: "pessoal" | "mei") {
  return `${origem}${produto === "mei" ? "/para-mei" : "/"}?ref=${codigo}`
}
