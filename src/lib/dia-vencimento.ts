/** O cadastro recebe um dia mensal, não uma data com mês e ano. */
export function lerDiaVencimento(valor: string): number | undefined {
  if (!valor) return undefined
  if (!/^(?:[1-9]|[12]\d|3[01])$/.test(valor)) {
    throw new Error("Escolha um dia de vencimento entre 1 e 31.")
  }
  return Number(valor)
}
