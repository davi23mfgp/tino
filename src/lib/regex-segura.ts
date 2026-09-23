/**
 * Recusa expressão regular com risco de backtracking catastrófico (ReDoS).
 *
 * O teste real seria rodar com tempo limite, mas o `RegExp` do Node não tem
 * timeout e roda na thread principal: um `(a+)+$` numa descrição comprida
 * congela o servidor inteiro. Então a regra é conservadora — curto, compila, e
 * sem quantificador aplicado a grupo que já tem quantificador, nem
 * retrorreferência.
 */
export function regexSegura(padrao: string): boolean {
  if (padrao.length > 100) return false
  try {
    new RegExp(padrao, "i")
  } catch {
    return false
  }
  if (/\\[1-9]/.test(padrao)) return false
  if (/\([^)]*[+*}][^)]*\)\s*[+*{]/.test(padrao)) return false
  if (/\([^)]*\|[^)]*\)\s*[+*{]/.test(padrao)) return false
  return true
}
