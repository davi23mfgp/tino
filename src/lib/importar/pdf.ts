/**
 * Leitor de extrato e fatura em PDF.
 *
 * PDF de banco não tem estrutura de tabela: o texto extraído vem como linhas
 * soltas. A estratégia é procurar, em cada linha, o trio data + descrição +
 * valor. O que não casar volta para o usuário como "linha não reconhecida"
 * em vez de ser adivinhado — chute em extrato vira erro de saldo.
 *
 * Fatura de cartão tem leitura própria (`lerFatura`), porque quase tudo nela
 * contraria o extrato de conta: valor positivo é gasto, a data vem sem ano e
 * pode ser de um ano atrás (parcela), metade da página é resumo e limite, e
 * a lista de parcelas das PRÓXIMAS faturas tem a mesma cara de lançamento.
 * Ler fatura como extrato fez uma fatura do Itaú entrar com toda compra como
 * receita, o limite do cartão como lançamento de 2029 e as parcelas do mês
 * seguinte em dobro.
 */

import { extractText, getDocumentProxy } from "unpdf"

import { lerData } from "@/lib/datas"
import { paraCentavos } from "@/lib/dinheiro"
import type { LancamentoBruto } from "@/lib/importar/ofx"

export interface ConferenciaFatura {
  /// Soma que a própria fatura declara (ex.: "Lançamentos atuais", "Despesas do mês").
  informadoCentavos: number
  /// Gastos lidos menos estornos e créditos, sem o pagamento da fatura anterior.
  lidoCentavos: number
}

export interface ResultadoPdf {
  lancamentos: LancamentoBruto[]
  paginas: number
  naoReconhecidas: string[]
  textoBruto: string
  conferencia?: ConferenciaFatura
}

export interface OpcoesPdf {
  senha?: string
  faturaCartao?: boolean
  /// Âncora de ano quando o arquivo não traz data completa. Injetável para teste.
  hoje?: Date
}

/** Erro específico para o app pedir a senha em vez de mostrar falha genérica. */
export class PdfProtegido extends Error {
  constructor(readonly senhaIncorreta: boolean) {
    super(
      senhaIncorreta
        ? "Senha incorreta para este PDF."
        : "Este PDF é protegido por senha. Bancos costumam usar os primeiros dígitos do CPF ou a data de nascimento.",
    )
  }
}

export async function lerPdf(dados: ArrayBuffer, opcoes: OpcoesPdf = {}): Promise<ResultadoPdf> {
  let documento
  try {
    // Fatura de banco vem cifrada quase sempre. Sem repassar a senha aqui, o
    // pdf.js lança e a importação inteira falha sem dizer o motivo.
    documento = await getDocumentProxy(new Uint8Array(dados), opcoes.senha ? { password: opcoes.senha } : undefined)
  } catch (erro) {
    const nome = (erro as { name?: string })?.name
    if (nome === "PasswordException") throw new PdfProtegido(Boolean(opcoes.senha))
    throw erro
  }

  const { text, totalPages } = await extractText(documento, { mergePages: true })
  const textoBruto = Array.isArray(text) ? text.join("\n") : text

  return { ...interpretarTextoPdf(textoBruto, opcoes), paginas: totalPages, textoBruto }
}

export function interpretarTextoPdf(
  texto: string,
  opcoes: Pick<OpcoesPdf, "faturaCartao" | "hoje"> = {},
): Pick<ResultadoPdf, "lancamentos" | "naoReconhecidas" | "conferencia"> {
  const linhas = texto
    .split(/\r?\n/)
    // O Nubank escreve o menos como U+2212, não como hífen.
    .map((linha) => linha.replace(/−/g, "-").replace(/\s{2,}/g, " ").trim())
    .filter(Boolean)
  const hoje = opcoes.hoje ?? new Date()
  return opcoes.faturaCartao ? lerFatura(linhas, hoje) : lerExtrato(linhas, hoje.getUTCFullYear())
}

// ---------------------------------------------------------------------------
// Extrato de conta
// ---------------------------------------------------------------------------

