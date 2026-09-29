/**
 * A Prateleira em números (tela nova, 28/09/2026): a situação de cada produto
 * e o resumo do topo. Separado da tela para ter teste — é dinheiro e é o que
 * decide o que o dono vai repor.
 */

import type { Movimento } from "@/lib/loja/estoque"

export type Situacao = "sem estoque" | "acabando" | "sem custo" | "nunca vendeu" | "parado" | "em dia"

/// Mesma janela de trinta dias do "parado" que a tela já usava.
export const DIAS_PARADO = 30

export interface LinhaDaPrateleira {
  saldo: number
  precoCentavos: number
  /// Nulo quando nenhuma entrada teve custo — ou quando quem vê é funcionário.
  custoMedioCentavos: number | null
  acabando: boolean
  semSaldo: boolean
  quantidadeVendida: number
  nuncaVendeu: boolean
  diasSemVender: number | null
}

/**
 * Uma situação só por produto, a mais urgente. Cinco etiquetas na mesma linha
 * não dizem o que fazer primeiro; a ordem diz:
 * sem estoque e acabando pedem reposição (perde venda hoje), sem custo esconde
 * a margem, e parado/nunca vendeu é dinheiro preso na prateleira.
 *
 * `comCusto` é falso para o funcionário: ele não vê custo, e marcar tudo como
 * "sem custo" para ele seria mentira.
 */
export function situacaoNaPrateleira(linha: LinhaDaPrateleira, comCusto = true): Situacao {
  if (linha.semSaldo) return "sem estoque"
  if (linha.acabando) return "acabando"
  if (comCusto && linha.custoMedioCentavos === null) return "sem custo"
  if (linha.nuncaVendeu) return "nunca vendeu"
  if ((linha.diasSemVender ?? 0) >= DIAS_PARADO) return "parado"
  return "em dia"
}

export interface ResumoDaPrateleira {
  pecas: number
  /// O que a prateleira vale pelo preço de venda.
  valorNaVendaCentavos: number
  /// O que a prateleira custou — só dos produtos com custo lançado.
  custoParadoCentavos: number
  /// Quantos produtos com saldo ficaram fora do custo parado por não terem custo.
  semCustoComSaldo: number
}

/**
 * O topo da tela. O custo parado soma só o que tem custo lançado e diz
 * quantos ficaram de fora: somar zero no lugar do custo que falta mostraria um
 * número menor como se fosse o total.
 */
export function resumoDaPrateleira(linhas: LinhaDaPrateleira[]): ResumoDaPrateleira {
  let pecas = 0
  let valor = 0
  let custo = 0
  let semCusto = 0
  for (const linha of linhas) {
    const saldo = Math.max(0, linha.saldo)
    pecas += saldo
    valor += saldo * linha.precoCentavos
    if (linha.custoMedioCentavos === null) {
      if (saldo > 0) semCusto += 1
    } else {
      custo += saldo * linha.custoMedioCentavos
    }
  }
  return { pecas, valorNaVendaCentavos: valor, custoParadoCentavos: custo, semCustoComSaldo: semCusto }
}

/**
 * O tamanho da barra do estoque: a última entrada ou contagem. "1 de 40" diz
 * que o brigadeiro está no fim do que chegou; "1" sozinho não diz nada. Se
 * vendeu menos do que sobrou de antes, o saldo pode passar da última entrada,
 * e aí a referência é o próprio saldo (barra cheia, nunca acima de 100%).
 */
export function referenciaDaBarra(movimentos: Movimento[], saldo: number): number {
  const ultima = [...movimentos].reverse().find((movimento) => movimento.tipo === "ENTRADA" || movimento.tipo === "AJUSTE")
  return Math.max(saldo, ultima?.quantidade ?? 0, 0)
}
