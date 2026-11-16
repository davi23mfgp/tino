import { diasEntre, formatarData } from "@/lib/datas"
import { formatarMoeda } from "@/lib/dinheiro"

/**
 * Avisos de conta fixa que vence (aluguel, luz, internet).
 *
 * Até 16/11/2026 o Tino avisava só da PRÓXIMA conta: com aluguel e luz no
 * mesmo dia, a luz ficava sem aviso. E o toque no aviso levava para o Meu
 * mês, onde a pessoa ainda tinha de achar a conta. Agora cada conta que vence
 * na janela tem o seu aviso, e o toque abre a confirmação daquela conta
 * (`/recorrencias?pagar=<id>`): é o atalho de "paguei" que o Davi pediu.
 *
 * Função pura: o que entra é a lista de próximas contas, o que sai são os
 * avisos. O limite de avisos por dia continua em `entregar-avisos.ts`.
 */
export const JANELA_VENCIMENTO_DIAS = 3
/// Teto de avisos de vencimento por rodada: quem tem dez contas no dia 10
/// não precisa de dez notificações, e o resto aparece na tela de contas.
const TETO = 5

export interface ContaQueVence { id: string; descricao: string; valorCentavos: number; tipo: string; proximaData: Date }

export function avisosDeVencimento(proximas: ContaQueVence[], hoje: Date) {
  return proximas
    .filter((conta) => conta.tipo === "DESPESA")
    .map((conta) => ({ conta, dias: diasEntre(hoje, conta.proximaData) }))
    .filter(({ dias }) => dias >= 0 && dias <= JANELA_VENCIMENTO_DIAS)
    .sort((a, b) => a.dias - b.dias)
    .slice(0, TETO)
    .map(({ conta, dias }) => ({
      tipo: "vencimento_proximo" as const,
      severidade: dias === 0 ? ("ATENCAO" as const) : ("INFO" as const),
      titulo: dias === 0 ? `${conta.descricao} vence hoje` : `${conta.descricao} vence em ${dias} dia${dias === 1 ? "" : "s"}`,
      texto: `${formatarMoeda(conta.valorCentavos)}, em ${formatarData(conta.proximaData)}.`,
      acaoRota: `/recorrencias?pagar=${conta.id}`,
      // A chave leva a data: a próxima ocorrência do MESMO fixo, mês que
      // vem, é um vencimento diferente e merece avisar de novo.
      chave: `vencimento_proximo:${conta.id}:${formatarData(conta.proximaData)}`,
    }))
}