// Sem as vizinhanças, "63.352,00" oferecia "63.35" como data.
const DATA = /(?<![\d.,])(\d{2}[\/.-]\d{2}(?:[\/.-]\d{2,4})?)(?![\d,])/
const VALOR = /(-?\s?R?\$?\s?\d{1,3}(?:\.\d{3})*,\d{2})\s*([DC])?\s*$/

function lerExtrato(linhas: string[], anoPadrao: number) {
  const lancamentos: LancamentoBruto[] = []
  const naoReconhecidas: string[] = []

  for (const linha of linhas) {
    if (linha.length < 8) continue

    const casaData = DATA.exec(linha)
    const casaValor = VALOR.exec(linha)
    if (!casaData || !casaValor) {
      if (/\d,\d{2}/.test(linha)) naoReconhecidas.push(linha.slice(0, 140))
      continue
    }

    // Extrato costuma omitir o ano ("12/03"); o ano do arquivo entra no lugar.
    const dataTexto = casaData[1].length <= 5 ? `${casaData[1]}/${anoPadrao}` : casaData[1]
    const data = lerData(dataTexto)
    if (!data) {
      naoReconhecidas.push(linha.slice(0, 140))
      continue
    }

    const centavos = paraCentavos(casaValor[1])
    const descricao = linha
      .replace(casaData[1], "")
      .replace(casaValor[0], "")
      .replace(/\s{2,}/g, " ")
      .trim()

    // Alguns bancos marcam o sinal com "D"/"C" no fim em vez do menos.
    const marcador = casaValor[2]
    const despesa = marcador ? marcador === "D" : centavos < 0

    lancamentos.push({
      data,
      descricao: descricao || "Lançamento sem descrição",
      valorCentavos: Math.abs(centavos),
      tipo: despesa ? "DESPESA" : "RECEITA",
    })
  }

  return { lancamentos, naoReconhecidas }
}

// ---------------------------------------------------------------------------
// Fatura de cartão
// ---------------------------------------------------------------------------

const MESES: Record<string, number> = {
  jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6, jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12,
}
const MES = "(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)"
const NUMERO = "(\\d{1,3}(?:\\.\\d{3})*,\\d{2})"

/// Só vale data NO INÍCIO da linha. No meio dela é resumo ("Pagamento efetuado
/// em 06/08/2026 -7.127,80"), e ler o resumo duplicava o pagamento.
const INICIO_BARRA = /^(\d{2})\/(\d{2})(?:\/(\d{4}))?\s+(.+)$/ // Itaú, Mercado Pago
const INICIO_MES_CURTO = new RegExp(`^(\\d{2})\\s+${MES}\\s+(.+)$`, "i") // Nubank: "05 AGO"
const INICIO_MES_EXTENSO = new RegExp(`^(\\d{1,2})\\s+de\\s+${MES}\\.?\\s+(\\d{4})\\s+(.+)$`, "i") // Inter

/// O sinal só conta colado ao número ("-7.127,80", "-R$ 259,29"). O Inter
/// imprime "-" solto na coluna de beneficiário vazia ("99 RIDE - R$ 25,30"), e
/// marca crédito com "+" ("+ R$ 4.707,35").
const VALOR_FINAL = new RegExp(`(?:(\\+)\\s*|(-))?(?:R\\$\\s*)?${NUMERO}$`)

const PARCELA_BARRA = /\s(\d{2})\/(\d{2})$/ // Itaú: "AMAZONMKTPLC*E 10/12"
const PARCELA_EXTENSO = /\s*\(?parcela\s+(\d{1,2})\s+de\s+(\d{1,2})\)?/i // Mercado Pago, Inter

/// Crédito sem sinal: o Mercado Pago imprime o pagamento com valor positivo.
const CREDITO = /\b(pagamento|estorno|reembolso|devolu[çc][ãa]o)\b/i
const PAGAMENTO = /\bpagamento\b/i

