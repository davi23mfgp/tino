import { competenciaDe, competenciaMaisMeses } from "./datas"

/** Competência da fatura é o mês de vencimento; competência contábil continua sendo a data. */
export function competenciaDoCartao(data: Date, conta: { tipo: string; diaFechamento: number | null; diaVencimento: number | null }): string | null {
  if (conta.tipo !== "CARTAO_CREDITO") return null
  const mes = competenciaDe(data)
  if (!conta.diaFechamento || !conta.diaVencimento) return mes
  const ultimoDia = new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth() + 1, 0)).getUTCDate()
  // No próprio dia do fechamento, considerar a fatura que está fechando.
  const depoisDoFechamento = data.getUTCDate() > Math.min(conta.diaFechamento, ultimoDia)
  const venceNoMesSeguinte = conta.diaVencimento <= conta.diaFechamento
  return competenciaMaisMeses(mes, Number(depoisDoFechamento) + Number(venceNoMesSeguinte))
}
