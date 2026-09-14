/**
 * A qual fatura uma compra de cartão pertence.
 *
 * Competência contábil e competência de fatura são coisas diferentes e as duas
 * precisam existir. A contábil responde "em que mês esse gasto aconteceu" — é
 * dela que vive o extrato. A de fatura responde "em que mês eu vou pagar isso"
 * — é dela que vivem o cartão, o painel e a projeção. Uma compra no dia 29,
 * num cartão que fecha dia 28, aconteceu em setembro e é paga em novembro: sem
 * separar as duas, ela aparece no mês errado em uma das telas, sempre.
 *
 * A competência da fatura é dada pelo **vencimento**, não pelo fechamento, que
 * é como o banco nomeia a fatura ("fatura de novembro" é a que vence em
 * novembro).
 */

import { competenciaDe, diaUtc, diasNoMes, partesCompetencia } from "@/lib/datas"

export interface CartaoParaFatura {
  tipo: string
  diaFechamento?: number | null
  diaVencimento?: number | null
}

/**
 * Devolve "AAAA-MM" da fatura, ou `null` quando a pergunta não se aplica.
 *
 * `null` em três casos, e todos são deliberados:
 * - a conta não é cartão de crédito (débito não tem fatura);
 * - o cartão não tem fechamento cadastrado (sem ele, qualquer atribuição seria
 *   chute — e um chute aqui move dinheiro de mês, que é pior do que não saber);
 * - o cartão não tem vencimento cadastrado, pelo mesmo motivo.
 *
 * Quem chama decide o que fazer com o `null`. Hoje todos caem na competência
 * contábil, que é o comportamento que o app já tinha.
 */
export function competenciaDoCartao(data: Date, cartao: CartaoParaFatura): string | null {
  if (cartao.tipo !== "CARTAO_CREDITO") return null
  const fechamento = cartao.diaFechamento
  const vencimento = cartao.diaVencimento
  if (!fechamento || !vencimento) return null

  const ano = data.getUTCFullYear()
  const mes = data.getUTCMonth() + 1
  const dia = data.getUTCDate()

  // Fechamento inclusivo: comprar NO dia do fechamento ainda entra na fatura
  // que fecha nesse dia. É como os bancos brasileiros se comportam, e é a
  // leitura que não surpreende quem comprou às 9h do dia 28.
  const diaDeCorte = Math.min(fechamento, diasNoMes(ano, mes))
  const cicloFecha = dia <= diaDeCorte ? competenciaDe(diaUtc(ano, mes, 1)) : proximoMes(ano, mes)

  // A fatura que fecha num mês pode vencer no mesmo mês (fecha dia 8, vence dia
  // 15) ou no seguinte (fecha dia 28, vence dia 6). O vencimento menor que o
  // fechamento é o sinal de que virou o mês.
  return vencimento >= fechamento ? cicloFecha : somaUmMes(cicloFecha)
}

function proximoMes(ano: number, mes: number): string {
  return somaUmMes(competenciaDe(diaUtc(ano, mes, 1)))
}

function somaUmMes(competencia: string): string {
  const { ano, mes } = partesCompetencia(competencia)
  return mes === 12 ? `${ano + 1}-01` : `${ano}-${String(mes + 1).padStart(2, "0")}`
}
