/**
 * Para onde mandar quem quer resolver o que a tela apontou.
 *
 * O princípio de tela (`docs/PRINCIPIO-DE-TELA.md`) manda a ação morar ao lado
 * da conclusão. Um bloco que aponta problema e não diz onde agir devolve o
 * trabalho para a pessoa — e o destino é sempre o mesmo, venha o aviso do
 * painel, da análise ou de um alerta. Por isso o mapa mora num lugar só.
 */
export interface Destino {
  href: string
  texto: string
}

/// Pelas prioridades do diagnóstico (`Prioridade.chave`).
export const ONDE_RESOLVER: Record<string, Destino> = {
  "cheque-especial": { href: "/orcamento", texto: "Direcionar a sobra" },
  renegociar: { href: "/dividas", texto: "Ver minhas dívidas" },
  folga: { href: "/orcamento", texto: "Onde cortar" },
  reserva: { href: "/reserva", texto: "Montar a reserva" },
  classificar: { href: "/transacoes", texto: "Classificar pendentes" },
  manter: { href: "/metas", texto: "Escolher uma meta" },
}

/// Pelos indicadores do diagnóstico (`Indicador.chave`).
export const ONDE_RESOLVER_INDICADOR: Record<string, Destino> = {
  comprometimento: { href: "/dividas", texto: "Ver minhas dívidas" },
  endividamento: { href: "/dividas", texto: "Ver minhas dívidas" },
  "taxa-poupanca": { href: "/investir", texto: "Quanto dá para guardar" },
  liquidez: { href: "/reserva", texto: "Montar a reserva" },
  "custo-fixo": { href: "/recorrencias", texto: "Rever contas fixas" },
  essencial: { href: "/orcamento", texto: "Ajustar o orçamento" },
}
