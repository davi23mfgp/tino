/**
 * Dinheiro dito em voz alta.
 *
 * O `lerTextoLivre` entende o formato de quem digita — "mercado 52,30", número
 * colado numa ponta da frase. Ninguém fala assim: sai "paguei cinquenta e dois
 * reais e trinta centavos no mercado", com o valor no meio, por extenso, e a
 * moeda dita em vez de escrita.
 *
 * Este arquivo cobre essa distância. Não substitui o leitor de digitado: é o
 * que roda quando ele não achou valor nenhum.
 *
 * **Escopo deliberado:** vai até 999 e não trata milhar por extenso. Gasto do
 * dia a dia, que é o que se anota por recado de voz, mora bem abaixo disso, e
 * cada regra a mais é uma chance a mais de ler o valor errado — num lançamento
 * financeiro, errar em silêncio é pior do que não entender.
 */

const UNIDADES: Record<string, number> = {
  zero: 0, um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5,
  seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, onze: 11, doze: 12, treze: 13,
  quatorze: 14, catorze: 14, quinze: 15, dezesseis: 16, dezessete: 17,
  dezoito: 18, dezenove: 19,
}

const DEZENAS: Record<string, number> = {
  vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50, sessenta: 60,
  setenta: 70, oitenta: 80, noventa: 90,
}

const CENTENAS: Record<string, number> = {
  cem: 100, cento: 100, duzentos: 200, trezentos: 300, quatrocentos: 400,
  quinhentos: 500, seiscentos: 600, setecentos: 700, oitocentos: 800,
  novecentos: 900,
}

/** Tira acento e caixa: "três" e "tres" têm de cair no mesmo lugar. */
export function achatar(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
}

const PALAVRAS_DE_NUMERO = new Set([...Object.keys(UNIDADES), ...Object.keys(DEZENAS), ...Object.keys(CENTENAS)])

/**
 * Lê um número por extenso ou em algarismo.
 *
 * Devolve `null` quando a sequência não é número — e não zero, que seria
 * indistinguível de "zero" dito de verdade.
 */
export function numeroFalado(trecho: string): number | null {
  const palavras = achatar(trecho).split(/[ ]+/).filter((p) => p && p !== "e")
  if (palavras.length === 0) return null

  let total = 0
  let achou = false

  for (const palavra of palavras) {
    if (/^\d+$/.test(palavra)) {
      total += Number(palavra)
      achou = true
      continue
    }
    const valor = CENTENAS[palavra] ?? DEZENAS[palavra] ?? UNIDADES[palavra]
    if (valor === undefined) return null
    total += valor
    achou = true
  }

  return achou ? total : null
}

/** Um número, escrito de qualquer um dos dois jeitos. */
/// Escrito com classes explícitas ([0-9], [ ]) e sem barra invertida: dentro de
/// template literal o `\d` vira `d` e o padrão passa a casar a letra.
const PALAVRAS = [...PALAVRAS_DE_NUMERO].sort((a, b) => b.length - a.length).join("|")
const NUMERO = `(?:[0-9]{1,3}|(?:${PALAVRAS})(?:[ ]+e[ ]+(?:${PALAVRAS}))*)`

export interface GastoFalado {
  valorCentavos: number
  estabelecimento: string | null
}

/// Palavras que aparecem entre o verbo e o valor ("comprei *pão,* sete e
/// cinquenta"). Guardadas porque costumam ser justamente o nome da coisa.
const FOLGA = "(?<lugar>(?:[a-z0-9]+[, ]+){0,3})"

const VERBO = "(?:paguei|gastei|comprei|custou|deu|foi)"

/**
 * Acha o valor e o lugar numa frase falada.
 *
 * A ordem dos padrões é o que garante a leitura certa: "cinquenta e dois reais
 * e trinta centavos" tem de casar inteiro antes que "cinquenta e dois reais"
 * case sozinho, senão os centavos somem sem ninguém perceber.
 */
