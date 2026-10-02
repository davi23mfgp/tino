import { randomBytes } from "node:crypto"
import { NextResponse } from "next/server"

import { configuracaoGoogle } from "@/lib/google-login"

export async function GET(requisicao: Request) {
  const modoMei = new URL(requisicao.url).searchParams.get("produto") === "mei"
  const configuracao = configuracaoGoogle()
  if (!configuracao) return NextResponse.redirect(new URL(modoMei ? "/login/mei?erro=google-indisponivel" : "/login?erro=google-indisponivel", requisicao.url))

  // Cookies de segurança precisam nascer no mesmo domínio do retorno. Entrar
  // por um alias e voltar ao domínio configurado perdia a primeira tentativa.
  const origemRetorno = new URL(configuracao.retorno).origin
  if (new URL(requisicao.url).origin !== origemRetorno) {
    const inicio = new URL("/api/auth/google", origemRetorno)
    inicio.search = new URL(requisicao.url).search
    const resposta = NextResponse.redirect(inicio)
    resposta.headers.set("Cache-Control", "no-store")
    return resposta
  }

  const estado = randomBytes(32).toString("base64url")
  const nonce = randomBytes(32).toString("base64url")
  const destino = new URL("https://accounts.google.com/o/oauth2/v2/auth")
  destino.search = new URLSearchParams({
    client_id: configuracao.clienteId,
    redirect_uri: configuracao.retorno,
    response_type: "code",
    scope: "openid email profile",
    state: estado,
    nonce,
  }).toString()

  const resposta = NextResponse.redirect(destino)
  resposta.headers.set("Cache-Control", "no-store")
  const opcoes = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/api/auth/google", maxAge: 600 }
  resposta.cookies.set("google_estado", estado, opcoes)
  resposta.cookies.set("google_nonce", nonce, opcoes)
  resposta.cookies.set("google_produto", modoMei ? "mei" : "pessoal", opcoes)
  resposta.cookies.set("google_manter", new URL(requisicao.url).searchParams.get("manter") === "0" ? "0" : "1", opcoes)
  return resposta
}
