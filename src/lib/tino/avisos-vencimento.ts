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

/// Conta vencida há mais de 30 dias sai do aviso: a essa altura é cadastro
/// esquecido, e a tela de contas fixas é quem mostra.
const ATRASO_MAXIMO_DIAS = 30

export function avisosDeVencimento(proximas: ContaQueVence[], hoje: Date) {
  // Conta que venceu e não foi marcada como paga (17/11/2026): o aviso de
  // "vence em 2 dias" ficava parado na lista depois da data, dizendo uma
  // coisa falsa, e não existia aviso de atraso. O dia não entra na chave: é
  // um aviso só, com o título acompanhando os dias.
  const atrasadas = proximas
    .filter((conta) => conta.tipo === "DESPESA")
    .map((conta) => ({ conta, dias: -diasEntre(hoje, conta.proximaData) }))
    .filter(({ dias }) => dias > 0 && dias <= ATRASO_MAXIMO_DIAS)
    .sort((a, b) => b.dias - a.dias)
    .slice(0, TETO)
    .map(({ conta, dias }) => ({
      tipo: "vencimento_proximo" as const,
      severidade: "ATENCAO" as const,
      titulo: `${conta.descricao} venceu há ${dias} dia${dias === 1 ? "" : "s"}`,
      texto: `${formatarMoeda(conta.valorCentavos)}, em ${formatarData(conta.proximaData)}. Se já pagou, marque como paga.`,
      acaoRota: `/recorrencias?pagar=${conta.id}`,
      chave: `vencimento_atrasado:${conta.id}:${formatarData(conta.proximaData)}`,
    }))

  const aVencer = proximas
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

  return [...atrasadas, ...aVencer]
}
