import { NextResponse } from "next/server"
import { COOKIE_CONVITE, hashDoConvite, tokenDeConviteValido } from "@/lib/convites"
import { prisma } from "@/lib/prisma"
export async function GET(requisicao: Request, contexto: { params: Promise<{ token: string }> }) {
  const { token } = await contexto.params
  if (!tokenDeConviteValido(token)) return new Response("Convite inválido.", { status: 404 })
  const convite = await prisma.conviteLar.findUnique({ where: { tokenHash: hashDoConvite(token) } })
  if (!convite || convite.aceitoEm || convite.expiraEm <= new Date()) return new Response("Convite expirado.", { status: 404 })
  const resposta = NextResponse.redirect(new URL("/login", requisicao.url))
  resposta.cookies.set(COOKIE_CONVITE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 86400 })
  return resposta
}
