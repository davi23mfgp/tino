/**
 * Linguagem natural para dívidas e metas — item 3 do redesign de
 * experiência (07/09/2026).
 *
 * Mesma ideia da "Anotar em segundos" das capturas (`lib/captura/notificacao.ts`,
 * `lerTextoLivre`): em vez de obrigar a pessoa a preencher de seis a oito
 * campos separados para cadastrar uma dívida ou uma meta, ela escreve como
 * falaria — "Nubank 3200, parcela 350, juros 2,5% ao mês, vence dia 10" — e
 * o Tino tenta extrair os campos. O que não for reconhecido fica em branco;
 * a tela que usa isto continua deixando a pessoa completar ou corrigir antes
 * de salvar, então um campo não lido nunca é um dado errado — só um dado que
 * falta.
 */

import { paraCentavos } from "@/lib/dinheiro"

// Casa "1.234,56", "1234,56", "1234.56" ou "1234" — mesmo padrão do leitor de
// capturas, para o "R$ 3.200" e o "3200" lerem igual.
const NUMERO = "\\d{1,3}(?:\\.\\d{3})*,\\d{2}|\\d+,\\d{2}|\\d+\\.\\d{2}|\\d+"

export interface DividaLida {
  credor: string | null
  tipo: string | null
  saldoDevedorCentavos: number | null
  jurosMensalBps: number | null
  parcelaCentavos: number | null
  parcelasTotal: number | null
  parcelasPagas: number | null
  diaVencimento: number | null
}

const TIPOS_POR_PALAVRA: [RegExp, string][] = [
  [/cheque\s*especial/i, "CHEQUE_ESPECIAL"],
  [/cart[aã]o|rotativo|fatura/i, "CARTAO_ROTATIVO"],
  [/consignado/i, "CONSIGNADO"],
  [/financiamento.*(carro|ve[ií]culo|moto)|carro.*financia/i, "FINANCIAMENTO_VEICULO"],
  [/financiamento.*(im[oó]vel|casa|apartamento)|im[oó]vel.*financia/i, "FINANCIAMENTO_IMOVEL"],
  [/estudantil|faculdade|fies/i, "ESTUDANTIL"],
  [/parcelamento|parcelado/i, "PARCELAMENTO"],
  [/empr[eé]stimo/i, "EMPRESTIMO_PESSOAL"],
]

/**
 * "Nubank 3200, juros 2,5% ao mês, parcela 350, 4 de 24, vence dia 10"
 *
 * Estratégia: consome primeiro os campos com palavra-chave própria (juros,
 * parcela, dia, contagem de parcelas) tirando-os do texto; o que sobra é o
 * credor (antes do primeiro número) e o saldo devedor (o primeiro número que
 * sobrou). Ordem importa pouco para quem escreve, mas importa muito para o
 * regex não confundir "parcela 350" com o saldo.
 */
