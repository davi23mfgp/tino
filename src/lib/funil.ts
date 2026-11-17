import type { EtapaFunil } from "@prisma/client"

/**
 * Medição própria do funil (auditoria, achado 14: não dava para saber se o
 * site converte). Este arquivo é puro: a conta do funil é testada sem banco.
 */

export const ORDEM_DO_FUNIL: EtapaFunil[] = ["VISITA", "CLIQUE_COMECAR", "CADASTRO_INICIADO", "CADASTRO_CRIADO", "ROTEIRO_TERMINADO", "ASSINATURA_PAGA"]

/** Só estas chegam pela rota pública. As outras o servidor grava sozinho. */
export const ETAPAS_ANONIMAS: EtapaFunil[] = ["VISITA", "CLIQUE_COMECAR", "CADASTRO_INICIADO"]

export const NOME_DA_ETAPA: Record<EtapaFunil, string> = {
  VISITA: "Visitou o site",
  CLIQUE_COMECAR: "Tocou em começar",
  CADASTRO_INICIADO: "Abriu o cadastro",
  CADASTRO_CRIADO: "Criou a conta",
  ROTEIRO_TERMINADO: "Terminou o Montar o seu Tino",
  ASSINATURA_PAGA: "Pagou a assinatura",
}

export interface LinhaDoFunil {
  etapa: EtapaFunil
  nome: string
  total: number
  /** Quanto da etapa anterior chegou aqui, em pontos-base. Nulo na primeira etapa ou sem base. */
  daAnteriorBps: number | null
}

/**
 * Monta o funil na ordem certa, com a passagem de uma etapa para a próxima.
 * Etapa sem evento aparece com zero, em vez de sumir: um buraco no funil é
 * exatamente o que o dono precisa ver.
 */
export function montarFunil(contagens: Partial<Record<EtapaFunil, number>>): LinhaDoFunil[] {
  return ORDEM_DO_FUNIL.map((etapa, indice) => {
    const total = contagens[etapa] ?? 0
    const anterior = indice === 0 ? null : (contagens[ORDEM_DO_FUNIL[indice - 1]] ?? 0)
    return {
      etapa,
      nome: NOME_DA_ETAPA[etapa],
      total,
      daAnteriorBps: anterior ? Math.round((total * 10_000) / anterior) : null,
    }
  })
}

export function produtoValido(valor: unknown): "pessoal" | "mei" | null {
  return valor === "pessoal" || valor === "mei" ? valor : null
}
