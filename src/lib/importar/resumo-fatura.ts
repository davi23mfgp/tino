/**
 * O que dizer de uma fatura que chegou por e-mail e foi lida sem ninguém olhar.
 *
 * Separado do banco para o teste cobrir a decisão que importa: quando o botão
 * "Confirmar" pode aparecer. Ele só aparece se a soma lida fecha com o total
 * impresso na fatura; fora disso a pessoa confere linha a linha em Importar.
 */

import { motivoParaNaoImportarSozinho } from "@/lib/importar/sem-tela"
import type { PreviaImportacao } from "@/lib/importar"

export interface ResumoDaFatura {
  situacao: "PRONTA" | "PRECISA_SENHA" | "SENHA_ERRADA" | "CONFERIR" | "NADA_NOVO" | "ERRO"
  /// Frase para a tela e para o aviso. Sem valor em dinheiro quando vai para
  /// a tela de bloqueio: quem monta a notificação usa só o título.
  texto: string
  novas?: number
  duplicadas?: number
  /// Gastos novos menos estornos novos, em centavos.
  totalCentavos?: number
  competenciaFatura?: string
}

export function resumoDaPrevia(previa: PreviaImportacao): ResumoDaFatura {
  const base = { novas: previa.novas, duplicadas: previa.duplicadas, competenciaFatura: previa.competenciaFatura }

  if (previa.novas === 0) {
    return {
      ...base,
      situacao: "NADA_NOVO",
      texto: previa.total === 0 ? "Não achei lançamentos nesse arquivo." : "Tudo desse arquivo já estava no Tino.",
    }
  }

  // Extrato (OFX, CSV) não traz total para conferir, e `motivoParaNaoImportarSozinho`
  // deixa passar. Aqui não: um toque só vale com prova de que a leitura fechou.
  if (!previa.faturaPdf) {
    return { ...base, situacao: "CONFERIR", texto: "Extrato não traz total para conferir. Confira os lançamentos antes de importar." }
  }

  const motivo = motivoParaNaoImportarSozinho(previa)
  if (motivo) return { ...base, situacao: "CONFERIR", texto: motivo }

  const totalCentavos = previa.lancamentos
    .filter((lancamento) => !lancamento.duplicada)
    .reduce((soma, lancamento) => soma + (lancamento.tipo === "DESPESA" ? lancamento.valorCentavos : lancamento.tipo === "RECEITA" ? -lancamento.valorCentavos : 0), 0)

  return {
    ...base,
    situacao: "PRONTA",
    totalCentavos,
    texto: `${previa.novas} ${previa.novas === 1 ? "lançamento novo" : "lançamentos novos"}. A soma fecha com o total da fatura.`,
  }
}
