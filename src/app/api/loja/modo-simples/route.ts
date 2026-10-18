import { prisma } from "@/lib/prisma"
import { comSessao, corpo, ok } from "@/lib/api"
import { campo, validar, z } from "@/lib/validar"

export const dynamic = "force-dynamic"

const SELECAO = { modoSimples: true, ajudaNome: true, ajudaTelefone: true } as const

/** Modo simples da conta e o contato do "Pedir ajuda" (passo 50, opção A). */
export const GET = comSessao(async (sessao) => {
  const usuario = await prisma.usuario.findUnique({ where: { id: sessao.usuarioId }, select: SELECAO })
  return ok({ ligado: usuario?.modoSimples ?? false, ajudaNome: usuario?.ajudaNome ?? null, ajudaTelefone: usuario?.ajudaTelefone ?? null })
})

/**
 * O telefone guarda só os dígitos, com DDD (10 ou 11): é o que o link do
 * WhatsApp precisa, e telefone pela metade abriria a conversa com ninguém.
 */
export const PUT = comSessao(async (sessao, requisicao) => {
  const dados = validar(
    z.object({
      ligado: z.boolean().optional(),
      ajudaNome: campo.texto(60).optional(),
      ajudaTelefone: z.string().trim().max(30).transform((texto) => texto.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, ""))
        .refine((digitos) => digitos === "" || /^\d{10,11}$/.test(digitos), "telefone com DDD").optional(),
    }),
    await corpo(requisicao),
  )
  const usuario = await prisma.usuario.update({
    where: { id: sessao.usuarioId },
    data: {
      ...(dados.ligado !== undefined ? { modoSimples: dados.ligado } : {}),
      ...(dados.ajudaNome !== undefined ? { ajudaNome: dados.ajudaNome || null } : {}),
      ...(dados.ajudaTelefone !== undefined ? { ajudaTelefone: dados.ajudaTelefone || null } : {}),
    },
    select: SELECAO,
  })
  return ok({ ligado: usuario.modoSimples, ajudaNome: usuario.ajudaNome, ajudaTelefone: usuario.ajudaTelefone })
})
