/**
 * Cotação do dólar comercial do dia.
 *
 * A pessoa não deveria precisar abrir outra aba e digitar o câmbio para o app
 * estimar pontos de cartão internacional. A fonte é a AwesomeAPI, que publica
 * o câmbio do Banco Central sem exigir chave — nenhuma credencial nova entrou
 * no projeto por causa disto.
 *
 * O valor vem sempre acompanhado da data de fechamento e do nome da fonte, e
 * a interface mostra os dois: câmbio sem data é um número inventado, e a
 * estimativa que ele alimenta seria impossível de conferir depois.
 *
 * Se a busca falhar, devolve `null` em vez de um valor plausível — quem chama
 * cai no preenchimento manual.
 */

const FONTE = "AwesomeAPI · Banco Central"
const ENDERECO = "https://economia.awesomeapi.com.br/json/last/USD-BRL"
const VALIDADE_MS = 60 * 60 * 1000

export interface Cotacao {
  /** Reais por um dólar, como número (ex.: 5.1262). */
  valor: number
  /** Data de fechamento informada pela fonte, em ISO curto (AAAA-MM-DD). */
  data: string
  fonte: string
}

let cache: { em: number; cotacao: Cotacao } | null = null

export async function cotacaoDoDolar(): Promise<Cotacao | null> {
  if (cache && Date.now() - cache.em < VALIDADE_MS) return cache.cotacao

  try {
    const controle = new AbortController()
    const prazo = setTimeout(() => controle.abort(), 6000)
    const resposta = await fetch(ENDERECO, { signal: controle.signal, cache: "no-store" })
    clearTimeout(prazo)
    if (!resposta.ok) return cache?.cotacao ?? null

    const corpo = (await resposta.json()) as { USDBRL?: { bid?: string; create_date?: string } }
    const valor = Number(corpo.USDBRL?.bid)
    if (!Number.isFinite(valor) || valor <= 0) return cache?.cotacao ?? null

    const cotacao: Cotacao = {
      valor,
      data: (corpo.USDBRL?.create_date ?? "").slice(0, 10),
      fonte: FONTE,
    }
    cache = { em: Date.now(), cotacao }
    return cotacao
  } catch {
    // Rede fora ou fonte lenta: o último valor bom ainda serve, e a interface
    // mostra a data dele. Sem nenhum valor, quem chama pede à mão.
    return cache?.cotacao ?? null
  }
}
