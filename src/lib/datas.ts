/**
 * Datas e competências.
 *
 * Competência é sempre "YYYY-MM" em string: comparação, agrupamento e chave
 * única ficam triviais e não dependem de fuso. Datas são gravadas em UTC à
 * meia-noite para que o dia não escorregue ao renderizar em America/Sao_Paulo.
 */

export const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
]

export const MESES_CURTOS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]

/** Data "sem hora": meia-noite UTC. Evita que o dia mude por causa do fuso. */
export function diaUtc(ano: number, mes1a12: number, dia: number): Date {
  return new Date(Date.UTC(ano, mes1a12 - 1, dia, 0, 0, 0, 0))
}

export function competenciaDe(data: Date): string {
  const ano = data.getUTCFullYear()
  const mes = String(data.getUTCMonth() + 1).padStart(2, "0")
  return `${ano}-${mes}`
}

export function competenciaAtual(): string {
  return competenciaDe(new Date())
}

export function partesCompetencia(competencia: string): { ano: number; mes: number } {
  const [ano, mes] = competencia.split("-").map(Number)
  return { ano, mes }
}

export function competenciaMaisMeses(competencia: string, meses: number): string {
  const { ano, mes } = partesCompetencia(competencia)
  const total = ano * 12 + (mes - 1) + meses
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`
}

/** Quantos meses de `de` até `ate` (negativo se `ate` for anterior). */
export function distanciaEmMeses(de: string, ate: string): number {
  const a = partesCompetencia(de)
  const b = partesCompetencia(ate)
  return (b.ano - a.ano) * 12 + (b.mes - a.mes)
}

export function rotuloCompetencia(competencia: string, curto = false): string {
  const { ano, mes } = partesCompetencia(competencia)
  const nome = curto ? MESES_CURTOS[mes - 1] : MESES[mes - 1]
  return curto ? `${nome}/${String(ano).slice(2)}` : `${nome} de ${ano}`
}

/** Lista de competências de `inicio` até `fim`, inclusive. */
export function intervaloCompetencias(inicio: string, fim: string): string[] {
  const total = distanciaEmMeses(inicio, fim)
  if (total < 0) return []
  return Array.from({ length: total + 1 }, (_, i) => competenciaMaisMeses(inicio, i))
}

/** Últimas N competências terminando na atual (ou na informada). */
export function ultimasCompetencias(quantidade: number, fim = competenciaAtual()): string[] {
  return intervaloCompetencias(competenciaMaisMeses(fim, -(quantidade - 1)), fim)
}

export function diasNoMes(ano: number, mes1a12: number): number {
  return new Date(Date.UTC(ano, mes1a12, 0)).getUTCDate()
}

/**
 * Dia do vencimento dentro do mês, sem estourar.
 * Vencimento dia 31 em fevereiro cai no dia 28 (ou 29) — é o que o banco faz.
 */
export function diaSeguro(ano: number, mes1a12: number, dia: number): Date {
  return diaUtc(ano, mes1a12, Math.min(dia, diasNoMes(ano, mes1a12)))
}

export function inicioDaCompetencia(competencia: string): Date {
  const { ano, mes } = partesCompetencia(competencia)
  return diaUtc(ano, mes, 1)
}

export function fimDaCompetencia(competencia: string): Date {
  const { ano, mes } = partesCompetencia(competencia)
  return new Date(Date.UTC(ano, mes, 0, 23, 59, 59, 999))
}

/**
 * Janela do "mês financeiro" do lar. Quem recebe dia 5 tem o mês de 5 a 4:
 * fechar no dia 1º jogaria o salário e as contas dele em meses diferentes.
 */
export function janelaDoMes(competencia: string, diaInicio = 1): { de: Date; ate: Date } {
  if (diaInicio <= 1) return { de: inicioDaCompetencia(competencia), ate: fimDaCompetencia(competencia) }
  const { ano, mes } = partesCompetencia(competencia)
  const de = diaSeguro(ano, mes, diaInicio)
  const seguinte = partesCompetencia(competenciaMaisMeses(competencia, 1))
  const ate = new Date(diaSeguro(seguinte.ano, seguinte.mes, diaInicio).getTime() - 1)
  return { de, ate }
}

export function formatarData(data: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(data)
}

export function formatarDataLonga(data: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(data)
}

/** Aceita "2026-08-23", "23/08/2026", "23082026" e "230826". */
export function lerData(texto: string): Date | null {
  const limpo = texto.trim()

  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(limpo)
  if (iso) return dataValida(Number(iso[1]), Number(iso[2]), Number(iso[3]))

  const br = /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/.exec(limpo)
  if (br) {
    const ano = Number(br[3])
    return dataValida(ano < 100 ? 2000 + ano : ano, Number(br[2]), Number(br[1]))
  }

  const compacto = /^(\d{4})(\d{2})(\d{2})$/.exec(limpo)
  if (compacto) return dataValida(Number(compacto[1]), Number(compacto[2]), Number(compacto[3]))

  return null
}

/**
 * `Date.UTC` não recusa dia 35 nem mês 34: rola para a frente em silêncio.
 * Foi assim que "R$ 63.352,00" numa fatura virou lançamento em 2029 — o leitor
 * de PDF tomou "63.35" por data. Data impossível tem de ser `null`.
 */
function dataValida(ano: number, mes1a12: number, dia: number): Date | null {
  const data = diaUtc(ano, mes1a12, dia)
  return data.getUTCMonth() === mes1a12 - 1 && data.getUTCDate() === dia ? data : null
}

export function diasEntre(de: Date, ate: Date): number {
  return Math.round((ate.getTime() - de.getTime()) / 86_400_000)
}
