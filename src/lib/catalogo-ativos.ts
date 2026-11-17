/**
 * Catálogo de investimentos: a pessoa escreve o nome ("petrobras", "tesouro",
 * "cdb") e escolhe na lista, em vez de saber o código de cor.
 *
 * Duas fontes, de propósito:
 * - o que é negociado em bolsa vem da busca do Yahoo Finance, a mesma fonte
 *   que já serve o gráfico em `mercado.ts`. Nenhuma chave nova.
 * - renda fixa não tem código de bolsa. CDB, LCI, LCA e Tesouro entram por
 *   uma lista fixa de TIPOS, sem taxa nenhuma: a taxa é a do contrato da
 *   pessoa, e ela informa. Lista com taxa "típica" seria número inventado.
 */

export type ClasseDoCatalogo = "ACOES" | "FII" | "RENDA_FIXA" | "INTERNACIONAL" | "CRIPTO"

export interface ItemDoCatalogo {
  /** Código para cotação, quando existe. Renda fixa não tem. */
  ticker: string | null
  nome: string
  /** Texto curto para a lista: "Ação · B3", "Renda fixa · rende pelo CDI". */
  descricao: string
  classe: ClasseDoCatalogo
  /** O que o Tino sabe calcular sozinho para este item. */
  rendimento: "cotacao" | "cdi" | "manual"
}

const RENDA_FIXA: (ItemDoCatalogo & { palavras: string[] })[] = [
  { ticker: null, nome: "CDB", descricao: "Renda fixa · rende um percentual do CDI", classe: "RENDA_FIXA", rendimento: "cdi", palavras: ["cdb", "renda fixa", "banco"] },
  { ticker: null, nome: "LCI", descricao: "Renda fixa · rende um percentual do CDI, sem imposto de renda", classe: "RENDA_FIXA", rendimento: "cdi", palavras: ["lci", "renda fixa", "imobiliario"] },
  { ticker: null, nome: "LCA", descricao: "Renda fixa · rende um percentual do CDI, sem imposto de renda", classe: "RENDA_FIXA", rendimento: "cdi", palavras: ["lca", "renda fixa", "agronegocio"] },
  { ticker: null, nome: "Conta que rende (caixinha, cofrinho)", descricao: "Renda fixa · rende um percentual do CDI", classe: "RENDA_FIXA", rendimento: "cdi", palavras: ["caixinha", "cofrinho", "conta remunerada", "rende", "nubank", "picpay", "mercado pago"] },
  { ticker: null, nome: "Tesouro Selic", descricao: "Tesouro Direto · acompanha a taxa Selic, muito perto do CDI", classe: "RENDA_FIXA", rendimento: "cdi", palavras: ["tesouro", "selic", "lft"] },
  { ticker: null, nome: "Tesouro IPCA+", descricao: "Tesouro Direto · o preço muda todo dia: informe o valor de vez em quando", classe: "RENDA_FIXA", rendimento: "manual", palavras: ["tesouro", "ipca", "ntn", "inflacao"] },
  { ticker: null, nome: "Tesouro Prefixado", descricao: "Tesouro Direto · o preço muda todo dia: informe o valor de vez em quando", classe: "RENDA_FIXA", rendimento: "manual", palavras: ["tesouro", "prefixado", "ltn"] },
  { ticker: null, nome: "Poupança", descricao: "Poupança · informe o valor de vez em quando", classe: "RENDA_FIXA", rendimento: "manual", palavras: ["poupanca"] },
]

function semAcento(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim()
}

/** Tipos de renda fixa que combinam com o que a pessoa escreveu. */
export function rendaFixaDoCatalogo(texto: string): ItemDoCatalogo[] {
  const busca = semAcento(texto)
  if (busca.length < 2) return []
  return RENDA_FIXA
    .filter((item) => semAcento(item.nome).includes(busca) || item.palavras.some((palavra) => palavra.startsWith(busca) || busca.includes(palavra)))
    .map(({ palavras: _palavras, ...item }) => item)
}

interface RespostaDaBusca {
  quotes?: { symbol?: string; shortname?: string; longname?: string; quoteType?: string; exchange?: string }[]
}

