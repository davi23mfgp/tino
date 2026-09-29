/**
 * O teclado do Balcão (opção A, 28/09/2026), separado da tela para ter teste:
 * é dinheiro, em centavos inteiros.
 */

/// Teto do visor: R$ 999.999,99. Venda de balcão maior que isso é erro de
/// dedo, e o Int de centavos do banco aguenta com folga.
export const TETO_DO_VISOR = 99_999_999

export type Tecla = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "00" | "apagar"

/** O teclado da maquininha: cada dígito entra pela direita, nos centavos. */
export function digitar(atual: number, tecla: Tecla): number {
  if (tecla === "apagar") return Math.floor(atual / 10)
  const proximo = tecla === "00" ? atual * 100 : atual * 10 + Number(tecla)
  return proximo > TETO_DO_VISOR ? atual : proximo
}
