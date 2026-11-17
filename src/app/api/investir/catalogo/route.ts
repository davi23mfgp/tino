import { comSessao, ok } from "@/lib/api"
import { buscarNoCatalogo } from "@/lib/catalogo-ativos"

export const dynamic = "force-dynamic"

/** Busca de investimento pelo nome, para a pessoa escolher em vez de decorar o código. */
export const GET = comSessao(async (_sessao, requisicao) => {
  const texto = new URL(requisicao.url).searchParams.get("q") ?? ""
  return ok(await buscarNoCatalogo(texto))
})
