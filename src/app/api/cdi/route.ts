import { comSessao, ok } from "@/lib/api"
import { cdiDoMes } from "@/lib/cdi"

export const dynamic = "force-dynamic"

/**
 * O CDI do mês corrente.
 *
 * Atrás de sessão como o câmbio e as cotações: o Tino não é proxy aberto para
 * a API do Banco Central.
 */
export const GET = comSessao(async () => ok(await cdiDoMes()))
