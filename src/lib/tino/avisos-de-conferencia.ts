/**
 * Dois avisos que pedem um olhar da pessoa, não uma ação do Tino:
 * a conta fixa que ficou mais cara e a compra que entrou duas vezes.
 * O Tino só aponta; quem decide se é erro é a pessoa (regra 5).
 */
import { formatarMoeda } from "@/lib/dinheiro"
import type { AlertaGerado } from "@/lib/tino/alertas"

export interface PagamentoDeFixa {
  recorrenciaId: string
  descricao: string
  /** Conta de valor variável (luz, água) muda todo mês: não é "aumento". */
  valorVariavel: boolean
  competencia: string
  valorCentavos: number
}

/**
 * Compara os dois últimos pagamentos de cada conta fixa de valor fixo.
 * Aumento de menos de 1 real fica de fora: é arredondamento de câmbio ou de
 * imposto em assinatura cobrada em dólar, e avisar disso todo mês faria a
 * pessoa desligar o aviso.
 */
export function fixasQueSubiram(pagamentos: PagamentoDeFixa[]): AlertaGerado[] {
  const porFixa = new Map<string, PagamentoDeFixa[]>()
  for (const pagamento of pagamentos) {
    if (pagamento.valorVariavel) continue
    porFixa.set(pagamento.recorrenciaId, [...(porFixa.get(pagamento.recorrenciaId) ?? []), pagamento])
  }
  const avisos: AlertaGerado[] = []
  for (const [id, lista] of porFixa) {
    const [atual, anterior] = [...lista].sort((a, b) => b.competencia.localeCompare(a.competencia))
    if (!atual || !anterior || atual.competencia === anterior.competencia) continue
    const aumento = atual.valorCentavos - anterior.valorCentavos
    if (aumento < 100) continue
    avisos.push({
      tipo: "fixa_subiu",
      severidade: "INFO",
      titulo: `${atual.descricao} ficou mais cara`,
      texto: `Passou de ${formatarMoeda(anterior.valorCentavos)} para ${formatarMoeda(atual.valorCentavos)}, ${formatarMoeda(aumento)} a mais por mês. Vale conferir se foi reajuste avisado.`,
      acaoRota: "/recorrencias",
      chave: `fixa_subiu:${id}:${atual.competencia}`,
    })
  }
  return avisos
}

export interface CompraRecente {
  id: string
  contaId: string
  /** AAAA-MM-DD. */
  data: string
  descricao: string
  valorCentavos: number
  /** Parcela e conta fixa repetem de propósito: ficam de fora. */
  repeteDeProposito: boolean
}

/**
 * Mesma conta, mesmo dia, mesma descrição e mesmo valor: pode ser cobrança
 * em dobro ou o mesmo lançamento anotado duas vezes. Pode também ser verdade
 * (dois cafés iguais), por isso é pergunta, não correção. Abaixo de 10 reais
 * não avisa: é onde a repetição verdadeira é comum.
 */
export function comprasRepetidas(compras: CompraRecente[]): AlertaGerado[] {
  const grupos = new Map<string, CompraRecente[]>()
  for (const compra of compras) {
    if (compra.repeteDeProposito || compra.valorCentavos < 1000) continue
    const chave = `${compra.contaId}|${compra.data}|${compra.descricao.trim().toLowerCase()}|${compra.valorCentavos}`
    grupos.set(chave, [...(grupos.get(chave) ?? []), compra])
  }
  const avisos: AlertaGerado[] = []
  for (const grupo of grupos.values()) {
    if (grupo.length < 2) continue
    const primeira = [...grupo].sort((a, b) => a.id.localeCompare(b.id))[0]
    const [ano, mes, dia] = primeira.data.split("-")
    avisos.push({
      tipo: "compra_repetida",
      severidade: "ATENCAO",
      titulo: `${primeira.descricao} aparece ${grupo.length} vezes no mesmo dia`,
      texto: `${grupo.length} lançamentos de ${formatarMoeda(primeira.valorCentavos)} em ${dia}/${mes}/${ano}. Se foi uma compra só, apague o que sobrou; se o cartão cobrou em dobro, peça o estorno.`,
      acaoRota: "/transacoes",
      chave: `compra_repetida:${primeira.id}`,
    })
  }
  return avisos
}