/// Linha logo abaixo da compra em que o Itaú põe o ramo e a cidade do lojista.
const DICA_BANCO =
  /^(vestu[áa]rio|lazer|transporte|sa[úu]de|supermercado|restaurante|eletr[ôo]nicos|educa[çc][ãa]o|servi[çc]os|outros|hospedagem|turismo)\s+(.+)$/i

const REPASSE_IOF = new RegExp(`^repasse de iof\\b.*?${NUMERO}$`, "i")

const SECAO_FUTURA = /compras parceladas\s*-\s*pr[óo]ximas faturas|^pr[óo]ximas faturas$|^lan[çc]amentos futuros$/i
const SECAO_ATUAL = /^(transa[çc][õo]es\b|lan[çc]amentos[:\s]|despesas da fatura|detalhes de consumo|movimenta[çc][õo]es)/i

const TOTAL_UNICO = [
  new RegExp(`^(?:total dos )?lan[çc]amentos atuais\\s+(?:R\\$\\s*)?${NUMERO}$`, "i"), // Itaú
  new RegExp(`^despesas do m[êe]s\\s+R\\$\\s*${NUMERO}$`, "i"), // Inter
  new RegExp(`^consumos de .*?R\\$\\s*${NUMERO}$`, "i"), // Mercado Pago
]
/// O Nubank não imprime um total só: compras de um lado, "outros" (anuidade,
/// assinatura via NuPay, IOF) do outro.
const PARTES_TOTAL = new RegExp(
  `^(total de compras de todos os cart[õo]es|outros lan[çc]amentos)\\b.*?R\\$\\s*${NUMERO}$`,
  "i",
)

interface Pendente {
  dia: number
  mes: number
  ano?: number
  texto: string
  linha: string
  restam: number
}

