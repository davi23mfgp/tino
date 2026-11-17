/**
 * Regras do arquivo que chega pelo "Compartilhar" do celular. Puro, para o
 * teste conferir sem banco.
 */
export const TAMANHO_MAXIMO_COMPARTILHADO = 10 * 1024 * 1024
export const VALIDADE_DO_COMPARTILHADO_MS = 60 * 60 * 1000

const EXTENSOES = ["pdf", "csv", "ofx"]

/** Só o que a tela de importar sabe ler: PDF, CSV e OFX, pelo nome do arquivo. */
export function arquivoAceito(nome: string, tamanho: number): boolean {
  const extensao = nome.toLowerCase().split(".").pop() ?? ""
  return EXTENSOES.includes(extensao) && tamanho > 0 && tamanho <= TAMANHO_MAXIMO_COMPARTILHADO
}

/** Nome sem caminho e sem caractere de controle: vai para um cabeçalho HTTP. */
export function nomeSeguro(nome: string): string {
  return (nome.split(/[\\/]/).pop() ?? "arquivo").replace(/[^\w.\- ()À-ÿ]/g, "_").slice(0, 120) || "arquivo"
}

export function compartilhadoVencido(criadoEm: Date, agora: Date): boolean {
  return agora.getTime() - criadoEm.getTime() > VALIDADE_DO_COMPARTILHADO_MS
}
