import { cookies } from "next/headers"
import { comSessao, corpo, ok } from "@/lib/api"
import { validar, z } from "@/lib/validar"
import { aceitarConvite, COOKIE_CONVITE } from "@/lib/convites"
import { criarToken, gravarCookieSessao } from "@/lib/auth"

export const POST = comSessao(async (sessao, requisicao) => {
  const { token } = validar(z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/) }).strict(), await corpo(requisicao))
  const destino = await aceitarConvite(sessao, token)
  await gravarCookieSessao(await criarToken({ ...sessao, ...destino }))
  ;(await cookies()).delete(COOKIE_CONVITE)
  return ok({ aceito: true })
})
export const DELETE = comSessao(async () => {
  ;(await cookies()).delete(COOKIE_CONVITE)
  return ok({ cancelado: true })
})
