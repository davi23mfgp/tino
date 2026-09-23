import { comSessao, ok } from "@/lib/api"
import { cotacaoDoDolar } from "@/lib/cambio"
import { indicadoresDoMercado, PERIODOS, seriesDosAtivos, type Periodo } from "@/lib/mercado"

export const dynamic = "force-dynamic"

/**
 * `/api/mercado?tickers=PETR4,AAPL&periodo=1mo`: preço e histórico dos ativos
 * da carteira, os indicadores do dia e o dólar para converter o que é cotado
 * lá fora.
 *
 * Atrás de sessão, como as cotações: o Tino não é proxy aberto de mercado.
 */
export const GET = comSessao(async (_sessao, requisicao) => {
  const parametros = new URL(requisicao.url).searchParams
  const pedido = parametros.get("periodo") as Periodo | null
  const periodo: Periodo = PERIODOS.some((item) => item.periodo === pedido) ? pedido! : "1mo"
  const tickers = (parametros.get("tickers") ?? "").split(",")

  const [ativos, indices] = await Promise.all([seriesDosAtivos(tickers, periodo), indicadoresDoMercado()])
  // O dólar do painel serve para converter; sem ele, a AwesomeAPI (que o
  // cartão internacional já usa). Sem nenhum dos dois, ativo em dólar fica
  // sem valor em reais — a tela diz isso em vez de supor um câmbio.
  const dolarDoPainel = indices.find((indice) => indice.chave === "dolar")?.valor
  const dolar = dolarDoPainel ?? (await cotacaoDoDolar())?.valor ?? null

  return ok({ periodo, ativos, indices, dolar, atualizadoEm: new Date().toISOString() })
})
