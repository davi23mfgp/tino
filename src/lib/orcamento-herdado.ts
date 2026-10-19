/**
 * De que mês vêm os limites do Orçamento.
 *
 * Até 19/10/2026 o limite valia só no mês em que foi salvo, e todo mês novo
 * começava vazio: quem não tocava em "Repetir" refazia o orçamento inteiro todo
 * dia 1º. Agora o mês sem limite próprio usa os do último mês que tinha, até a
 * pessoa mudar alguma coisa (aí o mês passa a ter os seus).
 *
 * Só olha para trás: um mês passado não herda limite criado depois dele, senão
 * a história de setembro mudaria por causa de uma decisão de dezembro.
 */
export function competenciaDosLimites(competenciasComLimite: string[], alvo: string): string | null {
  let melhor: string | null = null
  for (const competencia of competenciasComLimite) {
    if (competencia <= alvo && (melhor === null || competencia > melhor)) melhor = competencia
  }
  return melhor
}
