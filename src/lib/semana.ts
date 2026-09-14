/**
 * A semana a que um dia pertence, em UTC.
 *
 * Tudo no extrato é UTC: as datas dos lançamentos são gravadas assim, e usar o
 * fuso local aqui faria o dia 1º às 21h de Brasília cair na semana do dia 2.
 * Semana começa no domingo, como o calendário que a maioria vê no Brasil.
 */

export function domingoDa(dia: string): string {
  const data = new Date(`${dia}T00:00:00.000Z`)
  data.setUTCDate(data.getUTCDate() - data.getUTCDay())
  return data.toISOString().slice(0, 10)
}

export function somarDias(dia: string, dias: number): string {
  const data = new Date(`${dia}T00:00:00.000Z`)
  data.setUTCDate(data.getUTCDate() + dias)
  return data.toISOString().slice(0, 10)
}

/** Os sete dias da semana do dia informado, de domingo a sábado. */
export function semanaDe(dia: string): string[] {
  const inicio = domingoDa(dia)
  return Array.from({ length: 7 }, (_, indice) => somarDias(inicio, indice))
}

/** Dia da semana em três letras, para o cabeçalho da faixa. */
export function nomeDoDia(dia: string): string {
  return ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"][new Date(`${dia}T00:00:00.000Z`).getUTCDay()]
}
