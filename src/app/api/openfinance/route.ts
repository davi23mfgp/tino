/**
 * Rotas da tela `/conectar`.
 *
 * Separada de `/api/open-finance` (que é a rota antiga usada por
 * Configurações) porque esta responde o *estado da tela* — inclusive o caso
 * "ainda não configurado", que não é erro e não deve virar 500.
 */

import { comSessao, corpo, ok } from "@/lib/api"
import { estadoOpenFinance, iniciarConexao, sincronizar, OpenFinanceNaoConfigurado } from "@/lib/open-finance/provedor"

export const dynamic = "force-dynamic"

export const GET = comSessao(async (sessao) => ok(await estadoOpenFinance(sessao.larId)))

/** Começa o consentimento. A pessoa autentica no banco, nunca aqui. */
export const POST = comSessao(async (sessao, requisicao) => {
  const origem = new URL(requisicao.url).origin
  try {
    return ok(await iniciarConexao({ larId: sessao.larId, retornoUrl: `${origem}/api/open-finance/callback` }))
  } catch (excecao) {
    // Sem agregador contratado não existe conexão possível. Dizer isso com
    // 200 e um destino real é honesto; fingir uma URL seria mentira.
    if (excecao instanceof OpenFinanceNaoConfigurado) {
      return ok({ naoConfigurado: true, motivo: excecao.message, alternativa: "/importar" })
    }
    throw excecao
  }
})

/** Sincroniza tudo o que já está conectado. */
export const PUT = comSessao(async (sessao, requisicao) => {
  const dados = await corpo<{ conexaoId?: string }>(requisicao).catch(() => ({}) as { conexaoId?: string })
  return ok(await sincronizar({ larId: sessao.larId, conexaoId: dados.conexaoId }))
})
