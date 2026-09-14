import { comSessao, ok } from "@/lib/api"
import { precosDeAtivos } from "@/lib/cotacoes"

export const dynamic = "force-dynamic"

/**
 * Preço do dia dos ativos pedidos: `/api/cotacoes?tickers=PETR4,ITUB4`.
 *
 * Atrás de sessão para o app não virar proxy aberto de cotação. A resposta é
 * pública por natureza e não toca em dado do lar.
 */
export const GET = comSessao(async (_sessao, requisicao) => {
  const pedidos = new URL(requisicao.url).searchParams.get("tickers") ?? ""
  return ok(await precosDeAtivos(pedidos.split(",")))
})
