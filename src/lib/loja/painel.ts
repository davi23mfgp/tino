/** Números do painel da loja. Só entram vendas concluídas do negócio. */
export interface VendaDoPainel {
  totalCentavos: number
  cancelada: boolean
  criadoEm: Date
  itens: { descricao: string; quantidade: number; totalCentavos: number }[]
  pagamentos: { forma: string; valorCentavos: number; valorLiquidoCentavos: number }[]
}

export function resumoDoPainel(vendas: VendaDoPainel[]) {
  const validas = vendas.filter((venda) => !venda.cancelada)
  const brutoCentavos = validas.reduce((soma, venda) => soma + venda.totalCentavos, 0)
  const unidades = validas.reduce((soma, venda) => soma + venda.itens.reduce((parcial, item) => parcial + item.quantidade, 0), 0)
  const liquidoCentavos = validas.reduce((soma, venda) => soma + venda.pagamentos.reduce((parcial, pagamento) => parcial + pagamento.valorLiquidoCentavos, 0), 0)
  return {
    brutoCentavos,
    vendas: validas.length,
    unidades,
    ticketMedioCentavos: validas.length ? Math.round(brutoCentavos / validas.length) : null,
    liquidoCentavos,
    taxasCentavos: brutoCentavos - liquidoCentavos,
  }
}

export function produtosDoPainel(vendas: VendaDoPainel[]) {
  const porNome = new Map<string, { nome: string; unidades: number; totalCentavos: number }>()
  for (const venda of vendas.filter((linha) => !linha.cancelada)) {
    for (const item of venda.itens) {
      const anterior = porNome.get(item.descricao) ?? { nome: item.descricao, unidades: 0, totalCentavos: 0 }
      anterior.unidades += item.quantidade
      anterior.totalCentavos += item.totalCentavos
      porNome.set(item.descricao, anterior)
    }
  }
  return [...porNome.values()].sort((a, b) => b.unidades - a.unidades || b.totalCentavos - a.totalCentavos).slice(0, 10)
}

export function formasDoPainel(vendas: VendaDoPainel[]) {
  const porForma = new Map<string, number>()
  for (const venda of vendas.filter((linha) => !linha.cancelada)) {
    for (const pagamento of venda.pagamentos) porForma.set(pagamento.forma, (porForma.get(pagamento.forma) ?? 0) + pagamento.valorCentavos)
  }
  return [...porForma].map(([forma, totalCentavos]) => ({ forma, totalCentavos })).sort((a, b) => b.totalCentavos - a.totalCentavos)
}
