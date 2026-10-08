import { cnpjValido } from "@/lib/loja/cadastro-mei"

/**
 * Regras do "ligar o Tino negócio" numa conta pessoal que já existe (passo 40,
 * Davi, 08/10/2026: "B com A").
 *
 * Os dois bancos que mais têm MEI no Brasil deixam pedir o negócio de dentro da
 * conta que a pessoa já tem, com o CNPJ (`docs/pesquisas/2026-10-06-ativar-mei-na-conta-pessoal.md`).
 * O Tino não consulta a Receita daqui: confere os dígitos do CNPJ e confia na
 * pessoa, como já faz no cadastro do MEI. Por isso o erro de digitação é o que
 * mais importa pegar aqui.
 */

export type Leitura<T> = { ok: true; valor: T } | { ok: false; erro: string }

export function formatarCnpj(digitos: string): string {
  const d = digitos.replace(/\D/g, "").slice(0, 14)
  return d.replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2")
}

export function lerCnpj(texto: string): Leitura<string> {
  const digitos = texto.replace(/\D/g, "")
  if (digitos.length !== 14) return { ok: false, erro: "O CNPJ tem 14 números." }
  if (!cnpjValido(digitos)) return { ok: false, erro: "Confira o CNPJ: os dígitos finais não batem." }
  return { ok: true, valor: digitos }
}

/**
 * "03/2024" vira o dia 1 daquele mês. A data só serve para o limite do ano sair
 * certo (o MEI que abriu no meio do ano tem o limite proporcional), então mês e
 * ano bastam, e uma data no futuro é erro de digitação, não abertura.
 */
export function lerDesde(texto: string, agora = new Date()): Leitura<Date> {
  const partes = /^(\d{1,2})\s*\/\s*(\d{4})$/.exec(texto.trim())
  if (!partes) return { ok: false, erro: "Escreva o mês e o ano, assim: 03/2024." }
  const mes = Number(partes[1])
  const ano = Number(partes[2])
  if (mes < 1 || mes > 12) return { ok: false, erro: "O mês vai de 01 a 12." }
  if (ano < 2009) return { ok: false, erro: "O MEI existe desde 2009. Confira o ano." }
  const data = new Date(Date.UTC(ano, mes - 1, 1))
  if (data.getTime() > agora.getTime()) return { ok: false, erro: "Essa data ainda não chegou. Confira o mês e o ano." }
  return { ok: true, valor: data }
}
