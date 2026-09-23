/**
 * Importação sem tela de conferência: arquivo mandado pelo Telegram ou pelo
 * WhatsApp. Separado do resto da importação para não arrastar banco e sessão
 * para quem só precisa decidir se importa.
 */

import { formatarMoeda } from "@/lib/dinheiro"
import type { PreviaImportacao } from "@/lib/importar"

/**
 * Motivo para NÃO importar sem ninguém olhar (Telegram, WhatsApp). Na tela de
 * importação o aviso de soma que não fecha aparece antes do botão; no
 * mensageiro não há tela, e importar calado seria gravar o erro.
 */
export function motivoParaNaoImportarSozinho(previa: PreviaImportacao): string | null {
  if (!previa.faturaPdf) return null
  const conferencia = previa.conferencia
  if (!conferencia) {
    return "Essa fatura não traz um total que eu consiga conferir, então não importei nada. Abra o app em Importar para conferir linha a linha."
  }
  if (conferencia.lidoCentavos !== conferencia.informadoCentavos) {
    return (
      `Li ${formatarMoeda(conferencia.lidoCentavos)} em lançamentos, mas a fatura diz ${formatarMoeda(conferencia.informadoCentavos)}. ` +
      "Não importei nada para não gravar errado — abra o app em Importar para conferir."
    )
  }
  return null
}

/** A prévia no formato que a confirmação recebe, para quem confirma sem tela. */
export function dadosParaConfirmar(previa: PreviaImportacao) {
  return {
    competenciaFatura: previa.competenciaFatura,
    diaVencimento: previa.diaVencimento,
    lancamentos: previa.lancamentos.map((lancamento) => ({
      data: lancamento.data.toISOString(),
      descricao: lancamento.descricaoSugerida,
      descricaoOriginal: lancamento.descricao,
      valorCentavos: lancamento.valorCentavos,
      tipo: lancamento.tipo,
      categoriaId: lancamento.categoriaId ?? null,
      hashImport: lancamento.hashImport,
      duplicada: lancamento.duplicada,
      parcelaAtual: lancamento.parcelaAtual,
      parcelasTotal: lancamento.parcelasTotal,
      dataCompra: lancamento.dataCompra?.toISOString(),
    })),
  }
}
