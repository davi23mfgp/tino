import { createRemoteJWKSet, jwtVerify, SignJWT } from "jose"

const chavesGoogle = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"))

/**
 * Se o login pelo Google pode se ligar sozinho a uma conta que já existe com
 * o mesmo e-mail.
 *
 * Só caixa Gmail: o Google administra o endereço, então quem entra com ele é
 * o dono. E-mail de outro domínio pode trocar de dono.
 *
 * **Nunca numa conta de admin** (06/10/2026). A conta `admin.tino@gmail.com`
 * nasceu no build, com senha, num endereço Gmail que ninguém tinha criado.
 * Quem criasse esse Gmail entraria pelo Google e ganharia o painel que vê a
 * conta de todo mundo. O admin entra com a senha; ligar o Google a ele exige
 * fazer isso já logado, nunca por correspondência de e-mail.
 */
export function podeLigarGoogleSozinho(email: string, conta: { googleId: string | null; admin: boolean }) {
  return email.toLowerCase().endsWith("@gmail.com") && !conta.googleId && !conta.admin
}

export function configuracaoGoogle() {
  const clienteId = process.env.GOOGLE_CLIENT_ID
  const clienteSegredo = process.env.GOOGLE_CLIENT_SECRET
  const retorno = process.env.GOOGLE_REDIRECT_URI
  if (!clienteId || !clienteSegredo || !retorno) return null
  let endereco: URL
  try { endereco = new URL(retorno) } catch { return null }
  if (endereco.pathname !== "/api/auth/google/retorno") return null
  if (endereco.protocol !== "https:" && endereco.hostname !== "localhost") return null
  return { clienteId, clienteSegredo, retorno: endereco.toString() }
}

export async function verificarIdentidadeGoogle(token: string, clienteId: string, nonce: string) {
  const { payload } = await jwtVerify(token, chavesGoogle, {
    algorithms: ["RS256"],
    audience: clienteId,
    issuer: ["https://accounts.google.com", "accounts.google.com"],
  })
  if (payload.nonce !== nonce || !payload.sub || payload.email_verified !== true || typeof payload.email !== "string") {
    throw new Error("Identidade Google incompleta ou não verificada.")
  }
  return { googleId: payload.sub, email: payload.email.trim().toLowerCase(), nome: typeof payload.name === "string" ? payload.name.trim().slice(0, 80) : "" }
}

export const COOKIE_CADASTRO_GOOGLE = "google_cadastro"

function segredoCadastro() {
  const segredo = process.env.JWT_SECRET
  if (!segredo || segredo.length < 32) throw new Error("JWT_SECRET ausente ou curto.")
  return new TextEncoder().encode(segredo)
}

export async function criarCadastroGoogle(dados: { googleId: string; email: string; nome: string; modoMei?: boolean }) {
  return new SignJWT({ ...dados })
    .setProtectedHeader({ alg: "HS256" })
    .setAudience("google-cadastro")
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(segredoCadastro())
}

export async function lerCadastroGoogle(token: string | undefined) {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, segredoCadastro(), { algorithms: ["HS256"], audience: "google-cadastro" })
    if (typeof payload.googleId !== "string" || typeof payload.email !== "string" || typeof payload.nome !== "string") return null
    return { googleId: payload.googleId, email: payload.email, nome: payload.nome, modoMei: payload.modoMei === true }
  } catch { return null }
}
