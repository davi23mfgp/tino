import { randomBytes } from "node:crypto"
import { cookies } from "next/headers"
import { SignJWT, jwtVerify } from "jose"
import type { Prisma } from "@prisma/client"

import { ErroDeUso } from "@/lib/api"
import { criarToken, gravarCookieSessao, limparCookieSessao, type Sessao } from "@/lib/auth"
import { abrirSegredo } from "@/lib/criptografia"
import { prisma } from "@/lib/prisma"
import { conferirTotp, hashRecuperacao } from "@/lib/totp"

export const COOKIE_MFA = "tino_mfa_pendente"

export function exigirLoginRecente(sessao: Sessao) {
  if (!sessao.autenticadoEm || Date.now() / 1000 - sessao.autenticadoEm > 600) {
    throw new ErroDeUso("Entre novamente antes de alterar a segurança da conta.", 401)
  }
}

export async function criarDesafioMfa(usuarioId: string, manterConectado: boolean) {
  const desafio = randomBytes(32).toString("base64url")
  const usuario = await prisma.usuario.update({ where: { id: usuarioId }, data: { mfaDesafioHash: hashRecuperacao(desafio) }, select: { mfaVersao: true } })
  const token = await new SignJWT({ usuarioId, manterConectado, versao: usuario.mfaVersao })
    .setProtectedHeader({ alg: "HS256" }).setAudience("tino:mfa").setJti(desafio)
    .setIssuedAt().setExpirationTime("5m").sign(new TextEncoder().encode(process.env.JWT_SECRET!))
  await limparCookieSessao()
  const jar = await cookies()
  jar.set(COOKIE_MFA, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 300 })
}

export async function lerDesafioMfa() {
  const token = (await cookies()).get(COOKIE_MFA)?.value
  if (!token) throw new ErroDeUso("Sua tentativa expirou. Entre novamente.", 401)
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!), { algorithms: ["HS256"], audience: "tino:mfa" })
    if (typeof payload.usuarioId !== "string" || typeof payload.jti !== "string" || typeof payload.versao !== "number") throw new Error()
    return { usuarioId: payload.usuarioId, desafioHash: hashRecuperacao(payload.jti), versao: payload.versao, manterConectado: payload.manterConectado !== false }
  } catch {
    throw new ErroDeUso("Sua tentativa expirou. Entre novamente.", 401)
  }
}

/** A trava do usuário impede usar o mesmo TOTP ou código de recuperação em paralelo. */
export async function travarUsuarioMfa(tx: Prisma.TransactionClient, usuarioId: string) {
  await tx.$queryRaw`SELECT "id" FROM "Usuario" WHERE "id" = ${usuarioId} FOR UPDATE`
  return tx.usuario.findUniqueOrThrow({ where: { id: usuarioId }, include: { membro: true } })
}

export function validarFator(usuario: { id: string; mfaSegredo: string | null; mfaUltimoPasso: number | null; mfaRecuperacao: string[] }, codigo: string) {
  if (!usuario.mfaSegredo) throw new ErroDeUso("Autenticação em dois fatores não está ativa.")
  const passo = conferirTotp(abrirSegredo(usuario.mfaSegredo, `mfa:${usuario.id}`), codigo, usuario.mfaUltimoPasso)
  if (passo !== null) return { mfaUltimoPasso: passo }
  const hash = hashRecuperacao(codigo)
  if (/^[a-f0-9]{24}$/i.test(codigo) && usuario.mfaRecuperacao.includes(hash)) {
    return { mfaRecuperacao: usuario.mfaRecuperacao.filter((item) => item !== hash) }
  }
  throw new ErroDeUso("Código inválido ou já utilizado.", 401)
}

export async function gravarSessaoComMfa(usuario: { id: string; email: string; nome: string; larId: string; membroId: string | null; mfaVersao: number; membro: { papel: string } | null }, manterConectado = true) {
  await gravarCookieSessao(await criarToken({
    usuarioId: usuario.id, email: usuario.email, nome: usuario.nome, larId: usuario.larId,
    membroId: usuario.membroId, papel: usuario.membro?.papel ?? "TITULAR",
    mfaVersao: usuario.mfaVersao, mfaConfirmadoEm: Math.floor(Date.now() / 1000),
  }), manterConectado)
}
