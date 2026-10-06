import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { criarToken, gravarCookieSessao } from "@/lib/auth"
import { COOKIE_CADASTRO_GOOGLE, configuracaoGoogle, criarCadastroGoogle, podeLigarGoogleSozinho, verificarIdentidadeGoogle } from "@/lib/google-login"
import { prisma } from "@/lib/prisma"
import { registrarAcesso } from "@/lib/registro-acesso"
import { criarDesafioMfa } from "@/lib/mfa"

function voltar(requisicao: Request, motivo: string, modoMei = false) {
  return NextResponse.redirect(new URL(`${modoMei ? "/login/mei" : "/login"}?erro=${motivo}`, requisicao.url))
}

export async function GET(requisicao: Request) {
  const parametros = new URL(requisicao.url).searchParams
  const jar = await cookies()
  const estado = jar.get("google_estado")?.value
  const nonce = jar.get("google_nonce")?.value
  const modoMei = jar.get("google_produto")?.value === "mei"
  jar.delete("google_produto")
  const manterConectado = jar.get("google_manter")?.value !== "0"
  jar.delete("google_estado")
  jar.delete("google_nonce")
  jar.delete("google_manter")

  if (parametros.has("error")) return voltar(requisicao, "google-cancelado", modoMei)
  if (!estado || !nonce || parametros.get("state") !== estado || !parametros.get("code")) {
    return voltar(requisicao, "google-expirado", modoMei)
  }
  const configuracao = configuracaoGoogle()
  if (!configuracao) return voltar(requisicao, "google-indisponivel", modoMei)

  try {
    const troca = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: configuracao.clienteId,
        client_secret: configuracao.clienteSegredo,
        code: parametros.get("code")!,
        grant_type: "authorization_code",
        redirect_uri: configuracao.retorno,
      }),
      cache: "no-store",
    })
    if (!troca.ok) return voltar(requisicao, "google-falhou", modoMei)
    const dados: { id_token?: string } = await troca.json()
    if (!dados.id_token) return voltar(requisicao, "google-falhou", modoMei)
    const identidade = await verificarIdentidadeGoogle(dados.id_token, configuracao.clienteId, nonce)

    let usuario = await prisma.usuario.findUnique({ where: { googleId: identidade.googleId }, include: { membro: true } })
    if (!usuario) {
      usuario = await prisma.usuario.findUnique({ where: { email: identidade.email }, include: { membro: true } })
      if (!usuario) {
        const resposta = NextResponse.redirect(new URL("/cadastro/google", requisicao.url))
        resposta.cookies.set(COOKIE_CADASTRO_GOOGLE, await criarCadastroGoogle({ ...identidade, modoMei }), {
          httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 900,
        })
        return resposta
      }
      // Só Gmail, e nunca conta de admin: as razões estão em podeLigarGoogleSozinho.
      if (!podeLigarGoogleSozinho(identidade.email, usuario)) {
        return voltar(requisicao, "google-vinculo", modoMei)
      }
      usuario = await prisma.usuario.update({
        where: { id: usuario.id }, data: { googleId: identidade.googleId }, include: { membro: true },
      })
    }

    // Admin só entra pela porta dele, com senha e código (06/10/2026).
    if (usuario.admin) return voltar(requisicao, "google-falhou", modoMei)

    const produto = modoMei ? "mei" : "pessoal"
    if (modoMei && !(await prisma.meiPerfil.findUnique({ where: { larId: usuario.larId }, select: { id: true } }))) {
      return voltar(requisicao, "sem-mei", true)
    }

    if (usuario.mfaSegredo) {
      await criarDesafioMfa(usuario.id, manterConectado, produto)
      return NextResponse.redirect(new URL(modoMei ? "/login/mei/mfa" : "/login/mfa", requisicao.url))
    }
    await prisma.usuario.update({ where: { id: usuario.id }, data: { ultimoLogin: new Date() } })
    await registrarAcesso(requisicao, usuario.id, "LOGIN")
    await gravarCookieSessao(await criarToken({
      usuarioId: usuario.id, email: usuario.email, nome: usuario.nome,
      larId: usuario.larId, membroId: usuario.membroId, papel: usuario.membro?.papel ?? "TITULAR",
      mfaVersao: usuario.mfaVersao, produto,
    }), manterConectado)
    return NextResponse.redirect(new URL(modoMei ? "/loja" : "/painel", requisicao.url))
  } catch {
    return voltar(requisicao, "google-falhou", modoMei)
  }
}
