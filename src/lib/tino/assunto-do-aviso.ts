/**
 * Agrupa os avisos por assunto na gaveta de notificações (passo 54, opção C,
 * Davi, 08/10/2026).
 *
 * O porquê: quatro categorias que passaram do orçamento são um aviso, não
 * quatro. Com 15 itens iguais na mesma lista, o que vence hoje some no meio do
 * que é só informação, e a pesquisa de notificações mostra que passando dessa
 * faixa a pessoa desliga tudo (`docs/pesquisas/2026-10-07-notificacoes.md`).
 *
 * Função pura, sem React, para o teste pegar um tipo novo sem assunto: quem
 * cria um alerta novo e esquece de listá-lo aqui cai em "Outros avisos" em vez
 * de sumir da gaveta.
 */

export type Severidade = "INFO" | "ATENCAO" | "CRITICO"

export interface AvisoAgrupavel {
  id: string
  tipo?: string
  titulo: string
  severidade: Severidade
  lido?: boolean
}

export interface GrupoDeAvisos<T extends AvisoAgrupavel> {
  assunto: string
  avisos: T[]
  /** A pior severidade do grupo: é ela que define a ordem e o ícone. */
  severidade: Severidade
  /** Quantos ainda não foram lidos; a bolinha da gaveta conta só esses. */
  naoLidos: number
}

const ASSUNTO_POR_TIPO: Record<string, string> = {
  caixa_negativo: "Fluxo de caixa",
  mes_no_vermelho: "Fluxo de caixa",
  orcamento_estourado: "Orçamento",
  orcamento_perto: "Orçamento",
  sem_categoria: "Orçamento",
  reserva_baixa: "Reserva e metas",
  meta_atrasada: "Reserva e metas",
  fatura_acima_limite: "Cartões e vencimentos",
  vencimento_proximo: "Cartões e vencimentos",
  divida_alta: "Dívidas",
  juros_abusivo: "Dívidas",
  estrategia_divida: "Dívidas",
}

export const ASSUNTO_OUTROS = "Outros avisos"

export function assuntoDoAviso(tipo?: string): string {
  if (!tipo) return ASSUNTO_OUTROS
  if (tipo.startsWith("mei_")) return "MEI e DAS"
  return ASSUNTO_POR_TIPO[tipo] ?? ASSUNTO_OUTROS
}

const PESO: Record<Severidade, number> = { CRITICO: 0, ATENCAO: 1, INFO: 2 }

/** Do mais urgente ao menos: pior severidade primeiro, depois o grupo maior, depois o nome. */
export function agruparPorAssunto<T extends AvisoAgrupavel>(avisos: T[]): GrupoDeAvisos<T>[] {
  const porAssunto = new Map<string, T[]>()
  for (const aviso of avisos) {
    const assunto = assuntoDoAviso(aviso.tipo)
    porAssunto.set(assunto, [...(porAssunto.get(assunto) ?? []), aviso])
  }
  return [...porAssunto.entries()]
    .map(([assunto, lista]) => {
      const ordenados = [...lista].sort((a, b) => PESO[a.severidade] - PESO[b.severidade])
      return {
        assunto,
        avisos: ordenados,
        severidade: ordenados[0].severidade,
        naoLidos: lista.filter((aviso) => !aviso.lido).length,
      }
    })
    .sort((a, b) => PESO[a.severidade] - PESO[b.severidade] || b.avisos.length - a.avisos.length || a.assunto.localeCompare(b.assunto, "pt-BR"))
}

/**
 * A linha de resumo do grupo: um aviso mostra o título; vários mostram o mais
 * grave e quantos vêm junto. Listar todos os títulos enchia a gaveta de volta
 * (oito categorias estouradas ocupavam dez linhas), que é o que o agrupamento
 * existe para evitar. Os avisos inteiros ficam um toque abaixo.
 */
export function resumoDoGrupo(grupo: GrupoDeAvisos<AvisoAgrupavel>): string {
  const [primeiro, ...resto] = grupo.avisos
  return resto.length === 0 ? primeiro.titulo : `${primeiro.titulo} e mais ${resto.length}`
}
