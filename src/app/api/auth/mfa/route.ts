import { cookies } from "next/headers"
import { corpo, erro, ErroDeUso, ok } from "@/lib/api"
import { consumirLimite, ipDaRequisicao, liberarLimite, REGRAS } from "@/lib/limite"
import { COOKIE_MFA, gravarSessaoComMfa, lerDesafioMfa, travarUsuarioMfa, validarFator } from "@/lib/mfa"
import { origemPermitida } from "@/lib/origem-segura"
import { prisma } from "@/lib/prisma"
import { registrarAcesso } from "@/lib/registro-acesso"
import { campo, validar, z } from "@/lib/validar"

export async function POST(requisicao: Request) {
  if (!origemPermitida(requisicao)) return erro("Origem da requisição não permitida.", 403)
  try {
    await consumirLimite(`mfa:ip:${ipDaRequisicao(requisicao)}`, REGRAS.login)
    const desafio = await lerDesafioMfa()
    await consumirLimite(`mfa:${desafio.usuarioId}`, REGRAS.login)
    const { codigo } = validar(z.object({ codigo: campo.textoObrigatorio(32) }), await corpo(requisicao))
    const usuario = await prisma.$transaction(async (tx) => {
      const atual = await travarUsuarioMfa(tx, desafio.usuarioId)
      if (atual.mfaDesafioHash !== desafio.desafioHash || atual.mfaVersao !== desafio.versao) throw new ErroDeUso("Sua tentativa expirou. Entre novamente.", 401)
      return tx.usuario.update({ where: { id: atual.id }, data: { ...validarFator(atual, codigo), mfaDesafioHash: null, ultimoLogin: new Date() }, include: { membro: true } })
    })
    await gravarSessaoComMfa(usuario, desafio.manterConectado)
    ;(await cookies()).delete(COOKIE_MFA)
    await registrarAcesso(requisicao, usuario.id, "LOGIN")
    await liberarLimite(`login:${usuario.email}`)
    await liberarLimite(`login:ip:${ipDaRequisicao(requisicao)}`)
    return ok({ confirmado: true })
  } catch (excecao) {
    if (excecao instanceof ErroDeUso) return erro(excecao.message, excecao.status)
    console.error("[tino] falha ao confirmar MFA")
    return erro("Não foi possível confirmar o acesso.", 500)
  }
}