/**
 * Lê a busca do Yahoo. Pura e testada com resposta gravada, porque o formato
 * não é documentado. Só passa o que o Tino sabe cotar e classificar: ação,
 * fundo e ETF (B3 ou fora) e cripto. Opção, futuro e índice ficam de fora:
 * não são coisa que a pessoa "tem" na carteira deste app.
 */
export function lerBuscaDoYahoo(corpo: RespostaDaBusca): ItemDoCatalogo[] {
  const itens: ItemDoCatalogo[] = []
  const vistos = new Set<string>()
  for (const linha of corpo.quotes ?? []) {
    const simbolo = linha.symbol?.toUpperCase()
    const nome = (linha.longname || linha.shortname || "").trim()
    if (!simbolo || !nome) continue
    const tipo = linha.quoteType
    const daB3 = simbolo.endsWith(".SA")
    const ticker = daB3 ? simbolo.slice(0, -3) : simbolo
    if (vistos.has(ticker)) continue

    let classe: ClasseDoCatalogo
    let rotulo: string
    if (tipo === "CRYPTOCURRENCY") { classe = "CRIPTO"; rotulo = "Cripto" }
    else if (tipo === "EQUITY" || tipo === "ETF" || tipo === "MUTUALFUND") {
      // Na B3, cota de fundo imobiliário termina em 11 e o Yahoo a devolve
      // como EQUITY ou MUTUALFUND; ETF também termina em 11, mas vem como ETF.
      const fii = daB3 && /11$/.test(ticker) && tipo !== "ETF"
      classe = !daB3 ? "INTERNACIONAL" : fii ? "FII" : "ACOES"
      rotulo = !daB3 ? (tipo === "ETF" ? "ETF · fora do Brasil" : "Ação · fora do Brasil") : fii ? "Fundo imobiliário · B3" : tipo === "ETF" ? "ETF · B3" : "Ação · B3"
    } else continue

    vistos.add(ticker)
    itens.push({ ticker, nome, descricao: rotulo, classe, rendimento: "cotacao" })
  }
  // O que é da B3 primeiro: é o que quase todo mundo aqui procura.
  return itens.sort((a, b) => Number(b.descricao.endsWith("B3")) - Number(a.descricao.endsWith("B3")))
}

const VALIDADE_MS = 60 * 60 * 1000
const cache = new Map<string, { em: number; itens: ItemDoCatalogo[] }>()

/**
 * Busca completa. `fonteForaDoAr` avisa a tela quando só a parte fixa
 * respondeu: aí a pessoa ainda pode digitar o código à mão, e a tela diz isso
 * em vez de mostrar "nada encontrado" para uma ação que existe.
 */
export async function buscarNoCatalogo(texto: string): Promise<{ itens: ItemDoCatalogo[]; fonteForaDoAr: boolean }> {
  const busca = texto.trim().slice(0, 40)
  const fixos = rendaFixaDoCatalogo(busca)
  if (busca.length < 2) return { itens: [], fonteForaDoAr: false }

  const chave = semAcento(busca)
  const guardado = cache.get(chave)
  if (guardado && Date.now() - guardado.em < VALIDADE_MS) return { itens: [...fixos, ...guardado.itens], fonteForaDoAr: false }

  try {
    const controle = new AbortController()
    const prazo = setTimeout(() => controle.abort(), 6000)
    const resposta = await fetch(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(busca)}&quotesCount=12&newsCount=0&lang=pt-BR&region=BR`,
      { signal: controle.signal, cache: "no-store", headers: { accept: "application/json", "user-agent": "Mozilla/5.0" } },
    )
    clearTimeout(prazo)
    if (!resposta.ok) return { itens: fixos, fonteForaDoAr: true }
    const itens = lerBuscaDoYahoo((await resposta.json()) as RespostaDaBusca).slice(0, 8)
    cache.set(chave, { em: Date.now(), itens })
    return { itens: [...fixos, ...itens], fonteForaDoAr: false }
  } catch {
    return { itens: fixos, fonteForaDoAr: true }
  }
}
