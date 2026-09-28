/**
 * O que a loja rendeu.
 *
 * Três perguntas que o dono de loja não consegue responder olhando a
 * maquininha: quanto vendi de verdade, quanto disso já é meu, e quanto ainda
 * está para cair.
 *
 * A diferença entre bruto e líquido é o que a maquininha esconde: ela mostra o
 * valor da venda, cobra a taxa depois e paga em trinta dias. Quem planeja pelo
 * bruto planeja com dinheiro que nunca vai existir.
 */

export interface PagamentoDoResumo {
  forma: string
  valorCentavos: number
  valorLiquidoCentavos: number
  previsaoRecebimentoEm: Date
  recebidoEm: Date | null
}

export interface VendaDoResumo {
  criadoEm: Date
  totalCentavos: number
  cancelada: boolean
  pagamentos: PagamentoDoResumo[]
}

export interface ResumoDaLoja {
  vendas: number
  brutoCentavos: number
  liquidoCentavos: number
  /// O que a maquininha fica: bruto menos líquido.
  taxasCentavos: number
  /// Já na conta.
  recebidoCentavos: number
  /// Ainda vai cair, dentro da janela consultada.
  aReceberCentavos: number
  /// Fiado em aberto, que não tem data para cair.
  fiadoCentavos: number
  porForma: { forma: string; vendas: number; brutoCentavos: number; liquidoCentavos: number }[]
  /// Faturamento por dia, para o gráfico.
  porDia: { dia: string; brutoCentavos: number }[]
}

/**
 * Resume as vendas de um período.
 *
 * Venda cancelada não entra em nada — nem no faturamento, nem na taxa. Deixá-la
 * no bruto "porque aconteceu" faria o limite do MEI subir por uma venda que foi
 * desfeita.
 *
 * O fiado sai da conta do que vai cair: ele não tem data. Somá-lo ao "a
 * receber" transformaria dívida de cliente em previsão de caixa, que é
 * exatamente o erro que quebra loja pequena.
 */
/**
 * Se o pagamento já está na mão ou na conta.
 *
 * Só o fiado ganha `recebidoEm` quando é pago; nada marca o resto. Sem esta
 * regra, a venda em dinheiro — que o lojista guardou na gaveta na hora —
 * aparecia para sempre em "ainda vai cair", e o cartão de dois meses atrás
 * também (Davi viu "Ainda vai cair R$ 35,00" numa venda em dinheiro,
 * 28/09/2026). Dinheiro cai na hora; o resto, na data prevista pela regra da
 * maquininha.
 */
export function jaCaiu(pagamento: PagamentoDoResumo, hoje: Date): boolean {
  if (pagamento.recebidoEm !== null) return true
  if (pagamento.forma === "FIADO") return false
  return pagamento.forma === "DINHEIRO" || pagamento.previsaoRecebimentoEm.getTime() <= hoje.getTime()
}

export function resumirLoja(vendas: VendaDoResumo[], hoje = new Date()): ResumoDaLoja {
  const validas = vendas.filter((venda) => !venda.cancelada)

  let bruto = 0
  let liquido = 0
  let recebido = 0
  let aReceber = 0
  let fiado = 0

  const formas = new Map<string, { vendas: number; bruto: number; liquido: number }>()
  const dias = new Map<string, number>()

  for (const venda of validas) {
    bruto += venda.totalCentavos

    const dia = venda.criadoEm.toISOString().slice(0, 10)
    dias.set(dia, (dias.get(dia) ?? 0) + venda.totalCentavos)

    for (const pagamento of venda.pagamentos) {
      liquido += pagamento.valorLiquidoCentavos

      if (jaCaiu(pagamento, hoje)) recebido += pagamento.valorLiquidoCentavos
      else if (pagamento.forma === "FIADO") fiado += pagamento.valorCentavos
      else aReceber += pagamento.valorLiquidoCentavos

      const atual = formas.get(pagamento.forma) ?? { vendas: 0, bruto: 0, liquido: 0 }
      formas.set(pagamento.forma, {
        vendas: atual.vendas + 1,
        bruto: atual.bruto + pagamento.valorCentavos,
        liquido: atual.liquido + pagamento.valorLiquidoCentavos,
      })
    }
  }

  return {
    vendas: validas.length,
    brutoCentavos: bruto,
    liquidoCentavos: liquido,
    taxasCentavos: bruto - liquido,
    recebidoCentavos: recebido,
    aReceberCentavos: aReceber,
    fiadoCentavos: fiado,
    porForma: [...formas.entries()]
      .map(([forma, dados]) => ({
        forma,
        vendas: dados.vendas,
        brutoCentavos: dados.bruto,
        liquidoCentavos: dados.liquido,
      }))
      .sort((a, b) => b.brutoCentavos - a.brutoCentavos),
    porDia: [...dias.entries()].map(([dia, brutoCentavos]) => ({ dia, brutoCentavos })).sort((a, b) => a.dia.localeCompare(b.dia)),
  }
}

/**
 * O que cai na conta nos próximos dias.
 *
 * Agrupa por data de recebimento, não por data de venda. É a resposta para
 * "tenho como pagar o aluguel dia 10?", que a maquininha não dá.
 */
export function aCairPorDia(
  vendas: VendaDoResumo[],
  dias = 30,
  hoje = new Date(),
): { dia: string; valorCentavos: number }[] {
  const limite = new Date(hoje.getTime() + dias * 86_400_000)
  const porDia = new Map<string, number>()

  for (const venda of vendas.filter((linha) => !linha.cancelada)) {
    for (const pagamento of venda.pagamentos) {
      // Fiado fica fora: não tem data, e prometer data para ele viraria
      // previsão de caixa em cima de dívida de cliente.
      if (pagamento.forma === "FIADO" || jaCaiu(pagamento, hoje)) continue
      if (pagamento.previsaoRecebimentoEm > limite) continue

      const dia = pagamento.previsaoRecebimentoEm.toISOString().slice(0, 10)
      porDia.set(dia, (porDia.get(dia) ?? 0) + pagamento.valorLiquidoCentavos)
    }
  }

  return [...porDia.entries()]
    .map(([dia, valorCentavos]) => ({ dia, valorCentavos }))
    .sort((a, b) => a.dia.localeCompare(b.dia))
}
