/** A conta das animacoes de entrada da vitrine.
 *
 * Mesma razao de `palco-do-produto.ts`: a regra fica fora do componente
 * para poder ser testada sem navegador. O componente so le o relogio e
 * escreve no DOM.
 */

/** Atraso de cada palavra do titulo, em milissegundos.
 *
 * Tem teto: num titulo longo, atraso proporcional faria a ultima palavra
 * chegar segundos depois da primeira, e a pessoa ja teria rolado embora.
 */
export function atrasoDaPalavra(indice: number, passo = 45, teto = 520): number {
  return Math.min(Math.max(0, indice) * passo, teto)
}

/** Desaceleracao no fim (easing cubico), de 0 a 1. */
export function suavizar(t: number): number {
  const x = Math.min(1, Math.max(0, t))
  return 1 - Math.pow(1 - x, 3)
}

/** O valor mostrado pelo contador em um instante da animacao.
 *
 * Fecha no alvo exato quando `t` chega a 1 — contador que para em
 * "R$ 8.599,98" por erro de arredondamento e pior do que nao animar.
 */
export function valorDaContagem(alvo: number, t: number): number {
  if (t >= 1) return alvo
  return Math.round(alvo * suavizar(t))
}

/** Quanto tempo o contador leva, em milissegundos.
 *
 * Numero grande merece um pouco mais de rolagem, mas nao o dobro: acima de
 * um segundo a pessoa ja entendeu e comeca a esperar.
 */
export function duracaoDaContagem(alvo: number): number {
  const digitos = Math.abs(alvo).toString().length
  return Math.min(1100, 450 + digitos * 90)
}
