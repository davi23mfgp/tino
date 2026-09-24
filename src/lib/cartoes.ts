import { competenciaMaisMeses } from "@/lib/datas"

export interface CompraCartao { id: string; descricao: string; data: string; competencia: string; valorCentavos: number; tipo: string; categoriaId: string | null; categoria: { nome: string; cor: string; icone: string } | null }
export interface ParcelaCartao { id: string; numero: number; competencia: string; valorCentavos: number; paga: boolean }
export interface CompraParcelada { id: string; descricao: string; categoriaId: string | null; parcelasTotal: number; parcelasPagas: number; valorTotalCentavos: number; parcelaCentavos: number; parcelas: ParcelaCartao[] }
export interface OrcamentoCartaoMes { competencia: string; totalCentavos: number; categorias: { categoriaId: string; limiteCentavos: number }[] }
export interface DadosCartao { id: string; nome: string; instituicao: string | null; limiteCentavos: number | null; bandeira?: string | null; orcamentoMensalCentavos?: number | null; diaFechamento: number | null; diaVencimento: number | null; compras: CompraCartao[]; parcelamentos: CompraParcelada[]; orcamentos?: OrcamentoCartaoMes[] }

export function resumoDoMes(cartao: DadosCartao, mes: string) {
  const compras = cartao.compras.filter(c => c.competencia === mes)
  const despesas = compras.filter(c => c.tipo === "DESPESA")
  const gastos = despesas.reduce((s, c) => s + c.valorCentavos, 0)
  const creditos = compras.filter(c => c.tipo === "RECEITA").reduce((s, c) => s + c.valorCentavos, 0)
  const categorias = new Map<string, { id: string; nome: string; totalCentavos: number }>()
  for (const c of despesas) { const id = c.categoriaId ?? "sem"; const linha = categorias.get(id) ?? { id, nome: c.categoria?.nome ?? "Sem categoria", totalCentavos: 0 }; linha.totalCentavos += c.valorCentavos; categorias.set(id, linha) }
  // A previsão fica separada: a importação pode já conter a parcela como transação.
  // Somá-las sem vínculo explícito duplicaria a fatura.
  const parcelas = cartao.parcelamentos.flatMap(p => p.parcelas.filter(x => x.competencia === mes).map(x => ({ ...x, descricao: p.descricao, total: p.parcelasTotal })))
  return { compras, gastos, creditos, saldo: Math.max(0, gastos-creditos), categorias: [...categorias.values()].sort((a,b) => b.totalCentavos-a.totalCentavos), parcelas, previsto: parcelas.reduce((s,p) => s+p.valorCentavos,0) }
}
export function mesesDoCartao(cartao: DadosCartao, atual: string) {
  return [...new Set([...Array.from({length:12},(_,i)=>competenciaMaisMeses(atual,i-5)), ...cartao.compras.map(c=>c.competencia), ...cartao.parcelamentos.flatMap(p=>p.parcelas.map(x=>x.competencia))])].sort()
}

/**
 * Faixas de uso do limite, em bps. Até 30% é o que os birôs de crédito e os
 * bancos costumam tratar como uso saudável; de 70% para cima o cartão está
 * quase no teto e pesa na análise de crédito. Referência de mercado, não
 * regra legal.
 */
export const REFERENCIA_USO_LIMITE = { saudavel: 3000, alto: 7000 }

export function faixaDoUsoDoLimite(usoBps: number): "saudavel" | "atencao" | "alto" {
  if (usoBps <= REFERENCIA_USO_LIMITE.saudavel) return "saudavel"
  if (usoBps < REFERENCIA_USO_LIMITE.alto) return "atencao"
  return "alto"
}

/**
 * Quanto do limite está preso, e quanto sobra.
 *
 * O cartão mostrava só a fatura do mês contra o limite ("24% do limite"). Mas
 * o banco desconta do limite tudo o que ainda vai ser cobrado: a fatura em
 * aberto, as compras que já caíram na fatura seguinte e cada parcela futura
 * de compra parcelada. Na conta demo a diferença era de 24% para 70%.
 *
 * Parcela do mês atual não entra de novo: ela já está na fatura (ou chega
 * nela pela importação), e somar as duas contaria o mesmo dinheiro duas vezes.
 *
 * Sem limite cadastrado devolve `null`: um percentual sobre um limite
 * inventado seria número com cara de fato.
 */
export function limiteDoCartao(cartao: DadosCartao, mesAtual: string) {
  if (!cartao.limiteCentavos || cartao.limiteCentavos <= 0) return null
  const faturas = cartao.compras
    .filter((compra) => compra.competencia >= mesAtual)
    .reduce((soma, compra) => soma + (compra.tipo === "DESPESA" ? compra.valorCentavos : compra.tipo === "RECEITA" ? -compra.valorCentavos : 0), 0)
  const faturaCentavos = Math.max(0, faturas)
  const parcelasFuturasCentavos = cartao.parcelamentos
    .flatMap((parcelamento) => parcelamento.parcelas)
    .filter((parcela) => !parcela.paga && parcela.competencia > mesAtual)
    .reduce((soma, parcela) => soma + parcela.valorCentavos, 0)
  const usadoCentavos = faturaCentavos + parcelasFuturasCentavos
  return {
    limiteCentavos: cartao.limiteCentavos,
    faturaCentavos,
    parcelasFuturasCentavos,
    usadoCentavos,
    // Pode passar do limite (compra aprovada acima dele): o disponível fica em
    // zero, e o uso acima de 100% aparece como está.
    disponivelCentavos: Math.max(0, cartao.limiteCentavos - usadoCentavos),
    usoBps: Math.round((usadoCentavos / cartao.limiteCentavos) * 10_000),
  }
}
