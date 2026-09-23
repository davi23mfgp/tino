/**
 * Mercado: preço, histórico curto e os indicadores do dia (Davi, 23/09:
 * "algo como se fosse uma corretora, que me desse coisas do mercado").
 *
 * A fonte de preço e histórico é o endpoint de gráfico do Yahoo Finance, que
 * não pede chave e cobre as três coisas que a tela precisa numa chamada só:
 * B3 (sufixo `.SA`), bolsa americana e índices/moedas (`^BVSP`, `USDBRL=X`).
 * A brapi, que o Tino já usava para o preço do dia, passou a exigir token para
 * histórico; fica como reserva do preço quando o Yahoo falhar.
 *
 * Taxas (Selic) vêm do Banco Central, como o CDI em `cdi.ts`: fonte primária,
 * aberta.
 *
 * Nada aqui mexe no saldo das contas. O preço serve para mostrar o valor de
 * mercado ao lado do que foi aportado; a diferença vira lançamento só quando
 * alguém manda (mesma regra de `cotacoes.ts`).
 *
 * Sem resposta da fonte, o ativo simplesmente não volta — a tela mostra o
 * valor cadastrado e diz que está sem cotação. Nenhum preço é estimado.
 */

import { precosDeAtivos } from "@/lib/cotacoes"

export type Periodo = "1d" | "1mo" | "6mo" | "1y"

export const PERIODOS: { periodo: Periodo; rotulo: string; intervalo: string }[] = [
  { periodo: "1d", rotulo: "Hoje", intervalo: "15m" },
  { periodo: "1mo", rotulo: "1 mês", intervalo: "1d" },
  { periodo: "6mo", rotulo: "6 meses", intervalo: "1d" },
  { periodo: "1y", rotulo: "1 ano", intervalo: "1wk" },
]

export interface SerieDeAtivo {
  /** O código como a pessoa cadastrou (PETR4, AAPL). */
  ticker: string
  nome: string | null
  moeda: string
  preco: number
  /** Preço no começo do período — a base da variação. */
  precoInicial: number
  /** Variação no período, em pontos percentuais (1,5 = 1,5%). */
  variacaoPercentual: number
  /** Fechamentos do período, já sem buracos, para o gráfico. */
  serie: number[]
  /** Quando a fonte registrou o último preço (ISO). */
  em: string | null
  fonte: string
}

export interface IndicadorDoMercado {
  chave: string
  rotulo: string
  /** Valor para exibir já formatado pela tela: pontos, reais ou % a.a. */
  valor: number
  unidade: "pontos" | "BRL" | "USD" | "%a.a."
  variacaoPercentual: number | null
  serie: number[]
  fonte: string
}

const FONTE_YAHOO = "Yahoo Finance"
const VALIDADE_MS = 10 * 60 * 1000
const cache = new Map<string, { em: number; valor: SerieDeAtivo | null }>()

/**
 * O símbolo que o Yahoo entende. Código da B3 (quatro letras e um ou dois
 * dígitos, com ou sem F de fracionário) ganha `.SA`; o resto passa como veio —
 * AAPL, ^BVSP e USDBRL=X já são símbolos do Yahoo.
 */
export function simboloNoYahoo(ticker: string): string {
  const limpo = ticker.trim().toUpperCase()
  if (/^[A-Z]{4}\d{1,2}F?$/.test(limpo)) return `${limpo.replace(/F$/, "")}.SA`
  return limpo
}

interface RespostaDoGrafico {
  chart?: {
    result?: {
      meta?: {
        currency?: string
        symbol?: string
        shortName?: string
        longName?: string
        regularMarketPrice?: number
        chartPreviousClose?: number
        previousClose?: number
        regularMarketTime?: number
      }
      timestamp?: number[]
      indicators?: { quote?: { close?: (number | null)[] }[] }
    }[]
    error?: unknown
  }
}

