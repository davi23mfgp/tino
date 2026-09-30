import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto"

const ALFABETO = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"

export function codificarBase32(bytes: Uint8Array): string {
  let acumulador = 0, bits = 0, texto = ""
  for (const byte of bytes) {
    acumulador = (acumulador << 8) | byte
    bits += 8
    while (bits >= 5) { bits -= 5; texto += ALFABETO[(acumulador >>> bits) & 31] }
  }
  if (bits) texto += ALFABETO[(acumulador << (5 - bits)) & 31]
  return texto
}

function decodificarBase32(texto: string): Buffer {
  let acumulador = 0, bits = 0
  const bytes: number[] = []
  for (const letra of texto) {
    const valor = ALFABETO.indexOf(letra)
    if (valor < 0) throw new Error("Chave do autenticador inválida.")
    acumulador = (acumulador << 5) | valor
    bits += 5
    if (bits >= 8) { bits -= 8; bytes.push((acumulador >>> bits) & 255) }
  }
  return Buffer.from(bytes)
}

export const criarSegredoTotp = () => codificarBase32(randomBytes(20))

/** RFC 6238: SHA-1, passo de 30 segundos, seis dígitos compatíveis com autenticadores. */
export function codigoTotp(segredo: string, passo: number, digitos = 6): string {
  const contador = Buffer.alloc(8)
  contador.writeBigUInt64BE(BigInt(passo))
  const hash = createHmac("sha1", decodificarBase32(segredo)).update(contador).digest()
  const deslocamento = hash[hash.length - 1] & 15
  return ((hash.readUInt32BE(deslocamento) & 0x7fffffff) % 10 ** digitos).toString().padStart(digitos, "0")
}

export function conferirTotp(segredo: string, codigo: string, ultimoPasso: number | null, agora = Date.now()): number | null {
  if (!/^\d{6}$/.test(codigo)) return null
  const passo = Math.floor(agora / 30_000)
  for (const candidato of [passo, passo - 1, passo + 1]) {
    if (candidato < 0 || (ultimoPasso !== null && candidato <= ultimoPasso)) continue
    if (timingSafeEqual(Buffer.from(codigoTotp(segredo, candidato)), Buffer.from(codigo))) return candidato
  }
  return null
}

export const hashRecuperacao = (codigo: string) => createHash("sha256").update(codigo.trim().toLowerCase()).digest("hex")
export const criarCodigosRecuperacao = () => Array.from({ length: 8 }, () => randomBytes(12).toString("hex"))
