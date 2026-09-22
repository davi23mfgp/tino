import { cookies } from "next/headers"
import { SignJWT, jwtVerify } from "jose"
import bcrypt from "bcryptjs"
import { cache } from "react"

import { prisma } from "@/lib/prisma"

// Sem fallback: subir sem JWT_SECRET assinaria token com segredo público, e
// qualquer pessoa forjaria uma sessão. Falhar na largada é melhor que a brecha.
// Curto demais é adivinhável por força bruta offline a partir de um token
// qualquer; 32 caracteres é o piso para HS256.
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET ausente ou curto (mínimo 32 caracteres) — defina antes de iniciar.")
}
const SEGREDO = new TextEncoder().encode(process.env.JWT_SECRET)

export { COOKIE_SESSAO } from "@/lib/cookie-sessao"
import { COOKIE_SESSAO } from "@/lib/cookie-sessao"

export interface Sessao {
  usuarioId: string
  email: string
  nome: string
  larId: string
  membroId: string | null
  /// Vai no próprio token para o middleware decidir rota sem consultar banco
  /// (roda no edge). Todo usuário de verdade nasce com membro e papel — este
  /// campo só cai no default "TITULAR" num estado que a criação de conta não
  /// deveria permitir, e é o default que não tranca ninguém fora por engano.
  papel: string
}

export async function criarToken(sessao: Sessao): Promise<string> {
  return new SignJWT({ ...sessao })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(SEGREDO)
}

export async function verificarToken(token: string): Promise<(Sessao & { iat?: number }) | null> {
  try {
    const { payload } = await jwtVerify(token, SEGREDO, { algorithms: ["HS256"] })
    return payload as unknown as Sessao & { iat?: number }
  } catch {
    return null
  }
}

/**
 * Sessão da requisição, conferida no banco.
 *
 * A assinatura do token só prova que o Tino o emitiu — não que a pessoa ainda
 * tem acesso. Aqui confere que o usuário existe, continua no mesmo lar, que o
 * token é posterior a `sessoesValidasDesde` (troca de senha, remoção) e usa o
 * papel ATUAL do banco, não o gravado no token 30 dias atrás.
 *
 * `cache` faz a consulta uma vez por requisição, por mais componentes que peçam.
 */
export const getSessao = cache(async (): Promise<Sessao | null> => {
  const jar = await cookies()
  const token = jar.get(COOKIE_SESSAO)?.value
  if (!token) return null
  const doToken = await verificarToken(token)
  if (!doToken?.usuarioId) return null

  const usuario = await prisma.usuario.findUnique({
    where: { id: doToken.usuarioId },
    select: { larId: true, membroId: true, sessoesValidasDesde: true, membro: { select: { papel: true } } },
  })
  if (!usuario || usuario.larId !== doToken.larId) return null
  if (usuario.sessoesValidasDesde && (doToken.iat ?? 0) * 1000 < usuario.sessoesValidasDesde.getTime()) return null

  return {
    usuarioId: doToken.usuarioId,
    email: doToken.email,
    nome: doToken.nome,
    larId: usuario.larId,
    membroId: usuario.membroId,
    papel: usuario.membro?.papel ?? "TITULAR",
  }
})

/**
 * Derruba todas as sessões abertas do usuário.
 *
 * O `iat` do JWT tem resolução de segundo; volta 1 s para não invalidar o token
 * que a própria requisição vai emitir logo em seguida (ex.: troca de senha que
 * já loga de novo).
 */
export async function revogarSessoes(usuarioId: string) {
  await prisma.usuario.update({
    where: { id: usuarioId },
    data: { sessoesValidasDesde: new Date(Math.floor(Date.now() / 1000) * 1000 - 1000) },
  })
}

/** Sessão obrigatória. Lança quando não há — usado nas rotas autenticadas. */
export async function exigirSessao(): Promise<Sessao> {
  const sessao = await getSessao()
  if (!sessao) throw new Error("NAO_AUTENTICADO")
  return sessao
}

export async function gravarCookieSessao(token: string) {
  const jar = await cookies()
  jar.set(COOKIE_SESSAO, token, {
    httpOnly: true,
    // secure em produção só: em localhost sem HTTPS o cookie seria descartado
    // e o login "funcionaria" sem nunca autenticar.
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  })
}

export async function limparCookieSessao() {
  const jar = await cookies()
  jar.delete(COOKIE_SESSAO)
}

export async function hashSenha(senha: string): Promise<string> {
  return bcrypt.hash(senha, 12)
}

export async function conferirSenha(senha: string, hash: string): Promise<boolean> {
  return bcrypt.compare(senha, hash)
}
