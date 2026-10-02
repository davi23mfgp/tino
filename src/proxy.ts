import { NextResponse, type NextRequest } from "next/server"
import { jwtVerify } from "jose"

import { COOKIE_SESSAO } from "@/lib/cookie-sessao"
import { rotaPermitida, type PapelDeAcesso } from "@/lib/acesso"
import { origemPermitida } from "@/lib/origem-segura"
import { politicaDeConteudo } from "@/lib/politica-conteudo"

/**
 * Barra o funcionário da loja fora de tela pessoal, por URL — não só por menu.
 *
 * Fica no proxy (era `middleware.ts` até o Next 15; renomeado no Next 16),
 * porque só ele sabe o caminho da requisição antes da página ou da rota
 * rodar. Verifica o JWT direto aqui, sem passar por `getSessao` — que usa
 * `next/headers` e é feito para Server Component, não para este arquivo —
 * mas com a mesma chave e a mesma lib `jose` já usada em `src/lib/auth.ts`.
 *
 * Sem sessão ou token inválido, deixa passar: quem decide mandar para o login
 * é o layout e `sessaoDaPagina`, que já fazem isso hoje. Duplicar o redirect
 * aqui só arriscaria os dois discordarem no dia em que um dos dois mudar.
 */
export async function proxy(requisicao: NextRequest) {
  const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))))
  const politica = politicaDeConteudo(nonce, process.env.NODE_ENV !== "production")
  const cabecalhos = new Headers(requisicao.headers)
  cabecalhos.set("x-nonce", nonce)
  cabecalhos.set("x-caminho", requisicao.nextUrl.pathname)
  cabecalhos.set("Content-Security-Policy", politica)
  const resposta = await decidirAcesso(requisicao, cabecalhos)
  resposta.headers.set("Content-Security-Policy", politica)
  // Uma resposta HTML não pode reutilizar o nonce da requisição anterior.
  if (!requisicao.nextUrl.pathname.startsWith("/api/")) resposta.headers.set("Cache-Control", "private, no-store")
  return resposta
}

async function decidirAcesso(requisicao: NextRequest, cabecalhos: Headers) {
  const continuar = () => NextResponse.next({ request: { headers: cabecalhos } })
  if (requisicao.nextUrl.pathname.startsWith("/api/") && !origemPermitida(requisicao)) {
    return NextResponse.json({ erro: "Origem da requisição não permitida." }, { status: 403 })
  }
  const token = requisicao.cookies.get(COOKIE_SESSAO)?.value
  if (!token) return continuar()

  const segredo = process.env.JWT_SECRET
  if (!segredo) return continuar()

  let papel: PapelDeAcesso
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(segredo), { algorithms: ["HS256"] })
    papel = (payload.papel as PapelDeAcesso) ?? "TITULAR"
  } catch {
    return continuar()
  }

  const caminho = requisicao.nextUrl.pathname

  // Quem já entrou não vê a vitrine. Este desvio morava no layout da vitrine,
  // e ler a sessão lá tornava a página inteira dinâmica: o Next não pode
  // guardar em cache uma página que decide pelo cookie. Aqui o cookie já foi
  // lido de qualquer jeito, e a vitrine volta a ser servida do cache.
  if (caminho === "/") return NextResponse.redirect(new URL("/painel", requisicao.url))

  if (rotaPermitida(papel, caminho)) return continuar()

  if (caminho.startsWith("/api/")) {
    return NextResponse.json({ erro: "Este login só acessa a loja." }, { status: 403 })
  }
  return NextResponse.redirect(new URL("/loja", requisicao.url))
}

export const config = {
  // Tudo, menos os arquivos estáticos do Next e o favicon — passar por eles
  // não muda decisão nenhuma e só custaria latência em toda troca de página.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json|icons/).*)"],
}
