/**
 * De onde sai o valor que o orçamento do cartão mostra num mês sem plano.
 *
 * A tela e a API respondiam isto de formas diferentes: a API só aproveitava o
 * valor antigo da conta no mês corrente e enquanto não existisse nenhum plano
 * salvo; a tela aproveitava em qualquer mês. Navegar para um mês ainda não
 * planejado mostrava um teto como se já estivesse definido — e bastava salvar
 * para congelar um número que ninguém decidiu.
 *
 * Uma função só, usada pelos dois. O campo `orcamentoMensalCentavos` da conta é
 * herança de antes de existir plano por mês: serve de ponto de partida uma vez,
 * e só enquanto a pessoa nunca planejou nada.
 */

export function orcamentoInicialCentavos(entrada: {
  /// Total do plano salvo para o mês pedido, se existir.
  planoDoMesCentavos?: number | null
  /// Já existe QUALQUER plano mensal salvo para este cartão?
  possuiPlanos: boolean
  /// O mês pedido é o mês corrente?
  mesCorrente: boolean
  /// O valor legado gravado na conta.
  orcamentoMensalCentavos?: number | null
}): number {
  if (entrada.planoDoMesCentavos != null) return entrada.planoDoMesCentavos
  if (entrada.possuiPlanos || !entrada.mesCorrente) return 0
  return entrada.orcamentoMensalCentavos ?? 0
}
