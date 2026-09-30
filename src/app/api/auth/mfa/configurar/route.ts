import { comSessao, corpo, ErroDeUso, ok } from "@/lib/api"
import { abrirSegredo, cifrarSegredo } from "@/lib/criptografia"
import { exigirLoginRecente, gravarSessaoComMfa, travarUsuarioMfa, validarFator } from "@/lib/mfa"
import { consumirLimite, REGRAS } from "@/lib/limite"
import { prisma } from "@/lib/prisma"
import { conferirTotp, criarCodigosRecuperacao, criarSegredoTotp, hashRecuperacao } from "@/lib/totp"
import { validar, z } from "@/lib/validar"

export const GET = comSessao(async (sessao) => {
  const usuario = await prisma.usuario.findUniqueOrThrow({ where: { id: sessao.usuarioId }, select: { mfaSegredo: true, mfaRecuperacao: true, admin: true } })
  return ok({ ativo: !!usuario.mfaSegredo, obrigatorio: usuario.admin, codigosRestantes: usuario.mfaRecuperacao.length })
})

export const POST = comSessao(async (sessao, requisicao) => {
  exigirLoginRecente(sessao)
  await consumirLimite(`mfa-configurar:${sessao.usuarioId}`, REGRAS.login)
  const dados = validar(z.discriminatedUnion("acao", [
    z.object({ acao: z.literal("preparar") }),
    z.object({ acao: z.literal("ativar"), codigo: z.string().trim().regex(/^\d{6}$/) }),
    z.object({ acao: z.literal("desativar"), codigo: z.string().trim().min(6).max(32) }),
    z.object({ acao: z.literal("recuperacao"), codigo: z.string().trim().min(6).max(32) }),
  ]), await corpo(requisicao))

  if (dados.acao === "preparar") {
    const segredo = criarSegredoTotp()
    await prisma.$transaction(async (tx) => {
      const usuario = await travarUsuarioMfa(tx, sessao.usuarioId)
      if (usuario.mfaSegredo) throw new ErroDeUso("A proteção já está ativa.")
      await tx.usuario.update({ where: { id: usuario.id }, data: { mfaPendente: cifrarSegredo(segredo, `mfa:${usuario.id}`), mfaPendenteExpiraEm: new Date(Date.now() + 600_000) } })
    })
    return ok({ segredo, uri: `otpauth://totp/${encodeURIComponent(`Tino:${sessao.email}`)}?secret=${segredo}&issuer=Tino&algorithm=SHA1&digits=6&period=30` })
  }

  const resultado = await prisma.$transaction(async (tx) => {
    const usuario = await travarUsuarioMfa(tx, sessao.usuarioId)
    if (dados.acao === "ativar") {
      if (usuario.mfaSegredo || !usuario.mfaPendente || !usuario.mfaPendenteExpiraEm || usuario.mfaPendenteExpiraEm.getTime() <= Date.now()) throw new ErroDeUso("A configuração expirou. Comece novamente.")
      const passo = conferirTotp(abrirSegredo(usuario.mfaPendente, `mfa:${usuario.id}`), dados.codigo, null)
      if (passo === null) throw new ErroDeUso("Código inválido.", 401)
      const codigos = criarCodigosRecuperacao()
      const atualizado = await tx.usuario.update({ where: { id: usuario.id }, data: { mfaSegredo: usuario.mfaPendente, mfaPendente: null, mfaPendenteExpiraEm: null, mfaUltimoPasso: passo, mfaRecuperacao: codigos.map(hashRecuperacao), mfaVersao: { increment: 1 }, mfaDesafioHash: null }, include: { membro: true } })
      return { usuario: atualizado, codigos, ativo: true }
    }
    const fator = validarFator(usuario, dados.codigo)
    if (dados.acao === "desativar") {
      if (usuario.admin) throw new ErroDeUso("Administradores precisam manter a autenticação em dois fatores.", 403)
      const atualizado = await tx.usuario.update({ where: { id: usuario.id }, data: { mfaSegredo: null, mfaUltimoPasso: null, mfaRecuperacao: [], mfaVersao: { increment: 1 }, mfaDesafioHash: null }, include: { membro: true } })
      return { usuario: atualizado, codigos: [], ativo: false }
    }
    const codigos = criarCodigosRecuperacao()
    const atualizado = await tx.usuario.update({ where: { id: usuario.id }, data: { ...fator, mfaRecuperacao: codigos.map(hashRecuperacao), mfaVersao: { increment: 1 }, mfaDesafioHash: null }, include: { membro: true } })
    return { usuario: atualizado, codigos, ativo: true }
  })
  // Reemite somente a sessão que concluiu a mudança; as demais versões caem.
  if (resultado.ativo) await gravarSessaoComMfa(resultado.usuario)
  else {
    const { criarToken, gravarCookieSessao } = await import("@/lib/auth")
    await gravarCookieSessao(await criarToken({ ...sessao, mfaVersao: resultado.usuario.mfaVersao, mfaConfirmadoEm: undefined }))
  }
  return ok({ ativo: resultado.ativo, codigos: resultado.codigos })
})
