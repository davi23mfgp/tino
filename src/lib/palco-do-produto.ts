/** A conta do palco do produto na vitrine.
 *
 * Fica aqui, fora do componente, porque e a unica parte com regra de
 * verdade: o resto e transformacao de CSS. Assim da para testar sem
 * navegador — e foi justamente o navegador que nao deu para usar no dia em
 * que isto foi escrito.
 */

/** Entrada do aparelho: consome a primeira fatia do trilho. */
export const FATIA_DE_ENTRADA = 0.16

/** Quanto do trilho ja passou pela janela, de 0 a 1.
 *
 * `topo` e o `getBoundingClientRect().top` do trilho: positivo enquanto ele
 * ainda esta abaixo da dobra, negativo depois que comeca a subir.
 */
export function progressoDoPalco(topo: number, altura: number, janela: number): number {
  const curso = altura - janela
  if (curso <= 0) return 0
  return Math.min(1, Math.max(0, -topo / curso))
}

/** O quanto o aparelho ja entrou, de 0 a 1. */
export function entradaDoPalco(progresso: number): number {
  return Math.min(1, Math.max(0, progresso / FATIA_DE_ENTRADA))
}

/** Qual tela mostrar, pelo indice, depois que a entrada terminou.
 *
 * As telas dividem em partes iguais o que sobra do trilho. O `min` no fim
 * existe porque no ultimo pixel o progresso chega a 1 exato e a conta
 * cairia em um indice a mais do que existe.
 */
export function telaDoProgresso(progresso: number, quantas: number): number {
  if (quantas <= 0) return 0
  const fatia = Math.max(0, (progresso - FATIA_DE_ENTRADA) / (1 - FATIA_DE_ENTRADA))
  return Math.min(quantas - 1, Math.floor(fatia * quantas))
}

/** Onde parar a rolagem para ficar no meio do trecho de uma tela. */
export function centroDaTela(indice: number, quantas: number): number {
  if (quantas <= 0) return 0
  return FATIA_DE_ENTRADA + ((indice + 0.5) / quantas) * (1 - FATIA_DE_ENTRADA)
}

/** Altura de projeto do aparelho no palco, em pixels de CSS. */
export const ALTURA_DO_APARELHO = 650

/** Quanto encolher o palco inteiro para o aparelho caber na janela.
 *
 * Encolhe o palco todo, e nao so o aparelho: cortar o celular esconderia
 * metade da tela do app, e mexer so na altura dele deixaria o conteudo
 * clipado do mesmo jeito, porque o texto de dentro tem tamanho fixo.
 * `reserva` e o espaco da legenda, dos botoes e do rodape.
 */
export function ajusteDoPalco(janela: number, reserva = 170): number {
  const cabe = (janela - reserva) / ALTURA_DO_APARELHO
  return Math.min(1, Math.max(0.55, cabe))
}