/**
 * Lê a resposta do gráfico do Yahoo. Função pura, testada com respostas
 * gravadas: o formato não é documentado oficialmente, e é aqui que ele
 * quebraria.
 *
 * No período de um dia a base é o fechamento anterior (`chartPreviousClose`),
 * não o primeiro preço do pregão — é assim que toda corretora mostra "hoje", e
 * o primeiro preço do dia já embute a abertura com salto.
 */
export function lerGrafico(ticker: string, corpo: RespostaDoGrafico, periodo: Periodo): SerieDeAtivo | null {
  const resultado = corpo.chart?.result?.[0]
  const meta = resultado?.meta
  if (!resultado || !meta) return null

  const serie = (resultado.indicators?.quote?.[0]?.close ?? []).filter((valor): valor is number => typeof valor === "number" && Number.isFinite(valor) && valor > 0)
  const preco = Number(meta.regularMarketPrice) > 0 ? Number(meta.regularMarketPrice) : serie.at(-1)
  if (!preco) return null
  if (serie.length === 0 || serie.at(-1) !== preco) serie.push(preco)

  const anterior = Number(meta.chartPreviousClose ?? meta.previousClose)
  const precoInicial = periodo === "1d" && anterior > 0 ? anterior : serie[0]

  return {
    ticker: ticker.trim().toUpperCase(),
    nome: meta.shortName ?? meta.longName ?? null,
    moeda: meta.currency ?? "BRL",
    preco,
    precoInicial,
    variacaoPercentual: precoInicial > 0 ? ((preco - precoInicial) / precoInicial) * 100 : 0,
    serie,
    em: meta.regularMarketTime ? new Date(meta.regularMarketTime * 1000).toISOString() : null,
    fonte: FONTE_YAHOO,
  }
}

