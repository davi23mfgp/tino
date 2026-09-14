/**
 * Dinheiro que dá para gastar, separado de patrimônio.
 *
 * A projeção respondia "você consegue pagar suas contas?" somando todas as
 * contas menos o cartão. Uma aplicação de vinte mil reais entrava nessa soma e
 * a resposta virava "sim" para quem, no dia do vencimento, não tem esse
 * dinheiro na conta. Patrimônio e caixa respondem perguntas diferentes e não
 * podem ser o mesmo número.
 *
 * O corte é por tipo de conta, não por adivinhação de liquidez: não dá para
 * saber, pelo cadastro, se uma aplicação resgata em D+0 ou em dois anos. Quem
 * resgatou registra a transferência para a conta corrente, e o dinheiro entra
 * no caixa por esse caminho — explícito, e não por inferência nossa.
 */

export interface ContaComSaldo {
  tipo: string
  saldoCentavos: number
}

/** Tipos que NÃO são dinheiro disponível para pagar compromissos do mês. */
const FORA_DO_CAIXA = new Set(["CARTAO_CREDITO", "INVESTIMENTO"])

/** Soma só o que dá para gastar hoje. */
export function saldoDisponivel(contas: ContaComSaldo[]): number {
  return contas.reduce((soma, conta) => (FORA_DO_CAIXA.has(conta.tipo) ? soma : soma + conta.saldoCentavos), 0)
}

/** Soma tudo o que a pessoa tem, menos a dívida do cartão. É o patrimônio. */
export function patrimonio(contas: ContaComSaldo[]): number {
  return contas.reduce((soma, conta) => (conta.tipo === "CARTAO_CREDITO" ? soma : soma + conta.saldoCentavos), 0)
}

/** O que está aplicado — o que a projeção deixa de fora e o patrimônio mantém. */
export function aplicado(contas: ContaComSaldo[]): number {
  return contas.reduce((soma, conta) => (conta.tipo === "INVESTIMENTO" ? soma + conta.saldoCentavos : soma), 0)
}
