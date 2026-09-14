/**
 * Preço de ativos negociados na B3.
 *
 * Mesma ideia do câmbio em `cambio.ts`: a pessoa não deveria abrir o site da
 * corretora e digitar o preço do dia no app. A fonte é a brapi, que publica
 * cotação da B3 sem exigir chave para consulta simples — nenhuma credencial
 * nova entrou no projeto.
 *
 * O que esta camada NÃO faz: mexer no saldo da conta. O saldo de um
 * investimento vem das transferências que a pessoa registrou, e sobrescrevê-lo
 * com o preço do dia apagaria o histórico de aportes. O preço serve para
 * mostrar o valor de mercado ao lado, e a diferença vira lançamento só quando
 * alguém manda.
 */

const FONTE = "brapi · B3"
const VALIDADE_MS = 15 * 60 * 1000

export interface PrecoDeAtivo {
  ticker: string
  /** Preço em reais (ex.: 49.12). */
  preco: number
  /** Variação do dia em pontos percentuais, quando a fonte informa. */
  variacaoPercentual: number | null
  fonte: string
}

const cache = new Map<string, { em: number; preco: PrecoDeAtivo }>()

export async function precosDeAtivos(tickers: string[]): Promise<PrecoDeAtivo[]> {
  const limpos = [...new Set(tickers.map((t) => t.trim().toUpperCase()).filter(Boolean))].slice(0, 20)
  if (!limpos.length) return []

  const agora = Date.now()
  const emCache = limpos.filter((t) => { const linha = cache.get(t); return linha && agora - linha.em < VALIDADE_MS })
  const buscar = limpos.filter((t) => !emCache.includes(t))

  if (buscar.length) {
    try {
      const controle = new AbortController()
      const prazo = setTimeout(() => controle.abort(), 8000)
      const resposta = await fetch(`https://brapi.dev/api/quote/${buscar.join(",")}`, { signal: controle.signal, cache: "no-store" })
      clearTimeout(prazo)
      if (resposta.ok) {
        const corpo = (await resposta.json()) as { results?: { symbol?: string; regularMarketPrice?: number; regularMarketChangePercent?: number }[] }
        for (const linha of corpo.results ?? []) {
          const simbolo = linha.symbol?.toUpperCase()
          const preco = Number(linha.regularMarketPrice)
          if (!simbolo || !Number.isFinite(preco) || preco <= 0) continue
          cache.set(simbolo, {
            em: agora,
            preco: {
              ticker: simbolo,
              preco,
              variacaoPercentual: Number.isFinite(Number(linha.regularMarketChangePercent)) ? Number(linha.regularMarketChangePercent) : null,
              fonte: FONTE,
            },
          })
        }
      }
    } catch {
      // Fonte fora do ar: devolve o que já estiver em cache. Quem chama mostra
      // apenas os ativos que têm preço, sem estimar os outros.
    }
  }

  return limpos.map((t) => cache.get(t)?.preco).filter((linha): linha is PrecoDeAtivo => Boolean(linha))
}
