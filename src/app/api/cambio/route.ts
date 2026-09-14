import { comSessao, ok } from "@/lib/api"
import { cotacaoDoDolar } from "@/lib/cambio"

export const dynamic = "force-dynamic"

/**
 * Cotação do dólar do dia, para a tela não pedir o câmbio à mão.
 *
 * Fica atrás de sessão para o app não virar um proxy aberto de câmbio; a
 * resposta é a mesma para todo mundo e não toca em dado do lar.
 */
export const GET = comSessao(async () => ok(await cotacaoDoDolar()))