export function lerDivida(textoOriginal: string): DividaLida {
  let texto = textoOriginal.replace(/\s+/g, " ").trim()

  // Taxa de juros: "2,5%", "2.5%" ou "3%" — decimal livre, não a mesma regra de
  // dinheiro (que exige duas casas). "2,5%" com o padrão de dinheiro perdia o
  // "2," e lia só o "5%", virando 5% em vez de 2,5%.
  const juros = /(\d+(?:[.,]\d+)?)\s*%/i.exec(texto)
  if (juros) texto = texto.replace(juros[0], " ")

  const parcela = new RegExp(`parcela(?:s)?\\s*(?:de|:)?\\s*(?:R\\$\\s*)?(${NUMERO})`, "i").exec(texto)
  if (parcela) texto = texto.replace(parcela[0], " ")

  const dia = /(?:vence\s*(?:no|em)?\s*)?dia\s*(\d{1,2})/i.exec(texto)
  if (dia) texto = texto.replace(dia[0], " ")

  // "4 de 24 parcelas", "4/24 parcelas" ou só "24 parcelas".
  const contagem = /(\d{1,3})\s*(?:\/|de)\s*(\d{1,3})\s*parcelas?/i.exec(texto)
  const totalSó = !contagem ? /(\d{1,3})\s*parcelas?/i.exec(texto) : null
  if (contagem) texto = texto.replace(contagem[0], " ")
  if (totalSó) texto = texto.replace(totalSó[0], " ")

  const tipo = TIPOS_POR_PALAVRA.find(([regex]) => regex.test(textoOriginal))?.[1] ?? null

  // O que resta: "credor NÚMERO resto" — o primeiro número solto é o saldo.
  texto = texto.replace(/\s+/g, " ").trim()
  const saldo = new RegExp(`(${NUMERO})`).exec(texto)

  let credor: string | null = null
  let saldoDevedorCentavos: number | null = null
  if (saldo) {
    saldoDevedorCentavos = paraCentavos(saldo[1])
    credor = texto.slice(0, saldo.index).trim()
  } else {
    credor = texto
  }
  credor = credor
    .replace(/^(devo|deve|dívida (com|do|da)|divida (com|do|da))\s+/i, "")
    .replace(/[,.\s]+$/, "")
    .trim()

  return {
    credor: credor || null,
    tipo,
    saldoDevedorCentavos,
    jurosMensalBps: juros ? Math.round(Number(juros[1].replace(",", ".")) * 100) : null,
    parcelaCentavos: parcela ? paraCentavos(parcela[1]) : null,
    parcelasTotal: contagem ? Number(contagem[2]) : totalSó ? Number(totalSó[1]) : null,
    parcelasPagas: contagem ? Number(contagem[1]) : null,
    diaVencimento: dia ? Number(dia[1]) : null,
  }
}

export interface MetaLida {
  nome: string | null
  alvoCentavos: number | null
  saldoCentavos: number | null
  dataAlvo: string | null // AAAA-MM-DD, primeiro dia do mês citado
}

const MESES: Record<string, number> = {
  janeiro: 0, fevereiro: 1, março: 2, marco: 2, abril: 3, maio: 4, junho: 5,
  julho: 6, agosto: 7, setembro: 8, outubro: 9, novembro: 10, dezembro: 11,
}

/**
 * "Viagem 8000 até dezembro, já tenho 1200"
 * "Reserva de emergência 15000"
 */
export function lerMeta(textoOriginal: string, agora = new Date()): MetaLida {
  let texto = textoOriginal.replace(/\s+/g, " ").trim()

  const jaTem = new RegExp(`j[aá]\\s*ten(?:ho|do)\\s*(?:R\\$\\s*)?(${NUMERO})`, "i").exec(texto)
  if (jaTem) texto = texto.replace(jaTem[0], " ")

  const prazoMes = new RegExp(
    `at[eé]\\s+(${Object.keys(MESES).join("|")})(?:\\s+de\\s+(\\d{4}))?`,
    "i",
  ).exec(texto)
  if (prazoMes) texto = texto.replace(prazoMes[0], " ")

  texto = texto.replace(/\s+/g, " ").trim()
  const alvo = new RegExp(`(${NUMERO})`).exec(texto)

  let nome: string | null = null
  let alvoCentavos: number | null = null
  if (alvo) {
    alvoCentavos = paraCentavos(alvo[1])
    nome = texto.slice(0, alvo.index).trim()
  } else {
    nome = texto
  }
  nome = nome.replace(/[,.\s]+$/, "").trim()

  let dataAlvo: string | null = null
  if (prazoMes) {
    const mes = MESES[prazoMes[1].toLowerCase()]
    const ano = prazoMes[2] ? Number(prazoMes[2]) : agora.getUTCFullYear() + (mes < agora.getUTCMonth() ? 1 : 0)
    dataAlvo = `${ano}-${String(mes + 1).padStart(2, "0")}-01`
  }

  return {
    nome: nome || null,
    alvoCentavos,
    saldoCentavos: jaTem ? paraCentavos(jaTem[1]) : null,
    dataAlvo,
  }
}
