/**
 * Cálculo da venda de balcão.
 *
 * Função pura: sem banco, sem React. É o que permite testar cada regra de
 * dinheiro em milissegundos, e é onde mora a única resposta que o dono de loja
 * não consegue obter hoje — quanto da venda vira dinheiro dele, e quando.
 *
 * A maquininha mostra o bruto. O extrato mostra o líquido semanas depois. No
 * meio disso o dono planeja com um número que não existe.
 */

import { ratear } from "@/lib/dinheiro"

export type FormaPagamento =
  | "DINHEIRO"
  | "PIX"
  | "DEBITO"
  | "CREDITO_VISTA"
  | "CREDITO_PARCELADO"
  | "FIADO"

export interface ItemDaVenda {
  descricao: string
  quantidade: number
  precoUnitarioCentavos: number
}

export interface PagamentoInformado {
  forma: FormaPagamento
  valorCentavos: number
  /// Parcelas do crédito. Ignorado nas demais formas.
  parcelas?: number
}

export interface RegraDeRecebimento {
  forma: FormaPagamento
  taxaBps: number
  prazoDias: number
}

export interface PagamentoCalculado {
  forma: FormaPagamento
  valorCentavos: number
  taxaBps: number
  taxaCentavos: number
  valorLiquidoCentavos: number
  parcelas: number
  previsaoRecebimentoEm: Date
}

/** Total de um item. Quantidade é sempre inteira: loja de balcão vende peça. */
export function totalDoItem(item: ItemDaVenda): number {
  return Math.max(0, Math.trunc(item.quantidade)) * item.precoUnitarioCentavos
}

/**
 * Total da venda.
 *
 * O desconto é em centavos, não em percentual. Percentual obriga arredondar e
 * o valor cobrado passa a divergir do exibido por um centavo — que numa loja
 * vira discussão no balcão. O desconto nunca leva o total abaixo de zero.
 */
export function totalDaVenda(itens: ItemDaVenda[], descontoCentavos = 0): number {
  const bruto = itens.reduce((soma, item) => soma + totalDoItem(item), 0)
  return Math.max(0, bruto - Math.max(0, descontoCentavos))
}

/** Rateia o desconto de venda mista entre comércio e serviço para o DAS. */
export function dividirFaturamentoMei(itens: (ItemDaVenda & { servicoId?: string })[], totalCentavos: number) {
  const bruto = itens.reduce((soma, item) => soma + totalDoItem(item), 0)
  const brutoServico = itens.filter((item) => item.servicoId).reduce((soma, item) => soma + totalDoItem(item), 0)
  const servicosCentavos = bruto > 0 ? Math.round(totalCentavos * brutoServico / bruto) : 0
  return { comercioCentavos: totalCentavos - servicosCentavos, servicosCentavos }
}

/**
 * Taxa cobrada pela maquininha, em centavos.
 *
 * Arredonda para o centavo mais próximo. A adquirente arredonda também; o que
 * não pode é o app guardar fração de centavo e o extrato nunca fechar.
 */
export function taxaEmCentavos(valorCentavos: number, taxaBps: number): number {
  return Math.round((valorCentavos * taxaBps) / 10_000)
}

/** Dia em que o dinheiro cai, contando dias corridos a partir da venda. */
export function previsaoDeRecebimento(vendidoEm: Date, prazoDias: number): Date {
  const data = new Date(vendidoEm)
  data.setDate(data.getDate() + Math.max(0, prazoDias))
  return data
}

/**
 * Aplica a regra da forma de pagamento sobre um pagamento informado.
 *
 * Sem regra cadastrada para a forma, assume taxa zero e recebimento no mesmo
 * dia — e não inventa uma taxa "de mercado". Estimativa exibida como fato é o
 * que destrói a confiança na tela inteira; quem precisa do número é quem tem o
 * contrato da maquininha na mão.
 */
export function calcularPagamento(
  pagamento: PagamentoInformado,
  regras: RegraDeRecebimento[],
  vendidoEm: Date,
): PagamentoCalculado {
  const regra = regras.find((linha) => linha.forma === pagamento.forma)
  const taxaBps = regra?.taxaBps ?? 0
  const prazoDias = regra?.prazoDias ?? 0

  const taxaCentavos = taxaEmCentavos(pagamento.valorCentavos, taxaBps)

  return {
    forma: pagamento.forma,
    valorCentavos: pagamento.valorCentavos,
    taxaBps,
    taxaCentavos,
    valorLiquidoCentavos: pagamento.valorCentavos - taxaCentavos,
    parcelas: pagamento.forma === "CREDITO_PARCELADO" ? Math.max(1, pagamento.parcelas ?? 1) : 1,
    previsaoRecebimentoEm: previsaoDeRecebimento(vendidoEm, prazoDias),
  }
}

/**
 * Parcelas do crédito parcelado, sem sobra de centavo.
 *
 * A adquirente paga uma parcela por mês. Dividir R$ 100 em 3 dá 33,33 três
 * vezes e some um centavo; `ratear` devolve a soma exata, com o resto na
 * primeira parcela.
 */
export function parcelasDoRecebimento(
  pagamento: PagamentoCalculado,
): { numero: number; valorCentavos: number; previsaoEm: Date }[] {
  const valores = ratear(pagamento.valorLiquidoCentavos, pagamento.parcelas)

  return valores.map((valorCentavos, indice) => ({
    numero: indice + 1,
    valorCentavos,
    previsaoEm: somarMeses(pagamento.previsaoRecebimentoEm, indice),
  }))
}

