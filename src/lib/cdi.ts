/**
 * O CDI do mês, direto do Banco Central.
 *
 * Série 4391 do SGS: "CDI acumulado no mês", em porcentagem. É API aberta do
 * próprio Banco Central — sem cadastro, sem chave, sem intermediário. A brapi,
 * que já serve as cotações, passou a exigir token para taxas; a fonte primária
 * não exige, e é a fonte primária.
 *
 * Serve para uma coisa só: comparar o que a carteira rendeu com o que teria
 * rendido parada no CDI. Sem essa referência, "rendeu 0,8% no mês" não diz se
 * foi bom — e é a comparação que todo app de investimento mostra porque é a
 * que a pessoa faz de cabeça de qualquer jeito.
 */

const FONTE = "Banco Central · SGS 4391"
const VALIDADE_MS = 12 * 60 * 60 * 1000

export interface CdiDoMes {
  /** Percentual acumulado no mês (0.47 = 0,47%). */
  percentual: number
  /** Competência a que se refere, AAAA-MM. */
  competencia: string
  fonte: string
}

let cache: { em: number; valor: CdiDoMes } | null = null

export async function cdiDoMes(): Promise<CdiDoMes | null> {
  if (cache && Date.now() - cache.em < VALIDADE_MS) return cache.valor

  try {
    const controle = new AbortController()
    const relogio = setTimeout(() => controle.abort(), 6000)

    const resposta = await fetch(
      "https://api.bcb.gov.br/dados/serie/bcdata.sgs.4391/dados/ultimos/1?formato=json",
      { signal: controle.signal, headers: { accept: "application/json" } },
    )
    clearTimeout(relogio)
    if (!resposta.ok) return null

    const linhas = (await resposta.json()) as { data: string; valor: string }[]
    const linha = linhas?.[0]
    if (!linha) return null

    const percentual = Number(linha.valor.replace(",", "."))
    if (!Number.isFinite(percentual)) return null

    // A série vem como "01/09/2026": dia, mês, ano.
    const [, mes, ano] = linha.data.split("/")
    const valor: CdiDoMes = { percentual, competencia: `${ano}-${mes}`, fonte: FONTE }

    cache = { em: Date.now(), valor }
    return valor
  } catch {
    // Fonte fora do ar não derruba a tela: sem CDI, a comparação some e o
    // resto do painel continua. Número inventado aqui seria pior.
    return null
  }
}
