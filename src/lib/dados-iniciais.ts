import { headers } from "next/headers"

/**
 * Leva os dados da primeira pintura para o servidor (auditoria, achado 31).
 *
 * As telas do app buscavam tudo depois de abrir, e a primeira coisa que a
 * pessoa via era "Carregando…". Reescrever cada tela como componente de
 * servidor duplicaria a consulta de cada rota, e duas cópias da mesma regra
 * divergem. Aqui o servidor chama a PRÓPRIA rota da API, com a sessão da
 * página, e passa a resposta para a tela. Mesma consulta, mesma checagem de
 * dono, mesmo limite: só some a ida e volta do navegador.
 *
 * Só leitura (GET) e só as rotas desta lista: nada de montar endereço com
 * texto vindo de fora.
 */
const ROTAS = {
  "/api/contas": () => import("@/app/api/contas/route"),
  "/api/categorias": () => import("@/app/api/categorias/route"),
  "/api/transacoes": () => import("@/app/api/transacoes/route"),
  "/api/transacoes/dias": () => import("@/app/api/transacoes/dias/route"),
  "/api/meu-mes": () => import("@/app/api/meu-mes/route"),
  "/api/capturas": () => import("@/app/api/capturas/route"),
  "/api/loja/contas": () => import("@/app/api/loja/contas/route"),
} as const

export type RotaComDadoInicial = keyof typeof ROTAS
export type Sementes = Record<string, unknown>

export async function prepararDados(enderecos: string[]): Promise<Sementes> {
  const cabecalhos = await headers()
  const respostas = await Promise.all(
    enderecos.map(async (endereco) => {
      const caminho = endereco.split("?")[0] as RotaComDadoInicial
      const carregar = ROTAS[caminho]
      if (!carregar) throw new Error(`Rota sem dado inicial: ${caminho}`)
      try {
        const modulo = (await carregar()) as { GET: (requisicao: Request, contexto: unknown) => Promise<Response> }
        // Sem `origin` e só com o cookie: é uma leitura, e a rota confere a
        // sessão do mesmo jeito que confere a do navegador.
        const requisicao = new Request(`http://interno${endereco}`, { headers: { cookie: cabecalhos.get("cookie") ?? "" } })
        const resposta = await modulo.GET(requisicao, { params: Promise.resolve({}) })
        // Falha não quebra a página: a tela busca de novo no navegador e
        // mostra o erro dela, como fazia antes.
        return resposta.ok ? ([endereco, await resposta.json()] as const) : null
      } catch {
        return null
      }
    }),
  )
  return Object.fromEntries(respostas.filter((linha) => linha !== null))
}