async function buscarGrafico(ticker: string, periodo: Periodo): Promise<SerieDeAtivo | null> {
  const chave = `${ticker.toUpperCase()}|${periodo}`
  const guardado = cache.get(chave)
  if (guardado && Date.now() - guardado.em < VALIDADE_MS) return guardado.valor

  const intervalo = PERIODOS.find((item) => item.periodo === periodo)?.intervalo ?? "1d"
  try {
    const controle = new AbortController()
    const prazo = setTimeout(() => controle.abort(), 8000)
    const resposta = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(simboloNoYahoo(ticker))}?range=${periodo}&interval=${intervalo}`,
      // Sem user-agent de navegador o Yahoo responde 429 para servidor.
      { signal: controle.signal, cache: "no-store", headers: { "user-agent": "Mozilla/5.0 (compatible; Tino/1.0)", accept: "application/json" } },
    )
    clearTimeout(prazo)
    const valor = resposta.ok ? lerGrafico(ticker, (await resposta.json()) as RespostaDoGrafico, periodo) : null
    // Falha também entra no cache, por menos tempo: sem isso, cada visita
    // refaria a chamada que acabou de falhar.
    cache.set(chave, { em: valor ? Date.now() : Date.now() - VALIDADE_MS + 60_000, valor })
    return valor
  } catch {
    return guardado?.valor ?? null
  }
}

/**
 * Preço e histórico dos ativos da carteira. Quem o Yahoo não trouxer tenta a
 * brapi, só com o preço do dia (sem gráfico): melhor um número real sem linha
 * do que uma linha inventada.
 */
export async function seriesDosAtivos(tickers: string[], periodo: Periodo): Promise<SerieDeAtivo[]> {
  const limpos = [...new Set(tickers.map((ticker) => ticker.trim().toUpperCase()).filter(Boolean))].slice(0, 20)
  const series = await Promise.all(limpos.map((ticker) => buscarGrafico(ticker, periodo)))
  const encontrados = series.filter((serie): serie is SerieDeAtivo => serie !== null)

  const faltando = limpos.filter((ticker) => !encontrados.some((serie) => serie.ticker === ticker))
  if (faltando.length) {
    for (const preco of await precosDeAtivos(faltando)) {
      encontrados.push({
        ticker: preco.ticker,
        nome: null,
        moeda: "BRL",
        preco: preco.preco,
        precoInicial: preco.variacaoPercentual !== null ? preco.preco / (1 + preco.variacaoPercentual / 100) : preco.preco,
        variacaoPercentual: preco.variacaoPercentual ?? 0,
        serie: [],
        em: null,
        fonte: preco.fonte,
      })
    }
  }
  return encontrados
}

const INDICES: { chave: string; rotulo: string; simbolo: string; unidade: IndicadorDoMercado["unidade"] }[] = [
  { chave: "ibov", rotulo: "Ibovespa", simbolo: "^BVSP", unidade: "pontos" },
  { chave: "dolar", rotulo: "Dólar", simbolo: "USDBRL=X", unidade: "BRL" },
  { chave: "sp500", rotulo: "S&P 500", simbolo: "^GSPC", unidade: "pontos" },
  { chave: "bitcoin", rotulo: "Bitcoin", simbolo: "BTC-USD", unidade: "USD" },
]

let selicEmCache: { em: number; valor: number } | null = null

/** Meta da Selic, % ao ano. SGS 432 do Banco Central. */
async function selicMeta(): Promise<number | null> {
  if (selicEmCache && Date.now() - selicEmCache.em < 12 * 60 * 60 * 1000) return selicEmCache.valor
  try {
    const controle = new AbortController()
    const prazo = setTimeout(() => controle.abort(), 6000)
    const resposta = await fetch("https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json", { signal: controle.signal, headers: { accept: "application/json" } })
    clearTimeout(prazo)
    if (!resposta.ok) return null
    const valor = Number(((await resposta.json()) as { valor: string }[])?.[0]?.valor?.replace(",", "."))
    if (!Number.isFinite(valor)) return null
    selicEmCache = { em: Date.now(), valor }
    return valor
  } catch {
    return selicEmCache?.valor ?? null
  }
}

/** O painel "Mercado agora": índices do dia e a Selic. Só o que a fonte trouxe. */
export async function indicadoresDoMercado(): Promise<IndicadorDoMercado[]> {
  const [series, selic] = await Promise.all([Promise.all(INDICES.map((indice) => buscarGrafico(indice.simbolo, "1d"))), selicMeta()])
  const lista: IndicadorDoMercado[] = []
  INDICES.forEach((indice, posicao) => {
    const serie = series[posicao]
    if (!serie) return
    lista.push({ chave: indice.chave, rotulo: indice.rotulo, valor: serie.preco, unidade: indice.unidade, variacaoPercentual: serie.variacaoPercentual, serie: serie.serie, fonte: serie.fonte })
  })
  if (selic !== null) lista.push({ chave: "selic", rotulo: "Selic", valor: selic, unidade: "%a.a.", variacaoPercentual: null, serie: [], fonte: "Banco Central · SGS 432" })
  return lista
}

/**
 * Quanto a posição ganhou ou perdeu no período, em centavos.
 *
 * Com quantidade, é a conta da corretora: quantidade × (preço de hoje − preço
 * do começo). Sem quantidade (a pessoa cadastrou só o valor), aplica-se a
 * variação ao valor da posição — é o mesmo resultado se o valor cadastrado for
 * o de mercado, e é a melhor conta possível sem saber quantas cotas há.
 */
export function resultadoNoPeriodoCentavos(entrada: { valorCentavos: number; quantidadeMilesimos: number | null; preco: number; precoInicial: number; cambio: number }): number {
  if (entrada.precoInicial <= 0) return 0
  if (entrada.quantidadeMilesimos) {
    return Math.round(((entrada.quantidadeMilesimos / 1000) * (entrada.preco - entrada.precoInicial) * entrada.cambio) * 100)
  }
  const variacao = (entrada.preco - entrada.precoInicial) / entrada.precoInicial
  return Math.round(entrada.valorCentavos - entrada.valorCentavos / (1 + variacao))
}