function lerFatura(linhas: string[], hoje: Date) {
  // Compra na fatura vem sem ano. A âncora é o vencimento: nenhuma compra da
  // fatura é posterior a ele, então "04/11" numa fatura que vence em 08/09/2026
  // é de 2025. Sem vencimento legível, hoje serve — compra nunca é futura.
  const ancora = acharVencimento(linhas) ?? hoje

  const lancamentos: LancamentoBruto[] = []
  const naoReconhecidas: string[] = []
  let lendo = true
  let pendente: Pendente | null = null
  let indiceDoUltimo = -2
  let totalUnico: number | undefined
  const partesTotal = new Map<string, number>()
  const creditoPorLancamento = new WeakMap<LancamentoBruto, { pagamento: boolean }>()

  const registrar = (dia: number, mes: number, ano: number | undefined, texto: string, casaValor: RegExpExecArray, i: number, linha: string) => {
    const valorCentavos = paraCentavos(casaValor[3])
    // "Saldo restante da fatura anterior R$ 0,00": informativo, não é lançamento.
    if (valorCentavos === 0) return

    const dataImpressa = ano ? lerData(`${dia}/${mes}/${ano}`) : dataSemAno(dia, mes, ancora)
    if (!dataImpressa) {
      naoReconhecidas.push(linha.slice(0, 140))
      return
    }

    let estabelecimento = texto.replace(/\s+-\s*$/, "").trim()
    let parcela = PARCELA_EXTENSO.exec(estabelecimento)
    if (parcela) {
      estabelecimento = estabelecimento.replace(parcela[0], " ").replace(/\s{2,}/g, " ").trim()
    } else {
      parcela = PARCELA_BARRA.exec(estabelecimento)
      if (parcela) estabelecimento = estabelecimento.slice(0, parcela.index).trim()
    }
    const atual = parcela ? Number(parcela[1]) : 0
    const total = parcela ? Number(parcela[2]) : 0
    const ehParcela = total >= 2 && atual >= 1 && atual <= total

    const credito = Boolean(casaValor[1] || casaValor[2]) || CREDITO.test(texto)
    const lancamento: LancamentoBruto = {
      // O banco imprime em toda parcela a data da COMPRA. Gravar essa data põe
      // a parcela 10 de 12 de hoje em novembro do ano passado: some do mês em
      // que pesa e aparece como compra no futuro. A parcela N entra N-1 meses
      // depois da compra, que é quando o banco a lançou.
      data: ehParcela && atual > 1 ? somarMeses(dataImpressa, atual - 1) : dataImpressa,
      descricao: ehParcela
        ? `${estabelecimento} ${String(atual).padStart(2, "0")}/${String(total).padStart(2, "0")}`
        : estabelecimento || "Lançamento sem descrição",
      valorCentavos,
      tipo: credito ? "RECEITA" : "DESPESA",
      ...(ehParcela ? { parcelaAtual: atual, parcelasTotal: total } : {}),
      ...(ehParcela && atual > 1 ? { dataCompra: dataImpressa } : {}),
    }
    lancamentos.push(lancamento)
    creditoPorLancamento.set(lancamento, { pagamento: credito && PAGAMENTO.test(texto) })
    indiceDoUltimo = i
  }

  for (let i = 0; i < linhas.length; i += 1) {
    const linha = linhas[i]

    for (const padrao of TOTAL_UNICO) {
      const casa = padrao.exec(linha)
      if (casa && totalUnico === undefined) totalUnico = paraCentavos(casa[1])
    }
    const parte = PARTES_TOTAL.exec(linha)
    if (parte && !partesTotal.has(parte[1].toLowerCase())) partesTotal.set(parte[1].toLowerCase(), paraCentavos(parte[2]))

    if (SECAO_FUTURA.test(linha)) {
      lendo = false
      pendente = null
      continue
    }
    if (SECAO_ATUAL.test(linha)) lendo = true
    if (!lendo) continue

    const inicio = lerInicio(linha)
    if (inicio) {
      if (pendente) naoReconhecidas.push(pendente.linha.slice(0, 140))
      pendente = null
      const casaValor = VALOR_FINAL.exec(inicio.texto)
      if (casaValor) {
        registrar(inicio.dia, inicio.mes, inicio.ano, inicio.texto.slice(0, casaValor.index).trim(), casaValor, i, linha)
      } else {
        // Inter: a parcela do Pix no crédito ocupa três linhas, e o valor
        // vem na última, depois do beneficiário.
        pendente = { ...inicio, linha, restam: 3 }
      }
      continue
    }

    if (pendente) {
      if (/^principal\b/i.test(linha)) continue
      const casaValor = VALOR_FINAL.exec(linha)
      if (casaValor) {
        const beneficiario = linha.slice(0, casaValor.index).trim()
        registrar(pendente.dia, pendente.mes, pendente.ano, `${pendente.texto} ${beneficiario}`.trim(), casaValor, i, pendente.linha)
        pendente = null
        continue
      }
      pendente.restam -= 1
      if (pendente.restam === 0) {
        naoReconhecidas.push(pendente.linha.slice(0, 140))
        pendente = null
      }
      continue
    }

    const dica = DICA_BANCO.exec(linha)
    if (dica && i === indiceDoUltimo + 1) {
      const ultimo = lancamentos[lancamentos.length - 1]
      ultimo.categoriaBanco = dica[1].toLowerCase()
      ultimo.descricao = tirarCidade(ultimo.descricao, dica[2])
      continue
    }

    // Itaú: o IOF das compras em moeda estrangeira vem numa linha sem data,
    // mas é cobrado nesta fatura. Entra com a data da última compra lida, que
    // é a internacional logo acima dele.
    const iof = REPASSE_IOF.exec(linha)
    if (iof && lancamentos.length > 0) {
      const valorCentavos = paraCentavos(iof[1])
      if (valorCentavos > 0) {
        const lancamento: LancamentoBruto = {
          data: lancamentos[lancamentos.length - 1].data,
          descricao: "Repasse de IOF",
          valorCentavos,
          tipo: "DESPESA",
        }
        lancamentos.push(lancamento)
        creditoPorLancamento.set(lancamento, { pagamento: false })
      }
    }
  }
  if (pendente) naoReconhecidas.push(pendente.linha.slice(0, 140))

  const informado = totalUnico ?? (partesTotal.size > 0 ? [...partesTotal.values()].reduce((a, b) => a + b, 0) : undefined)
  let conferencia: ConferenciaFatura | undefined
  if (informado !== undefined) {
    let lido = 0
    for (const lancamento of lancamentos) {
      if (lancamento.tipo === "DESPESA") lido += lancamento.valorCentavos
      else if (!creditoPorLancamento.get(lancamento)?.pagamento) lido -= lancamento.valorCentavos
    }
    conferencia = { informadoCentavos: informado, lidoCentavos: lido }
  }

  return { lancamentos, naoReconhecidas, conferencia }
}

