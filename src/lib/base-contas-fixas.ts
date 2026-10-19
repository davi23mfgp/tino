/**
 * Lista pronta de Contas fixas (passo 55). Só nome, categoria e se o valor
 * muda: nunca valor, que é da pessoa (regra 3).
 *
 * A ordem segue a POF do IBGE (habitação é o maior gasto; energia e
 * comunicação, os maiores serviços), para o que quase todo mundo paga ficar no
 * alto da grade. Estudo: docs/pesquisas/2026-10-19-base-pronta-contas-fixas-e-orcamento.md.
 */
export interface ContaDaBase {
  id: string
  nome: string
  /** Nome exato de uma categoria de `CATEGORIAS_PADRAO`, para já entrar categorizada. */
  categoria: string
  /** Luz, água e gás mudam todo mês: a projeção usa o último valor lançado. */
  variavel: boolean
  dica?: string
}

export const BASE_CONTAS_FIXAS: ContaDaBase[] = [
  { id: "aluguel", nome: "Aluguel", categoria: "Aluguel e condomínio", variavel: false, dica: "Se for financiamento da casa, ponha a parcela." },
  { id: "condominio", nome: "Condomínio", categoria: "Aluguel e condomínio", variavel: false },
  { id: "luz", nome: "Luz", categoria: "Energia elétrica", variavel: true, dica: "O valor muda todo mês: ponha o da última conta, e o Tino usa o último lançado na projeção." },
  { id: "agua", nome: "Água", categoria: "Água", variavel: true, dica: "O valor muda todo mês: ponha o da última conta." },
  { id: "internet", nome: "Internet", categoria: "Telefone e internet", variavel: false },
  { id: "celular", nome: "Celular", categoria: "Telefone e internet", variavel: false },
  { id: "gas", nome: "Gás", categoria: "Gás", variavel: true, dica: "Se compra botijão, ponha quanto gasta por mês em média do que você já pagou." },
  { id: "saude", nome: "Plano de saúde", categoria: "Plano de saúde", variavel: false },
  { id: "escola", nome: "Escola", categoria: "Educação", variavel: false },
  { id: "assinaturas", nome: "Assinaturas", categoria: "Assinaturas e streaming", variavel: false, dica: "Streaming, música, nuvem: pode somar todas aqui ou cadastrar uma por uma depois." },
  { id: "academia", nome: "Academia", categoria: "Academia", variavel: false },
  { id: "seguro", nome: "Seguro", categoria: "Seguros", variavel: false, dica: "Carro, casa ou vida. Se paga uma vez por ano, mude para anual depois." },
]
