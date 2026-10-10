/**
 * Um ZIP mínimo, sem compressão (método "stored"), para o pacote do contador.
 *
 * Por que à mão: o app não tem biblioteca de zip, e o pacote leva PDF, XML e
 * foto, que já vêm comprimidos: comprimir de novo pouparia quase nada. Fica em
 * ~60 linhas, com teste que abre o arquivo no `zipfile` do Python. Nomes em
 * UTF-8 (bit 11), porque "Relatório" e "João" têm acento.
 */

const TABELA_CRC = (() => {
  const tabela = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    tabela[n] = c >>> 0
  }
  return tabela
})()

export function crc32(dados: Uint8Array): number {
  let c = 0xffffffff
  for (const byte of dados) c = TABELA_CRC[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

export interface ArquivoDoZip { nome: string; conteudo: Uint8Array }

/** Nome seguro dentro do zip: sem caminho absoluto, sem `..`, com `/` como separador. */
export function nomeSeguro(nome: string): string {
  return nome.replaceAll("\\", "/").split("/").filter((parte) => parte && parte !== "." && parte !== "..").join("/") || "arquivo"
}

export function montarZip(arquivos: ArquivoDoZip[], quando = new Date()): Uint8Array {
  const partes: Uint8Array[] = []
  const central: Uint8Array[] = []
  let deslocamento = 0
  const hora = (quando.getHours() << 11) | (quando.getMinutes() << 5) | (quando.getSeconds() >> 1)
  const dia = (Math.max(0, quando.getFullYear() - 1980) << 9) | ((quando.getMonth() + 1) << 5) | quando.getDate()
  const codificador = new TextEncoder()

  for (const arquivo of arquivos) {
    const nome = codificador.encode(nomeSeguro(arquivo.nome))
    const crc = crc32(arquivo.conteudo)
    const tamanho = arquivo.conteudo.length
    const local = new DataView(new ArrayBuffer(30))
    local.setUint32(0, 0x04034b50, true)
    local.setUint16(4, 20, true)
    local.setUint16(6, 0x0800, true)
    local.setUint16(8, 0, true)
    local.setUint16(10, hora, true)
    local.setUint16(12, dia, true)
    local.setUint32(14, crc, true)
    local.setUint32(18, tamanho, true)
    local.setUint32(22, tamanho, true)
    local.setUint16(26, nome.length, true)
    local.setUint16(28, 0, true)
    partes.push(new Uint8Array(local.buffer), nome, arquivo.conteudo)

    const entrada = new DataView(new ArrayBuffer(46))
    entrada.setUint32(0, 0x02014b50, true)
    entrada.setUint16(4, 20, true)
    entrada.setUint16(6, 20, true)
    entrada.setUint16(8, 0x0800, true)
    entrada.setUint16(10, 0, true)
    entrada.setUint16(12, hora, true)
    entrada.setUint16(14, dia, true)
    entrada.setUint32(16, crc, true)
    entrada.setUint32(20, tamanho, true)
    entrada.setUint32(24, tamanho, true)
    entrada.setUint16(28, nome.length, true)
    entrada.setUint32(42, deslocamento, true)
    central.push(new Uint8Array(entrada.buffer), nome)
    deslocamento += 30 + nome.length + tamanho
  }

  const tamanhoCentral = central.reduce((soma, parte) => soma + parte.length, 0)
  const fim = new DataView(new ArrayBuffer(22))
  fim.setUint32(0, 0x06054b50, true)
  fim.setUint16(8, arquivos.length, true)
  fim.setUint16(10, arquivos.length, true)
  fim.setUint32(12, tamanhoCentral, true)
  fim.setUint32(16, deslocamento, true)

  const todas = [...partes, ...central, new Uint8Array(fim.buffer)]
  const saida = new Uint8Array(todas.reduce((soma, parte) => soma + parte.length, 0))
  let posicao = 0
  for (const parte of todas) { saida.set(parte, posicao); posicao += parte.length }
  return saida
}
