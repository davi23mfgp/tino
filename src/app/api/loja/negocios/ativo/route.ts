import { cookies } from "next/headers"

import { prisma } from "@/lib/prisma"
import { comSessao, corpo, ErroDeUso, ok } from "@/lib/api"
import { COOKIE_NEGOCIO } from "@/lib/loja/dados"
import { campo, validar, z } from "@/lib/validar"

/** Troca o negócio aberto. Só aceita negócio do próprio lar: o id vem do navegador. */
export const PUT = comSessao(async (sessao, requisicao) => {
  const { lojaId } = validar(z.object({ lojaId: campo.textoObrigatorio(40) }), await corpo(requisicao))
  const loja = await prisma.loja.findFirst({ where: { id: lojaId, larId: sessao.larId }, select: { id: true } })
  if (!loja) throw new ErroDeUso("Negócio não encontrado.", 404)
  ;(await cookies()).set(COOKIE_NEGOCIO, loja.id, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 })
  return ok({ id: loja.id })
})
