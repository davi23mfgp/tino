/**
 * Contas de milhas, sobre o saldo que a pessoa informa (não há API pública de
 * Livelo, Smiles, LATAM Pass, Azul ou Esfera: estudo de 16/11/2026).
 */
import type { AlertaGerado } from "@/lib/tino/alertas"

export interface SaldoDoPrograma {
  id: string
  programa: string
  pontos: number
  pontosQueVencem: number | null
  venceEm: Date | null
  custoCentavos: number | null
  atualizadoEm: Date
}

/**
 * Quanto custou cada mil pontos, em centavos. Nulo sem custo informado: ponto
 * ganho no cartão não tem "custo" que o Tino saiba, e inventar um valor de
 * mercado por milha seria chute (cada emissão vale um valor diferente).
 */
export function custoPorMilheiroCentavos(pontos: number, custoCentavos: number | null): number | null {
  if (!custoCentavos || custoCentavos <= 0 || pontos <= 0) return null
  return Math.round((custoCentavos * 1000) / pontos)
}

/** Saldo informado há mais de 60 dias: a tela pede para conferir. */
export function saldoDesatualizado(atualizadoEm: Date, hoje: Date): boolean {
  return hoje.getTime() - atualizadoEm.getTime() > 60 * 86_400_000
}

const AVISAR_COM_DIAS = [60, 30, 7] as const

/**
 * Avisa três vezes antes de os pontos vencerem: 60, 30 e 7 dias. Sessenta
 * porque emitir passagem com data boa pede antecedência; sete é o último
 * chamado. A chave leva a faixa, então cada faixa avisa uma vez só.
 */
export function avisosDeMilhas(saldos: SaldoDoPrograma[], hoje: Date): AlertaGerado[] {
  const zeroHora = Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate())
  const avisos: AlertaGerado[] = []
  for (const saldo of saldos) {
    if (!saldo.venceEm || !saldo.pontosQueVencem || saldo.pontosQueVencem <= 0) continue
    const dias = Math.round((Date.UTC(saldo.venceEm.getUTCFullYear(), saldo.venceEm.getUTCMonth(), saldo.venceEm.getUTCDate()) - zeroHora) / 86_400_000)
    if (dias < 0) continue
    const faixa = [...AVISAR_COM_DIAS].reverse().find((limite) => dias <= limite)
    if (!faixa) continue
    const quantos = saldo.pontosQueVencem.toLocaleString("pt-BR")
    avisos.push({
      tipo: "milhas_vencem",
      severidade: faixa === 7 ? "ATENCAO" : "INFO",
      titulo: dias === 0 ? `${quantos} pontos da ${saldo.programa} vencem hoje` : `${quantos} pontos da ${saldo.programa} vencem em ${dias} dia${dias === 1 ? "" : "s"}`,
      texto: "Use, transfira ou confira no programa se a data mudou. Ponto vencido não volta.",
      acaoRota: "/milhas",
      chave: `milhas_vencem:${saldo.id}:${saldo.venceEm.toISOString().slice(0, 10)}:${faixa}`,
    })
  }
  return avisos
}
