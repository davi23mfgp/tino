/**
 * Pix "copia e cola" e QR estático (BR Code), pela regra do Banco Central:
 * Manual de Padrões para Iniciação do Pix, padrão EMV QRCPS-MPM. Item 2.3 do
 * plano, estudo em `docs/pesquisas/2026-10-07-pix-rodape-motivos-indicacao.md`.
 *
 * O código é determinístico: chave, valor, nome e cidade viram sempre o mesmo
 * texto, sem banco, sem taxa e sem internet. O que o Tino NÃO faz é ver o
 * dinheiro cair: sem integração com banco, quem confirma o pagamento é a
 * loja (regra 5).
 */

export type TipoDeChave = "email" | "telefone" | "cpf" | "cnpj" | "aleatoria"

/** Reconhece a chave e devolve no formato que o Pix espera, ou null. */
export function normalizarChavePix(texto: string): { tipo: TipoDeChave; chave: string } | null {
  const bruto = texto.trim()
  if (!bruto) return null
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bruto) && bruto.length <= 77) return { tipo: "email", chave: bruto.toLowerCase() }
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bruto)) return { tipo: "aleatoria", chave: bruto.toLowerCase() }
  const digitos = bruto.replace(/\D/g, "")
  // Telefone: com +55 escrito, ou 10 a 11 dígitos começando por DDD válido (não começa com 0).
  if (bruto.startsWith("+")) return digitos.length >= 12 && digitos.length <= 13 ? { tipo: "telefone", chave: `+${digitos}` } : null
  if (digitos.length === 14) return { tipo: "cnpj", chave: digitos }
  if (digitos.length === 11 && cpfValido(digitos)) return { tipo: "cpf", chave: digitos }
  if ((digitos.length === 10 || digitos.length === 11) && digitos[0] !== "0") return { tipo: "telefone", chave: `+55${digitos}` }
  return null
}

function cpfValido(cpf: string): boolean {
  if (/^(\d)\1{10}$/.test(cpf)) return false
  const digito = (tamanho: number) => {
    const soma = cpf.slice(0, tamanho).split("").reduce((total, d, i) => total + Number(d) * (tamanho + 1 - i), 0)
    const resto = (soma * 10) % 11
    return resto === 10 ? 0 : resto
  }
  return digito(9) === Number(cpf[9]) && digito(10) === Number(cpf[10])
}

/** Sem acento e só o que o padrão aceita; o banco do cliente mostra este nome. */
function textoDoPix(texto: string, maximo: number): string {
  return texto.normalize("NFD").replace(/\p{M}/gu, "").replace(/[^A-Za-z0-9 .,-]/g, "").replace(/\s+/g, " ").trim().slice(0, maximo)
}

const campo = (id: string, valor: string) => `${id}${String(valor.length).padStart(2, "0")}${valor}`

/** CRC16-CCITT (polinômio 0x1021, início 0xFFFF), como o manual pede no campo 63. */
export function crc16(texto: string): string {
  let crc = 0xffff
  for (const byte of new TextEncoder().encode(texto)) {
    crc ^= byte << 8
    for (let bit = 0; bit < 8; bit += 1) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
  }
  return crc.toString(16).toUpperCase().padStart(4, "0")
}

export function brCodePix(dados: { chave: string; nome: string; cidade: string; valorCentavos?: number | null; identificador?: string | null }): string {
  const conta = campo("00", "br.gov.bcb.pix") + campo("01", dados.chave)
  // Identificador: até 25 letras e números; sem ele, o padrão manda "***".
  const identificador = (dados.identificador ?? "").replace(/[^A-Za-z0-9]/g, "").slice(0, 25) || "***"
  const corpo =
    campo("00", "01") +
    campo("26", conta) +
    campo("52", "0000") +
    campo("53", "986") +
    (dados.valorCentavos && dados.valorCentavos > 0 ? campo("54", `${Math.floor(dados.valorCentavos / 100)}.${String(dados.valorCentavos % 100).padStart(2, "0")}`) : "") +
    campo("58", "BR") +
    campo("59", textoDoPix(dados.nome, 25) || "Recebedor") +
    campo("60", textoDoPix(dados.cidade, 15) || "Brasil") +
    campo("62", campo("05", identificador)) +
    "6304"
  return corpo + crc16(corpo)
}
