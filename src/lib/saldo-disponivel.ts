/** Investimentos entram no patrimônio; o resgate por transferência os torna caixa. */
export function saldoDisponivel(contas: { tipo: string; saldoCentavos: number }[]): number {
  return contas.filter((conta) => conta.tipo !== "CARTAO_CREDITO" && conta.tipo !== "INVESTIMENTO").reduce((soma, conta) => soma + conta.saldoCentavos, 0)
}
