/** Dígitos verificadores evitam confirmar um CNPJ digitado errado. */
export function cnpjValido(valor: string): boolean {
  const digitos = valor.replace(/\D/g, "")
  if (!/^\d{14}$/.test(digitos) || /^(\d)\1{13}$/.test(digitos)) return false
  const verificar = (tamanho: number) => {
    const pesos = tamanho === 12 ? [5,4,3,2,9,8,7,6,5,4,3,2] : [6,5,4,3,2,9,8,7,6,5,4,3,2]
    const resto = digitos.slice(0, tamanho).split("").reduce((soma, digito, indice) => soma + Number(digito) * pesos[indice], 0) % 11
    return Number(digitos[tamanho]) === (resto < 2 ? 0 : 11 - resto)
  }
  return verificar(12) && verificar(13)
}
