/**
 * Contas a pagar da loja: a situação de cada uma e o resumo do topo.
 *
 * Tudo por DIA, no fuso do lar, nunca por instante. O vencimento é gravado
 * como meia-noite UTC do dia; comparar com `new Date()` fazia a conta que vence
 * hoje virar "vencida" logo de manhã, e às 21h de Brasília (meia-noite UTC) a
 * de amanhã também — em 28/09/2026 a luz que vencia no dia 29 apareceu como
 * vencida às 22h53 do dia 28.
 */

export type SituacaoDaConta = "paga" | "vencida" | "vence hoje" | "esta semana" | "depois"

/** "2026-09-28" no fuso do lar. */
export function diaNoFuso(data: Date, fuso = "America/Sao_Paulo"): string {
  return data.toLocaleDateString("en-CA", { timeZone: fuso })
}

/** Dia do vencimento como foi gravado (meia-noite UTC do dia escolhido). */
export const diaDoVencimento = (vencimento: Date | string) => new Date(vencimento).toISOString().slice(0, 10)

function somarDias(dia: string, dias: number): string {
  const data = new Date(`${dia}T00:00:00Z`)
  data.setUTCDate(data.getUTCDate() + dias)
  return data.toISOString().slice(0, 10)
}

export function situacaoDaConta(conta: { vencimento: Date | string; paga: boolean }, hoje: string): SituacaoDaConta {
  if (conta.paga) return "paga"
  const dia = diaDoVencimento(conta.vencimento)
  if (dia < hoje) return "vencida"
  if (dia === hoje) return "vence hoje"
  // A semana é hoje e os seis dias seguintes: o que dá para pagar sem
  // esperar a próxima entrada de dinheiro da semana que vem.
  if (dia <= somarDias(hoje, 6)) return "esta semana"
  return "depois"
}

export interface ResumoDasContas {
  abertoCentavos: number
  vencidoCentavos: number
  /// Vence hoje ou nos seis dias seguintes.
  daSemanaCentavos: number
  /// Pagas no mês corrente, pelo dia do pagamento no fuso do lar.
  pagoNoMesCentavos: number
}

export function resumoDasContas(
  contas: { vencimento: Date | string; paga: boolean; pagaEm: Date | string | null; valorCentavos: number }[],
  hoje: string,
  fuso = "America/Sao_Paulo",
): ResumoDasContas {
  const resumo = { abertoCentavos: 0, vencidoCentavos: 0, daSemanaCentavos: 0, pagoNoMesCentavos: 0 }
  for (const conta of contas) {
    const situacao = situacaoDaConta(conta, hoje)
    if (situacao === "paga") {
      if (conta.pagaEm && diaNoFuso(new Date(conta.pagaEm), fuso).slice(0, 7) === hoje.slice(0, 7)) resumo.pagoNoMesCentavos += conta.valorCentavos
      continue
    }
    resumo.abertoCentavos += conta.valorCentavos
    if (situacao === "vencida") resumo.vencidoCentavos += conta.valorCentavos
    if (situacao === "vence hoje" || situacao === "esta semana") resumo.daSemanaCentavos += conta.valorCentavos
  }
  return resumo
}

export { somarDias }

/** Dias de `de` até `ate`, os dois no formato "2026-09-28". Negativo se `ate` vem antes. */
export function diasEntre(de: string, ate: string): number {
  return Math.round((Date.parse(`${ate}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / 86_400_000)
}

const DIA_DA_SEMANA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"]
export const diaDaSemana = (dia: string) => DIA_DA_SEMANA[new Date(`${dia}T00:00:00Z`).getUTCDay()]

/**
 * O prazo em palavras: "venceu há 3 dias", "amanhã", "sexta, em 4 dias".
 *
 * Dentro da semana vai o nome do dia, porque é assim que o dono se organiza
 * ("pago na sexta"); depois disso o nome do dia só atrapalha e fica a conta.
 */
export function textoDoPrazo(dia: string, hoje: string): string {
  const faltam = diasEntre(hoje, dia)
  if (faltam < -1) return `venceu há ${-faltam} dias`
  if (faltam === -1) return "venceu ontem"
  if (faltam === 0) return "vence hoje"
  if (faltam === 1) return "amanhã"
  if (faltam <= 6) return `${diaDaSemana(dia)}, em ${faltam} dias`
  return `em ${faltam} dias`
}

/**
 * Os dias da grade do calendário: cinco semanas de segunda a domingo, a
 * começar pela semana ANTERIOR à de `referencia` — é nela que costuma estar o
 * que venceu, e um calendário que abre em hoje esconde justamente a conta
 * atrasada.
 */
export function diasDoCalendario(referencia: string, semanas = 5): string[] {
  const diaDaSemanaDaRef = new Date(`${referencia}T00:00:00Z`).getUTCDay()
  const segunda = somarDias(referencia, -((diaDaSemanaDaRef + 6) % 7) - 7)
  return Array.from({ length: semanas * 7 }, (_, indice) => somarDias(segunda, indice))
}

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"]

/** "Setembro e outubro", ou "Dezembro de 2026 e janeiro de 2027" na virada do ano. */
export function tituloDoCalendario(dias: string[]): string {
  const [primeiro, ultimo] = [dias[0], dias[dias.length - 1]]
  const mes = (dia: string) => MESES[Number(dia.slice(5, 7)) - 1]
  const maiuscula = (texto: string) => texto[0].toUpperCase() + texto.slice(1)
  if (primeiro.slice(0, 7) === ultimo.slice(0, 7)) return maiuscula(mes(primeiro))
  if (primeiro.slice(0, 4) !== ultimo.slice(0, 4)) return maiuscula(`${mes(primeiro)} de ${primeiro.slice(0, 4)} e ${mes(ultimo)} de ${ultimo.slice(0, 4)}`)
  return maiuscula(`${mes(primeiro)} e ${mes(ultimo)}`)
}
