/**
 * DRE da loja — separado do parecer pessoal do dono.
 *
 * Reaproveita o que já existe e já é testado: receita líquida vem de
 * `resumirLoja` (Fase 5), CMV vem de `custoDaMercadoriaVendida` (Fase 2),
 * despesa vem das `ContaDaLoja` pagas no período (Fase 4). Este arquivo só
 * soma as três pontas.
 *
 * De propósito não é uma variação de `src/lib/tino/diagnostico.ts`: aquele é
 * o motor da vida PESSOAL do dono, alimentado por `Conta`/`Transacao`. Este
 * nunca toca nenhuma das duas — é construído só a partir dos modelos da loja
 * — então não existe risco de vazar número pessoal aqui por engano. Mesma
 * separação de "produto separado" que já existe entre `src/lib/loja` e
 * `src/lib/tino` (ver docs/TINO-MEI.md).
 */

import { custoDaMercadoriaVendida } from "@/lib/loja/estoque"

export interface DemonstrativoDaLoja {
  receitaLiquidaCentavos: number
  cmvCentavos: number
  despesasCentavos: number
  lucroCentavos: number
  /// Peças vendidas sem custo de entrada conhecido — o CMV acima não as conta,
  /// então o lucro está inflado nessa medida. Mostrar isso é o que impede o
  /// demonstrativo de parecer mais saudável do que é de verdade.
  pecasSemCusto: number
}

export function demonstrativoDaLoja(params: {
  receitaLiquidaCentavos: number
  saidasDeEstoque: { quantidade: number; custoUnitarioCentavos: number | null }[]
  despesasPagasCentavos: number[]
}): DemonstrativoDaLoja {
  const { totalCentavos: cmvCentavos, pecasSemCusto } = custoDaMercadoriaVendida(params.saidasDeEstoque)
  const despesasCentavos = params.despesasPagasCentavos.reduce((soma, valor) => soma + valor, 0)

  return {
    receitaLiquidaCentavos: params.receitaLiquidaCentavos,
    cmvCentavos,
    despesasCentavos,
    lucroCentavos: params.receitaLiquidaCentavos - cmvCentavos - despesasCentavos,
    pecasSemCusto,
  }
}

/**
 * Pagamento ao fornecedor de mercadoria não é despesa do período: é compra de
 * estoque, e o custo dessas peças já entra no resultado pelo custo das peças
 * vendidas, quando elas saem. Somar os dois contava a mesma mercadoria duas
 * vezes — em 28/09/2026 isso virou um lucro de R$ 447,06 num prejuízo de
 * R$ 752,94 na demo. Serviço de terceiro (contador, frete avulso) vai em
 * "Outro", que continua sendo despesa.
 */
export const FORA_DA_DESPESA = new Set(["FORNECEDOR"])

export function despesasDoResultado(contas: { categoria: string; valorCentavos: number }[]): number[] {
  return contas.filter((conta) => !FORA_DA_DESPESA.has(conta.categoria)).map((conta) => conta.valorCentavos)
}

const NO_CARTAO = new Set(["DEBITO", "CREDITO_VISTA", "CREDITO_PARCELADO"])

export interface IndicadoresDaLoja extends DemonstrativoDaLoja {
  brutoCentavos: number
  taxasCentavos: number
  vendas: number
  /// null sem venda: média de nada não é zero.
  ticketMedioCentavos: number | null
  /// O que sobra de cada venda depois da maquininha e das peças, em bps do bruto.
  sobraBps: number | null
  /// Quanto vender no período para as contas empatarem com a sobra. null quando
  /// a sobra é zero ou negativa: aí nenhuma venda cobre as contas, e mostrar um
  /// número seria inventar.
  empateCentavos: number | null
  /// Pagamentos no cartão gravados sem taxa: a regra da maquininha não estava
  /// cadastrada, e o líquido saiu igual ao bruto.
  cartaoSemTaxa: number
  maiorConta: { descricao: string; valorCentavos: number } | null
}

export function indicadoresDaLoja(params: {
  vendas: { totalCentavos: number; cancelada: boolean; pagamentos: { forma: string; taxaBps: number; valorCentavos: number; valorLiquidoCentavos: number }[] }[]
  saidasDeEstoque: { quantidade: number; custoUnitarioCentavos: number | null }[]
  contasPagas: { descricao: string; categoria: string; valorCentavos: number }[]
}): IndicadoresDaLoja {
  const validas = params.vendas.filter((venda) => !venda.cancelada)
  const pagamentos = validas.flatMap((venda) => venda.pagamentos)
  const brutoCentavos = validas.reduce((soma, venda) => soma + venda.totalCentavos, 0)
  const liquidoCentavos = pagamentos.reduce((soma, pagamento) => soma + pagamento.valorLiquidoCentavos, 0)

  const base = demonstrativoDaLoja({
    receitaLiquidaCentavos: liquidoCentavos,
    saidasDeEstoque: params.saidasDeEstoque,
    despesasPagasCentavos: despesasDoResultado(params.contasPagas),
  })

  const sobraCentavos = liquidoCentavos - base.cmvCentavos
  const sobraBps = brutoCentavos > 0 ? Math.round((sobraCentavos / brutoCentavos) * 10_000) : null
  const empateCentavos =
    base.despesasCentavos === 0 ? 0 : sobraBps !== null && sobraBps > 0 ? Math.ceil((base.despesasCentavos * 10_000) / sobraBps) : null

  const porConta = new Map<string, number>()
  for (const conta of params.contasPagas) {
    if (FORA_DA_DESPESA.has(conta.categoria)) continue
    porConta.set(conta.descricao, (porConta.get(conta.descricao) ?? 0) + conta.valorCentavos)
  }
  const [maior] = [...porConta.entries()].sort((a, b) => b[1] - a[1])

  return {
    ...base,
    brutoCentavos,
    taxasCentavos: brutoCentavos - liquidoCentavos,
    vendas: validas.length,
    ticketMedioCentavos: validas.length > 0 ? Math.round(brutoCentavos / validas.length) : null,
    sobraBps,
    empateCentavos,
    cartaoSemTaxa: pagamentos.filter((pagamento) => NO_CARTAO.has(pagamento.forma) && pagamento.taxaBps === 0).length,
    maiorConta: maior ? { descricao: maior[0], valorCentavos: maior[1] } : null,
  }
}

/** Vendas acumuladas dia a dia, para a linha do gráfico. `dias` em ordem, no fuso do lar. */
export function vendasAcumuladas(vendas: { dia: string; totalCentavos: number }[], dias: string[]): number[] {
  const porDia = new Map<string, number>()
  for (const venda of vendas) porDia.set(venda.dia, (porDia.get(venda.dia) ?? 0) + venda.totalCentavos)
  let acumulado = 0
  return dias.map((dia) => (acumulado += porDia.get(dia) ?? 0))
}
