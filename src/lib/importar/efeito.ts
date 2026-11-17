import { rotuloCompetencia } from "@/lib/datas"
import { formatarMoeda } from "@/lib/dinheiro"

/**
 * O que vai acontecer quando a pessoa confirmar a importação (pedido do Davi,
 * 16/11/2026: "saber o que vai acontecer, ter uma predição").
 *
 * A prévia dizia quantos lançamentos entram e quanto somam, mas não o que
 * isso faz com a conta: o saldo depois, e em que mês cada coisa cai. Função
 * pura, para a frase da tela ser a mesma conta que o teste confere.
 */
export interface LinhaDoEfeito { tipo: "RECEITA" | "DESPESA" | "TRANSFERENCIA"; valorCentavos: number; data: string; duplicada: boolean }

export interface EfeitoDaImportacao {
  /// Nulo em cartão: lá o que muda é a fatura, não um saldo de conta.
  saldoDepoisCentavos: number | null
  porMes: { competencia: string; quantidade: number }[]
}

export function efeitoDaImportacao(linhas: LinhaDoEfeito[], saldoAntesCentavos: number | null): EfeitoDaImportacao {
  const novas = linhas.filter((linha) => !linha.duplicada)
  // Transferência no extrato é dinheiro que saiu desta conta (pagamento de
  // fatura, por exemplo): não é gasto, mas baixa o saldo dela.
  const variacao = novas.reduce((soma, linha) => soma + (linha.tipo === "RECEITA" ? linha.valorCentavos : -linha.valorCentavos), 0)
  const meses = new Map<string, number>()
  for (const linha of novas) meses.set(linha.data.slice(0, 7), (meses.get(linha.data.slice(0, 7)) ?? 0) + 1)
  return {
    saldoDepoisCentavos: saldoAntesCentavos === null ? null : saldoAntesCentavos + variacao,
    porMes: [...meses.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([competencia, quantidade]) => ({ competencia, quantidade })),
  }
}

/** As frases que a prévia mostra. Vazio quando não há o que dizer. */
export function frasesDoEfeito(efeito: EfeitoDaImportacao, dados: { conta: string; saldoAntesCentavos: number | null; competenciaFatura?: string }): string[] {
  const frases: string[] = []
  if (dados.saldoAntesCentavos !== null && efeito.saldoDepoisCentavos !== null) {
    frases.push(`Ao confirmar, o saldo de ${dados.conta} vai de ${formatarMoeda(dados.saldoAntesCentavos)} para ${formatarMoeda(efeito.saldoDepoisCentavos)}.`)
  }
  if (dados.competenciaFatura) frases.push(`Estas compras entram na fatura de ${rotuloCompetencia(dados.competenciaFatura)}.`)
  if (efeito.porMes.length > 1) {
    frases.push("Por mês: " + efeito.porMes.map((mes) => `${mes.quantidade} em ${rotuloCompetencia(mes.competencia, true)}`).join(", ") + ".")
  }
  return frases
}