function lerInicio(linha: string): { dia: number; mes: number; ano?: number; texto: string } | null {
  const barra = INICIO_BARRA.exec(linha)
  if (barra) {
    return { dia: Number(barra[1]), mes: Number(barra[2]), ano: barra[3] ? Number(barra[3]) : undefined, texto: barra[4] }
  }
  const curto = INICIO_MES_CURTO.exec(linha)
  if (curto) return { dia: Number(curto[1]), mes: MESES[curto[2].toLowerCase()], texto: curto[3] }
  const extenso = INICIO_MES_EXTENSO.exec(linha)
  if (extenso) {
    return { dia: Number(extenso[1]), mes: MESES[extenso[2].toLowerCase()], ano: Number(extenso[3]), texto: extenso[4] }
  }
  return null
}

function acharVencimento(linhas: string[]): Date | null {
  for (let i = 0; i < linhas.length; i += 1) {
    if (!/venc/i.test(linhas[i])) continue
    for (let j = i; j <= Math.min(i + 2, linhas.length - 1); j += 1) {
      const data = dataCompletaEm(linhas[j])
      if (data) return data
    }
  }
  return null
}

function dataCompletaEm(linha: string): Date | null {
  const barra = /(?<!\d)(\d{2})\/(\d{2})\/(\d{4})(?!\d)/.exec(linha)
  if (barra) return lerData(`${barra[1]}/${barra[2]}/${barra[3]}`)
  const mes = new RegExp(`(?<!\\d)(\\d{2})\\s+${MES}\\s+(\\d{4})`, "i").exec(linha)
  if (mes) return lerData(`${mes[1]}/${MESES[mes[2].toLowerCase()]}/${mes[3]}`)
  return null
}

function dataSemAno(dia: number, mes: number, ancora: Date): Date | null {
  const ano = ancora.getUTCFullYear()
  const mesmoAno = lerData(`${dia}/${mes}/${ano}`)
  if (mesmoAno && mesmoAno <= ancora) return mesmoAno
  return lerData(`${dia}/${mes}/${ano - 1}`)
}

function somarMeses(data: Date, meses: number): Date {
  const ano = data.getUTCFullYear()
  const mes = data.getUTCMonth() + meses
  // 31/01 mais um mês é 28/02 (ou 29), não 03/03.
  const ultimoDia = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate()
  return new Date(Date.UTC(ano, mes, Math.min(data.getUTCDate(), ultimoDia)))
}

/**
 * O Itaú cola a cidade no nome do lojista ("COMPRE MIXSAO JOSE DO R") e
 * repete a cidade, truncada de outro jeito, na linha de baixo. O maior
 * começo da cidade que termina o nome é a parte a cortar.
 */
function tirarCidade(descricao: string, cidade: string): string {
  const parcela = PARCELA_BARRA.exec(descricao)
  const nome = parcela ? descricao.slice(0, parcela.index) : descricao
  const alvo = nome.toUpperCase()
  const cidadeMaiuscula = cidade.toUpperCase().trim()
  for (let tamanho = cidadeMaiuscula.length; tamanho >= 4; tamanho -= 1) {
    if (alvo.endsWith(cidadeMaiuscula.slice(0, tamanho)) && nome.length - tamanho >= 3) {
      return nome.slice(0, nome.length - tamanho).trim() + (parcela ? parcela[0] : "")
    }
  }
  return descricao
}
