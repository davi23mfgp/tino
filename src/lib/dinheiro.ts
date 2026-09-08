/**
 * Dinheiro em centavos.
 *
 * Todo valor monetário do Tino é um Int de centavos. Float em dinheiro
 * acumula erro (0.1 + 0.2 !== 0.3) e, somado mês a mês, faz o extrato não
 * fechar com o banco. Converte-se para reais só na borda: exibição e entrada.
 */

/** "1.234,56" | "1234.56" | "R$ 1.234,56" | 1234.56  ->  123456 */
export function paraCentavos(entrada: string | number): number {
  if (typeof entrada === "number") return Math.round(entrada * 100)

  let texto = entrada.trim().replace(/[R$\s ]/g, "")
  if (!texto) return 0

  const negativo = /^-/.test(texto) || /^\(.*\)$/.test(texto)
  texto = texto.replace(/[()\-+]/g, "")

  const temVirgula = texto.includes(",")
  const temPonto = texto.includes(".")

  if (temVirgula && temPonto) {
    // O separador decimal é o último que aparece: "1.234,56" (BR) x "1,234.56" (US).
    const decimal = texto.lastIndexOf(",") > texto.lastIndexOf(".") ? "," : "."
    const milhar = decimal === "," ? "." : ","
    texto = texto.split(milhar).join("").replace(decimal, ".")
  } else if (temVirgula) {
    texto = texto.replace(",", ".")
  } else if (temPonto) {
    // "1.234" sem centavos é milhar; "12.34" é decimal. Decide pelo tamanho
    // do último grupo: 3 dígitos = milhar.
    const partes = texto.split(".")
    const ultimo = partes[partes.length - 1]
    if (partes.length > 1 && ultimo.length === 3) texto = partes.join("")
  }

  const numero = Number(texto)
  if (!Number.isFinite(numero)) return 0
  return Math.round(numero * 100) * (negativo ? -1 : 1)
}

export function paraReais(centavos: number): number {
  return centavos / 100
}

const FORMATADOR = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
})

const FORMATADOR_SEM_SIMBOLO = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatarMoeda(centavos: number, comSimbolo = true): string {
  const reais = paraReais(centavos)
  return comSimbolo ? FORMATADOR.format(reais) : FORMATADOR_SEM_SIMBOLO.format(reais)
}

/**
 * Número decimal escrito como brasileiro escreve: vírgula, não ponto.
 *
 * O dinheiro sempre passou pelo `Intl` e saía certo. Quem escapava era o número
 * DERIVADO — meses de folga, taxa ao mês, meses de renda — escrito com
 * `toFixed()` direto, que devolve ponto. A tela dizia "0.8 meses" no meio de um
 * app inteiro em português.
 *
 * Não use em número que vai para uma API: ali o ponto é o separador correto, e
 * trocar quebra a integração. Isto é só para texto que a pessoa lê.
 */
export function formatarDecimal(valor: number, casas = 1): string {
  return valor.toFixed(casas).replace(".", ",")
}

/** Versão curta para gráficos e cartões: R$ 12,3 mil / R$ 1,2 mi. */
export function formatarMoedaCurta(centavos: number): string {
  const reais = Math.abs(paraReais(centavos))
  const sinal = centavos < 0 ? "-" : ""
  if (reais >= 1_000_000) return `${sinal}R$ ${(reais / 1_000_000).toFixed(1).replace(".", ",")} mi`
  if (reais >= 1_000) return `${sinal}R$ ${(reais / 1_000).toFixed(1).replace(".", ",")} mil`
  return formatarMoeda(centavos)
}

/** Pontos-base -> fração. 250 bps = 0,025 (2,5%). */
export function bpsParaTaxa(bps: number): number {
  return bps / 10_000
}

/** Fração -> pontos-base. 0,025 -> 250. */
export function taxaParaBps(taxa: number): number {
  return Math.round(taxa * 10_000)
}

export function formatarPercentual(bps: number, casas = 2): string {
  return `${(bps / 100).toFixed(casas).replace(".", ",")}%`
}

/**
 * Divide um valor entre N pessoas sem perder centavo.
 * 1000 / 3 = 334, 333, 333 — a sobra vai para os primeiros.
 */
export function ratear(centavos: number, partes: number): number[] {
  if (partes <= 0) return []
  const base = Math.floor(Math.abs(centavos) / partes)
  const sobra = Math.abs(centavos) - base * partes
  const sinal = centavos < 0 ? -1 : 1
  return Array.from({ length: partes }, (_, i) => sinal * (base + (i < sobra ? 1 : 0)))
}

/** Rateio por peso (ex.: casal divide pela renda de cada um). */
export function ratearPorPeso(centavos: number, pesos: number[]): number[] {
  const total = pesos.reduce((soma, peso) => soma + peso, 0)
  if (total <= 0) return ratear(centavos, pesos.length)

  const bruto = pesos.map((peso) => Math.floor((centavos * peso) / total))
  let resto = centavos - bruto.reduce((soma, valor) => soma + valor, 0)
  // O resto da divisão inteira é distribuído de um em um: a soma tem de bater
  // exatamente com o valor original, senão o rateio "perde" centavos.
  for (let i = 0; resto > 0; i = (i + 1) % bruto.length) {
    bruto[i] += 1
    resto -= 1
  }
  return bruto
}
