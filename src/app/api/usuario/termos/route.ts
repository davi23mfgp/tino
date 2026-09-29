import { comSessao, ok } from "@/lib/api"
import { prisma } from "@/lib/prisma"
import { VERSAO_TERMOS } from "@/lib/termos"

/** "Entendi" no aviso de mudança: grava que a pessoa viu a versão vigente. */
export const POST = comSessao(async (sessao) => {
  await prisma.usuario.update({ where: { id: sessao.usuarioId }, data: { termosVersao: VERSAO_TERMOS, termosAceitosEm: new Date() } })
  return ok({ versao: VERSAO_TERMOS })
})
