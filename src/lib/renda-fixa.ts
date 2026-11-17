/**
 * Quanto rendeu uma aplicação atrelada ao CDI (CDB, LCI, LCA, caixinha).
 *
 * A pessoa informa só o percentual do contrato ("110% do CDI"). As datas e os
 * valores já estão no app: são as transferências para a conta do investimento.
 * A taxa de cada dia útil vem do Banco Central (SGS 12, CDI ao dia). Assim o
 * saldo deixa de ser digitado, e cada aplicação rende desde o SEU dia, não
 * desde o dia da primeira.
 *
 * O resultado é BRUTO: antes do imposto de renda (que em CDB cai de 22,5% a
 * 15% conforme o prazo) e do IOF dos primeiros 30 dias. A tela tem de dizer
 * "bruto, antes do imposto"; líquido calculado aqui pareceria o valor de
 * resgate, e o banco é quem sabe esse número.
 */

export interface TaxaDoDia {
  /** AAAA-MM-DD, só dia útil (a série não tem fim de semana). */
  data: string
  /** CDI do dia em porcentagem ao dia (0.0551 = 0,0551%). */
  percentual: number
}

export interface MovimentoDaAplicacao {
  /** AAAA-MM-DD. */
  data: string
  /** Positivo: aplicou. Negativo: resgatou. */
  valorCentavos: number
}

export interface ResultadoPeloCdi {
  aplicadoCentavos: number
  valorBrutoCentavos: number
  rendimentoBrutoCentavos: number
  /** Último dia com taxa publicada: é até onde a conta vai. */
  ate: string | null
}

/**
 * A aplicação feita no dia D começa a render no dia útil D (a taxa do dia D
 * leva o dinheiro para D+1). O resgate sai pelo valor de face, depois do
 * rendimento do dia anterior.
 */
export function valorPeloCdi(movimentos: MovimentoDaAplicacao[], percentualDoCdiBps: number, taxas: TaxaDoDia[]): ResultadoPeloCdi {
  const ordenados = [...movimentos].sort((a, b) => a.data.localeCompare(b.data))
  const dias = [...taxas].sort((a, b) => a.data.localeCompare(b.data))
  const aplicadoCentavos = ordenados.reduce((soma, m) => soma + m.valorCentavos, 0)
  if (!dias.length) return { aplicadoCentavos, valorBrutoCentavos: aplicadoCentavos, rendimentoBrutoCentavos: 0, ate: null }

  const proporcao = percentualDoCdiBps / 10_000
  let saldo = 0
  let proximo = 0
  for (const dia of dias) {
    while (proximo < ordenados.length && ordenados[proximo].data <= dia.data) saldo += ordenados[proximo++].valorCentavos
    if (saldo > 0) saldo *= 1 + (dia.percentual / 100) * proporcao
  }
  // Movimento depois da última taxa publicada (hoje, por exemplo) entra sem render.
  while (proximo < ordenados.length) saldo += ordenados[proximo++].valorCentavos

  const valorBrutoCentavos = Math.max(0, Math.round(saldo))
  return { aplicadoCentavos, valorBrutoCentavos, rendimentoBrutoCentavos: valorBrutoCentavos - aplicadoCentavos, ate: dias[dias.length - 1].data }
}

/** Lê a resposta do SGS: `[{ data: "02/01/2026", valor: "0.055131" }]`. */
export function lerSerieDoCdi(linhas: { data?: string; valor?: string }[]): TaxaDoDia[] {
  const taxas: TaxaDoDia[] = []
  for (const linha of linhas ?? []) {
    const partes = linha.data?.split("/")
    const percentual = Number(String(linha.valor ?? "").replace(",", "."))
    if (partes?.length !== 3 || !Number.isFinite(percentual) || percentual < 0) continue
    taxas.push({ data: `${partes[2]}-${partes[1]}-${partes[0]}`, percentual })
  }
  return taxas
}

const VALIDADE_MS = 6 * 60 * 60 * 1000
const cache = new Map<string, { em: number; taxas: TaxaDoDia[] }>()

/** CDI diário desde `desde` (AAAA-MM-DD). Nulo quando a fonte não responde. */
export async function cdiDiarioDesde(desde: string): Promise<TaxaDoDia[] | null> {
  // Por mês: várias aplicações do mesmo mês dividem a mesma busca.
  const inicio = `${desde.slice(0, 7)}-01`
  const guardado = cache.get(inicio)
  if (guardado && Date.now() - guardado.em < VALIDADE_MS) return guardado.taxas
  try {
    const controle = new AbortController()
    const prazo = setTimeout(() => controle.abort(), 8000)
    const [ano, mes, dia] = inicio.split("-")
    const hoje = new Date().toISOString().slice(0, 10).split("-")
    const resposta = await fetch(
      `https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados?formato=json&dataInicial=${dia}/${mes}/${ano}&dataFinal=${hoje[2]}/${hoje[1]}/${hoje[0]}`,
      { signal: controle.signal, headers: { accept: "application/json" }, cache: "no-store" },
    )
    clearTimeout(prazo)
    if (!resposta.ok) return null
    const taxas = lerSerieDoCdi(await resposta.json())
    if (!taxas.length) return null
    cache.set(inicio, { em: Date.now(), taxas })
    return taxas
  } catch {
    return null
  }
}
