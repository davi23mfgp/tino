/**
 * Meu mês (passo 59b, opção D): a planilha de custo fixo e custo variável.
 *
 * O resumo é a conta que a pessoa faria na planilha: fixo mais variável, e o
 * que sobra da renda. Sem renda informada não há sobra nem percentual (regra
 * 3): o app diz que falta a renda em vez de dividir por um número inventado.
 */

/** Referência do quadro: custo fixo até metade da renda (regra 50/30/20). */
export const FIXO_REFERENCIA_BPS = 5000

export interface ResumoMeuMes {
  fixoCentavos: number
  variavelCentavos: number
  rendaCentavos: number | null
  sobraCentavos: number | null
  fixoBps: number | null
  variavelBps: number | null
  fixoAcimaDaReferencia: boolean
}

export function resumoMeuMes(fixas: { valorCentavos: number }[], variaveis: { limiteCentavos: number }[], rendaCentavos: number): ResumoMeuMes {
  const fixo = fixas.reduce((soma, linha) => soma + linha.valorCentavos, 0)
  const variavel = variaveis.reduce((soma, linha) => soma + linha.limiteCentavos, 0)
  if (rendaCentavos <= 0) {
    return { fixoCentavos: fixo, variavelCentavos: variavel, rendaCentavos: null, sobraCentavos: null, fixoBps: null, variavelBps: null, fixoAcimaDaReferencia: false }
  }
  const fixoBps = Math.round((fixo * 10_000) / rendaCentavos)
  return {
    fixoCentavos: fixo,
    variavelCentavos: variavel,
    rendaCentavos,
    sobraCentavos: rendaCentavos - fixo - variavel,
    fixoBps,
    variavelBps: Math.round((variavel * 10_000) / rendaCentavos),
    fixoAcimaDaReferencia: fixoBps > FIXO_REFERENCIA_BPS,
  }
}

/**
 * O que entra em "Preencher pelo extrato": só categoria sem limite e que não é
 * de conta fixa (o aluguel já está em cima; repetir embaixo contaria duas vezes).
 */
export function sugestoesParaPreencher(
  sugestoes: { categoriaId: string; sugestaoCentavos: number }[],
  comLimite: Set<string>,
  deContaFixa: Set<string>,
) {
  return sugestoes.filter((s) => s.sugestaoCentavos > 0 && !comLimite.has(s.categoriaId) && !deContaFixa.has(s.categoriaId))
}
