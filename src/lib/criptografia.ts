import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto"

/** Protege segredos de MFA no banco. Esta chave do servidor NÃO é um cofre de ponta a ponta. */
function chaveDoAmbiente(): Buffer {
  const texto = process.env.MFA_CHAVE_CRIPTOGRAFIA ?? ""
  if (!/^[a-fA-F0-9]{64}$/.test(texto)) throw new Error("MFA_CHAVE_CRIPTOGRAFIA deve conter 32 bytes em hexadecimal.")
  return Buffer.from(texto, "hex")
}

export function cifrarSegredo(texto: string, contexto: string, chave = chaveDoAmbiente()): string {
  const nonce = randomBytes(12)
  const cifra = createCipheriv("aes-256-gcm", chave, nonce)
  cifra.setAAD(Buffer.from(contexto))
  const conteudo = Buffer.concat([cifra.update(texto, "utf8"), cifra.final()])
  return ["v1", nonce.toString("base64url"), cifra.getAuthTag().toString("base64url"), conteudo.toString("base64url")].join(".")
}

export function abrirSegredo(texto: string, contexto: string, chave = chaveDoAmbiente()): string {
  const partes = texto.split(".")
  if (partes.length !== 4 || partes[0] !== "v1") throw new Error("Segredo cifrado inválido.")
  const [, nonce, tag, conteudo] = partes.map((parte) => Buffer.from(parte, "base64url"))
  if (nonce.length !== 12 || tag.length !== 16) throw new Error("Segredo cifrado inválido.")
  const cifra = createDecipheriv("aes-256-gcm", chave, nonce)
  cifra.setAAD(Buffer.from(contexto))
  cifra.setAuthTag(tag)
  return Buffer.concat([cifra.update(conteudo), cifra.final()]).toString("utf8")
}
