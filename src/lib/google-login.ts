import { createRemoteJWKSet, jwtVerify } from "jose"

const chavesGoogle = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"))

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
  return { googleId: payload.sub, email: payload.email.trim().toLowerCase() }
}