/**
 * Soma meses sem estourar para o mês seguinte.
 *
 * `setMonth` em 31 de janeiro mais um mês devolve 3 de março, porque fevereiro
 * não tem dia 31 e o JavaScript transborda o excedente. Numa venda parcelada no
 * dia 31, isso jogaria a parcela um mês inteiro fora do lugar e a previsão de
 * caixa apontaria dinheiro na semana errada.
 *
 * Aqui o dia é preso ao último do mês de destino, que é o que a adquirente faz.
 */
export function somarMeses(data: Date, meses: number): Date {
  const ano = data.getUTCFullYear()
  const mes = data.getUTCMonth() + meses
  const dia = data.getUTCDate()

  const ultimoDiaDoDestino = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate()

  return new Date(
    Date.UTC(ano, mes, Math.min(dia, ultimoDiaDoDestino), data.getUTCHours(), data.getUTCMinutes(), data.getUTCSeconds()),
  )
}

export interface ConferenciaDaVenda {
  totalCentavos: number
  pagoCentavos: number
  faltaCentavos: number
  trocoCentavos: number
  fechada: boolean
}

/**
 * Confere se os pagamentos cobrem a venda.
 *
 * Troco só existe em dinheiro. Pagar a mais no cartão não é troco, é erro de
 * digitação — e deixar passar como troco faria a loja devolver dinheiro que
 * não recebeu.
 */
export function conferirVenda(
  totalCentavos: number,
  pagamentos: PagamentoInformado[],
): ConferenciaDaVenda {
  const pagoCentavos = pagamentos.reduce((soma, pagamento) => soma + pagamento.valorCentavos, 0)
  const emDinheiro = pagamentos
    .filter((pagamento) => pagamento.forma === "DINHEIRO")
    .reduce((soma, pagamento) => soma + pagamento.valorCentavos, 0)

  const sobra = Math.max(0, pagoCentavos - totalCentavos)

  return {
    totalCentavos,
    pagoCentavos,
    faltaCentavos: Math.max(0, totalCentavos - pagoCentavos),
    trocoCentavos: Math.min(sobra, emDinheiro),
    fechada: pagoCentavos >= totalCentavos,
  }
}

/**
 * Tira o troco dos pagamentos antes de gravar.
 *
 * Quem paga R$ 50 numa venda de R$ 35 entregou R$ 50, mas deu R$ 35 à loja e
 * levou R$ 15 de volta. Gravar os R$ 50 faria o resumo somar troco como
 * receita — e o líquido apareceria maior que o bruto, que foi exatamente o que
 * aconteceu antes desta função existir.
 *
 * O corte sai do dinheiro, porque troco só existe em espécie. Se ainda sobrar
 * excesso depois disso, é erro de digitação no cartão e o valor fica como veio,
 * para a conferência da venda recusar em vez de esconder.
 */
export function descontarTroco(totalCentavos: number, pagamentos: PagamentoInformado[]): PagamentoInformado[] {
  const pago = pagamentos.reduce((soma, pagamento) => soma + pagamento.valorCentavos, 0)
  let excesso = pago - totalCentavos
  if (excesso <= 0) return pagamentos

  return pagamentos.map((pagamento) => {
    if (excesso <= 0 || pagamento.forma !== "DINHEIRO") return pagamento

    const corte = Math.min(excesso, pagamento.valorCentavos)
    excesso -= corte
    return { ...pagamento, valorCentavos: pagamento.valorCentavos - corte }
  })
}

export interface MovimentoDeCaixa {
  formas: { forma: FormaPagamento; valorCentavos: number }[]
}

export interface ResumoDoCaixa {
  aberturaCentavos: number
  vendidoCentavos: number
  emDinheiroCentavos: number
  sangriaCentavos: number
  esperadoNaGavetaCentavos: number
  informadoCentavos: number | null
  diferencaCentavos: number | null
}

/**
 * Fechamento de caixa.
 *
 * O esperado na gaveta conta só o que entrou em dinheiro: cartão e Pix não
 * passam pela gaveta, e somá-los faria toda conferência acusar falta.
 *
 * A diferença fica como está — positiva ou negativa. Ajustar o informado para
 * bater com o esperado apagaria justamente o que o dono precisa enxergar.
 */
export function resumoDoCaixa(entrada: {
  aberturaCentavos: number
  vendas: MovimentoDeCaixa[]
  sangriasCentavos: number[]
  fechamentoInformadoCentavos?: number | null
}): ResumoDoCaixa {
  let vendidoCentavos = 0
  let emDinheiroCentavos = 0

  for (const venda of entrada.vendas) {
    for (const pagamento of venda.formas) {
      vendidoCentavos += pagamento.valorCentavos
      if (pagamento.forma === "DINHEIRO") emDinheiroCentavos += pagamento.valorCentavos
    }
  }

  const sangriaCentavos = entrada.sangriasCentavos.reduce((soma, valor) => soma + valor, 0)
  const esperadoNaGavetaCentavos = entrada.aberturaCentavos + emDinheiroCentavos - sangriaCentavos
  const informadoCentavos = entrada.fechamentoInformadoCentavos ?? null

  return {
    aberturaCentavos: entrada.aberturaCentavos,
    vendidoCentavos,
    emDinheiroCentavos,
    sangriaCentavos,
    esperadoNaGavetaCentavos,
    informadoCentavos,
    diferencaCentavos: informadoCentavos === null ? null : informadoCentavos - esperadoNaGavetaCentavos,
  }
}
