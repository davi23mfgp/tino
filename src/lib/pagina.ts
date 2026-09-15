import { redirect } from "next/navigation"

import { getSessao, type Sessao } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/**
 * Sessão para telas do app.
 *
 * Além de exigir o login, confere que o lar ainda existe. O token continua
 * válido por 30 dias mesmo se a conta for apagada em outro aparelho ou o banco
 * for recriado — e, sem esta conferência, cada tela quebrava com erro de
 * servidor ("No Lar found") em vez de pedir login de novo.
 *
 * A checagem fica aqui, e não no layout, porque o Next renderiza layout e
 * página em paralelo: o redirecionamento do layout não impede a página de
 * consultar o banco antes.
 *
 * O cookie não é apagado neste ponto — Server Component não pode escrever
 * cookie. Entrar de novo sobrescreve o token velho, que é o efeito desejado.
 */
export async function sessaoDaPagina(): Promise<Sessao> {
  const sessao = await getSessao()
  if (!sessao) redirect("/login")

  const lar = await prisma.lar.findUnique({ where: { id: sessao.larId }, select: { id: true } })
  if (!lar) redirect("/login?sessao=invalida")

  return sessao
}