export function lerGastoFalado(texto: string): GastoFalado | null {
  const achatado = achatar(texto).replace(/[.!?]+$/g, "").replace(/\s+/g, " ").trim()

  const padroes: RegExp[] = [
    // "cinquenta e dois reais e trinta centavos"
    new RegExp(`(?<a>${NUMERO})[ ]+(?:reais|real|conto|contos|pila)[ ]+e[ ]+(?<b>${NUMERO})[ ]+centavos?`),
    // "trinta reais" — e também "cento e vinte reais", que o NUMERO engole
    // inteiro. Por isso não existe um padrão "N e N reais" antes deste: ele
    // leria 120 como 100 reais e 20 centavos.
    new RegExp(`(?<a>${NUMERO})[ ]+(?:reais|real|conto|contos|pila)`),
    // "comprei pão, sete e cinquenta" — moeda subentendida. Só vale com verbo
    // de gasto na frente, senão qualquer "dois e três" da vida virava dinheiro.
    new RegExp(`${VERBO}[ ]+(?:uns?[ ]+)?${FOLGA}(?<a>${NUMERO})[ ]+e[ ]+(?<b>${NUMERO})(?![a-z0-9])`),
    // "paguei quarenta no posto" — valor sem moeda dita
    new RegExp(`${VERBO}[ ]+(?:uns?[ ]+)?${FOLGA}(?<a>${NUMERO})(?![a-z0-9])`),
  ]

  for (const padrao of padroes) {
    const casado = padrao.exec(achatado)
    if (!casado?.groups) continue

    const reais = numeroFalado(casado.groups.a)
    const dizCentavos = casado.groups.b !== undefined
    const valorCentavos = dizCentavos ? combinar(reais, numeroFalado(casado.groups.b)) : umValor(reais)

    // Frase que diz centavos e não fecha ("dez reais e cento e vinte
    // centavos") desiste aqui, de propósito. Cair no padrão seguinte leria
    // só "dez reais" e jogaria o resto fora sem ninguém ver — que é
    // exatamente o erro silencioso que não se pode cometer com dinheiro.
    if (valorCentavos === null) {
      if (dizCentavos) return null
      continue
    }

    return { valorCentavos, estabelecimento: ondeFoi(texto, achatado, casado) }
  }

  return null
}

/** Reais e centavos ditos separados. Centavo dito acima de 99 é transcrição errada. */
function combinar(reais: number | null, centavos: number | null): number | null {
  if (reais === null || centavos === null) return null
  if (centavos > 99) return null
  return reais * 100 + centavos
}

function umValor(reais: number | null): number | null {
  return reais === null ? null : reais * 100
}

/**
 * O lugar do gasto.
 *
 * Três chances, nesta ordem: depois de preposição ("no mercado", "na
 * farmácia"), que é onde fica na maioria das frases; o que sobrou entre o
 * verbo e o valor ("comprei *pão*, sete e cinquenta"); e o que veio antes de
 * tudo ("*mercado*, paguei cinquenta").
 *
 * O recorte sai do texto original, com acento e maiúscula — é o que a pessoa
 * vai ler na hora de conferir o lançamento.
 */
function ondeFoi(original: string, achatado: string, casado: RegExpExecArray): string | null {
  const depois = achatado.slice(casado.index + casado[0].length)
  const preposicao = /(?:^|[ ])(?:no|na|em|do|da|nos|nas|pra|para|pro)[ ]+(.+)$/.exec(depois)

  const bruto =
    preposicao?.[1] ??
    limparSobra(casado.groups?.lugar ?? "") ??
    limparSobra(depois) ??
    limparSobra(achatado.slice(0, casado.index)) ??
    ""

  const limpo = bruto
    .replace(/[.!?,]+$/g, "")
    .replace(/(?:^|[ ])(?:hoje|agora|ontem|de[ ]+manha|a[ ]+tarde|a[ ]+noite)(?=[ ]|$)/g, "")
    .trim()

  if (!limpo) return null

  const posicao = achatar(original).indexOf(limpo)
  return posicao >= 0 ? original.slice(posicao, posicao + limpo.length).trim() : limpo
}

/** Tira verbo, artigo e preposição; devolve `null` quando não sobrou nome. */
function limparSobra(trecho: string): string | null {
  const limpo = trecho
    .replace(/(?:^|[ ])(?:paguei|gastei|comprei|custou|deu|foi|uns?|uma?|de|do|da|no|na|em|o|a)(?=[ ]|$)/g, " ")
    .replace(/[,\s]+$/g, "")
    .replace(/^[,\s]+/g, "")
    .trim()
  return limpo || null
}
