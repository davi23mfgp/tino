import { randomBytes } from "node:crypto"
import { NextResponse } from "next/server"

import { configuracaoGoogle } from "@/lib/google-login"

export async function GET(requisicao: Request) {
  const configuracao = configuracaoGoogle()
  if (!configuracao) return NextResponse.redirect(new URL("/login?erro=google-indisponivel", requisicao.url))

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
  const opcoes = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/api/auth/google", maxAge: 600 }
  resposta.cookies.set("google_estado", estado, opcoes)
  resposta.cookies.set("google_nonce", nonce, opcoes)
  resposta.cookies.set("google_manter", new URL(requisicao.url).searchParams.get("manter") === "0" ? "0" : "1", opcoes)
  return resposta
}
