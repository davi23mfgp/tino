/** Linhas por página do Extrato. */
export const TAMANHO_PAGINA_EXTRATO = 25

/**
 * Endereço da primeira página do Extrato. Fica fora de `extrato.tsx` porque o
 * servidor (`page.tsx`) e a tela precisam do mesmo texto, e função de arquivo
 * "use client" não pode ser chamada no servidor.
 */
export function enderecoInicial(competencia: string) {
  return `/api/transacoes?${new URLSearchParams({ competencia, limite: String(TAMANHO_PAGINA_EXTRATO) })}`
}
