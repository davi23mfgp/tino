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
