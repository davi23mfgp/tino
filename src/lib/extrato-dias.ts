/**
 * Agrupamento do extrato por dia.
 *
 * Fica fora da página porque é a única parte do agrupamento que dá para provar
 * sem abrir o navegador — e é onde mora a regra de negócio (transferência não
 * entra no total do dia).
 */

export interface LancamentoDoDia {
  data: string
  valorCentavos: number
  tipo: "RECEITA" | "DESPESA" | "TRANSFERENCIA"
}

/**
 * Agrupa os lançamentos por dia, preservando a ordem em que vieram da API.
 *
 * A data repetida em toda linha era ruído: num extrato de trinta lançamentos
 * ela aparecia trinta vezes para dizer o que um cabeçalho por dia diz uma vez.
 */
export function porDia<T extends LancamentoDoDia>(itens: T[]): { dia: string; itens: T[]; totalCentavos: number }[] {
  const dias: { dia: string; itens: T[]; totalCentavos: number }[] = []
  for (const item of itens) {
    const dia = item.data.slice(0, 10)
    const atual = dias.at(-1)?.dia === dia ? dias.at(-1)! : (dias.push({ dia, itens: [], totalCentavos: 0 }), dias.at(-1)!)
    atual.itens.push(item)
    // Transferência não é ganho nem perda do dia: sai do total para não inflar.
    if (item.tipo === "RECEITA") atual.totalCentavos += item.valorCentavos
    else if (item.tipo === "DESPESA") atual.totalCentavos -= item.valorCentavos
  }
  return dias
}

/** "hoje", "ontem" ou "sex, 12 de set" — quem lê o extrato pensa nesses termos. */
export function rotuloDia(dia: string): string {
  const hoje = new Date().toISOString().slice(0, 10)
  const ontem = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  if (dia === hoje) return "Hoje"
  if (dia === ontem) return "Ontem"
  return new Date(`${dia}T00:00:00Z`).toLocaleDateString("pt-BR", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" })
}
