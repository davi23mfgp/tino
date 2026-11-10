import { formatarMoeda } from "@/lib/dinheiro"
import { diaSeguro, diasEntre } from "@/lib/datas"
import type { AlertaGerado } from "@/lib/tino/alertas"

/**
 * Avisos de calendário: o que vai acontecer, não o que já aconteceu.
 *
 * Os avisos de estado ("passou do orçamento", "reserva baixa") chegam depois
 * do fato. Um assessor avisa antes: a fatura fecha em três dias, a última
 * parcela cai este mês, a renda extra acaba em dezembro (estudo de
 * 10/11/2026, olhar do banqueiro). Função pura, com `hoje` de fora, para o
 * teste não depender do relógio.
 */
export interface EntradaCalendario {
  cartoes: { id: string; nome: string; faturaCentavos: number; diaFechamento: number | null }[]
  dividas: { id: string; credor: string; parcelaCentavos: number; parcelasTotal: number | null; parcelasPagas: number }[]
  recorrencias: { id: string; descricao: string; valorCentavos: number; tipo: string; fimEm: Date | null }[]
}

const JANELA_FECHAMENTO_DIAS = 3
const JANELA_FIM_DIAS = 60
const mesAno = (data: Date) => data.toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" })

export function avisosDeCalendario(entrada: EntradaCalendario, hoje: Date): AlertaGerado[] {
  const avisos: AlertaGerado[] = []
  const zeroHora = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate()))

  for (const cartao of entrada.cartoes) {
    if (!cartao.diaFechamento || cartao.faturaCentavos <= 0) continue
    // O fechamento deste mês; se já passou, o do mês que vem.
    let fecha = diaSeguro(zeroHora.getUTCFullYear(), zeroHora.getUTCMonth() + 1, cartao.diaFechamento)
    if (fecha < zeroHora) fecha = diaSeguro(zeroHora.getUTCFullYear(), zeroHora.getUTCMonth() + 2, cartao.diaFechamento)
    const dias = diasEntre(zeroHora, fecha)
    if (dias > JANELA_FECHAMENTO_DIAS) continue
    avisos.push({
      tipo: "fatura_fecha",
      severidade: "INFO",
      titulo: dias === 0 ? `Fatura do ${cartao.nome} fecha hoje` : `Fatura do ${cartao.nome} fecha em ${dias} dia${dias === 1 ? "" : "s"}`,
      texto: `Está em ${formatarMoeda(cartao.faturaCentavos)}. O que você comprar depois do fechamento entra só na fatura seguinte.`,
      acaoRota: `/cartoes?cartao=${cartao.id}`,
      chave: `fatura_fecha:${cartao.id}:${fecha.toISOString().slice(0, 7)}`,
    })
  }

  for (const divida of entrada.dividas) {
    if (!divida.parcelasTotal || divida.parcelasTotal - divida.parcelasPagas !== 1) continue
    avisos.push({
      tipo: "parcela_acaba",
      severidade: "INFO",
      titulo: `Última parcela de ${divida.credor}`,
      texto: `Depois dela sobram ${formatarMoeda(divida.parcelaCentavos)} por mês. Decida agora para onde vai esse dinheiro: outra dívida, a reserva ou uma meta.`,
      acaoRota: "/plano",
      chave: `parcela_acaba:${divida.id}`,
    })
  }

  for (const fixa of entrada.recorrencias) {
    if (!fixa.fimEm) continue
    const dias = diasEntre(zeroHora, fixa.fimEm)
    if (dias < 0 || dias > JANELA_FIM_DIAS) continue
    const renda = fixa.tipo === "RECEITA"
    avisos.push({
      tipo: renda ? "renda_termina" : "fixa_termina",
      // Renda que acaba aperta o mês; conta que acaba alivia. Só a primeira pede atenção.
      severidade: renda ? "ATENCAO" : "INFO",
      titulo: `${fixa.descricao} termina em ${mesAno(fixa.fimEm)}`,
      texto: renda
        ? `São ${formatarMoeda(fixa.valorCentavos)} a menos por mês a partir daí. Veja no Meu mês se o custo fixo ainda cabe na renda.`
        : `Ficam ${formatarMoeda(fixa.valorCentavos)} livres por mês a partir daí.`,
      acaoRota: "/meu-mes",
      chave: `${renda ? "renda_termina" : "fixa_termina"}:${fixa.id}`,
    })
  }

  return avisos
}
