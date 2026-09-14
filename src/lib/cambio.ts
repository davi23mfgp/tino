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

const VALIDADE_MS = 60 * 60 * 1000

export interface Cotacao {
  /** Reais por um dólar, como número (ex.: 5.1262). */
  valor: number
  /** Data de fechamento informada pela fonte, em ISO curto (AAAA-MM-DD). */
  data: string
  fonte: string
}

/**
 * Duas fontes, nesta ordem.
 *
 * A AwesomeAPI publica o câmbio do Banco Central e é a melhor referência para
 * o real, mas recusou as chamadas vindas da Vercel — em produção a rota
 * respondia vazio em 0,3s, rápido demais para ser tempo esgotado. A segunda
 * fonte cobre esse caso. Nenhuma das duas exige chave.
 */
const FONTES: { nome: string; endereco: string; ler: (corpo: unknown) => Cotacao | null }[] = [
  {
    // PTAX, a cotação oficial publicada pelo Banco Central. A janela de sete
    // dias cobre feriado e fim de semana, quando não há publicação no dia.
    nome: "Banco Central · PTAX",
    endereco: (() => {
      const hoje = new Date()
      const inicio = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000)
      const americana = (data: Date) => `${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}-${data.getFullYear()}`
      return `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarPeriodo(dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)?@dataInicial='${americana(inicio)}'&@dataFinalCotacao='${americana(hoje)}'&$top=1&$orderby=dataHoraCotacao%20desc&$format=json`
    })(),
    ler: (corpo) => {
      const linha = (corpo as { value?: { cotacaoVenda?: number; dataHoraCotacao?: string }[] }).value?.[0]
      const valor = Number(linha?.cotacaoVenda)
      if (!Number.isFinite(valor) || valor <= 0) return null
      return { valor, data: (linha?.dataHoraCotacao ?? "").slice(0, 10), fonte: "Banco Central · PTAX" }
    },
  },
  {
    nome: "AwesomeAPI · Banco Central",
    endereco: "https://economia.awesomeapi.com.br/json/last/USD-BRL",
    ler: (corpo) => {
      const dados = (corpo as { USDBRL?: { bid?: string; create_date?: string } }).USDBRL
      const valor = Number(dados?.bid)
      if (!Number.isFinite(valor) || valor <= 0) return null
      return { valor, data: (dados?.create_date ?? "").slice(0, 10), fonte: "AwesomeAPI · Banco Central" }
    },
  },
  {
    nome: "exchangerate-api",
    endereco: "https://open.er-api.com/v6/latest/USD",
    ler: (corpo) => {
      const dados = corpo as { rates?: { BRL?: number }; time_last_update_unix?: number }
      const valor = Number(dados.rates?.BRL)
      if (!Number.isFinite(valor) || valor <= 0) return null
      const quando = dados.time_last_update_unix ? new Date(dados.time_last_update_unix * 1000) : new Date()
      return { valor, data: quando.toISOString().slice(0, 10), fonte: "exchangerate-api" }
    },
  },
]

let cache: { em: number; cotacao: Cotacao } | null = null

export async function cotacaoDoDolar(): Promise<Cotacao | null> {
  if (cache && Date.now() - cache.em < VALIDADE_MS) return cache.cotacao

  for (const fonte of FONTES) {
    try {
      const controle = new AbortController()
      const prazo = setTimeout(() => controle.abort(), 6000)
      const resposta = await fetch(fonte.endereco, { signal: controle.signal, cache: "no-store" })
      clearTimeout(prazo)
      if (!resposta.ok) { console.error(`cambio: ${fonte.nome} respondeu ${resposta.status}`); continue }

      const cotacao = fonte.ler(await resposta.json())
      if (!cotacao) continue
      cache = { em: Date.now(), cotacao }
      return cotacao
    } catch (falha) {
      // Fonte fora do ar ou recusando a chamada: tenta a próxima. O motivo vai
      // para o log do servidor porque, em produção, "veio vazio" não diz se a
      // fonte recusou, demorou ou mudou de formato.
      console.error(`cambio: ${fonte.nome} falhou`, falha instanceof Error ? falha.message : falha)
    }
  }

  // Sem nenhuma fonte: devolve o último valor bom, que a tela mostra com a
  // data dele. Sem valor nenhum, quem chama pede à mão.
  return cache?.cotacao ?? null
}
