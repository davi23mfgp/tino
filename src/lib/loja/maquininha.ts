/**
 * Conciliação da maquininha com o Balcão (item 4.1, estudo em
 * `docs/pesquisas/2026-10-07-fase-4-maquininha-e-nfse.md`).
 *
 * Começa pelo arquivo, não pela API: cada credenciadora tem um caminho próprio
 * (API do Mercado Pago, XML da Stone, EDI da Cielo), mas todas deixam baixar a
 * planilha de vendas. O leitor aceita o cabeçalho que vier, por sinônimo, como
 * o importador de extrato, porque pedir para "ajustar a planilha" é onde o
 * comerciante desiste.
 *
 * Nada aqui grava. A conferência devolve quatro listas (bateu, só na
 * maquininha, só no Balcão, taxa diferente) e as correções propostas; quem
 * confirma é a pessoa (regra 5: nada entra sem conferência).
 */

import { lerData } from "@/lib/datas"
import { paraCentavos } from "@/lib/dinheiro"
import { detectarSeparador, dividirLinha } from "@/lib/importar/csv"

export type FormaDaMaquininha = "DEBITO" | "CREDITO_VISTA" | "CREDITO_PARCELADO" | "PIX"
const CARTAO: readonly string[] = ["DEBITO", "CREDITO_VISTA", "CREDITO_PARCELADO"]

export interface VendaDaMaquininha {
  /** Linha do arquivo, contando o cabeçalho: a pessoa acha a venda na planilha. */
  linha: number
  /** YYYY-MM-DD, como está no arquivo (a maquininha já usa a hora local). */
  dia: string
  /** HH:MM, quando o arquivo traz. Desempata duas vendas iguais no mesmo dia. */
  hora: string | null
  /** `null` quando o arquivo não diz: casa com qualquer forma de cartão. */
  forma: FormaDaMaquininha | null
  parcelas: number
  brutoCentavos: number
  taxaCentavos: number | null
  liquidoCentavos: number | null
  /** Data em que o dinheiro cai, segundo a maquininha. */
  previsao: string | null
  /** A maquininha diz que já pagou (status "pago", "liquidado", "liberado"). */
  pago: boolean
  codigo: string | null
}

export interface LeituraDaMaquininha {
  vendas: VendaDaMaquininha[]
  cabecalho: string[]
  /** O que ficou de fora e por quê: cancelada e negada não entram, mas aparecem. */
  descartadas: { linha: number; conteudo: string; motivo: string }[]
  /** Coluna essencial que faltou; com ela vazia, `vendas` vem vazio. */
  falta: string | null
}

const normalizar = (texto: string) => texto.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/\s+/g, " ").trim()

// A ordem importa: as colunas mais específicas são achadas antes e saem da
// disputa, senão "valor" casaria com "valor líquido" e "valor da taxa".
const COLUNAS: [chave: string, sinonimos: string[]][] = [
  ["liquido", ["valor liquido", "liquido", "valor a receber", "valor recebido", "net amount", "net"]],
  ["taxa", ["valor da taxa", "taxa total", "taxa (r$)", "taxa", "tarifa", "mdr", "desconto", "fee"]],
  ["previsao", ["previsao de pagamento", "previsao de recebimento", "data prevista", "data de pagamento", "data de recebimento", "data de liberacao", "liberacao", "data do repasse", "previsao", "money release date"]],
  ["data", ["data da venda", "data/hora", "data e hora", "data da transacao", "data de criacao", "data", "date"]],
  ["hora", ["hora da venda", "hora", "horario", "time"]],
  ["bruto", ["valor bruto", "valor da venda", "valor original", "valor total", "valor", "bruto", "amount", "gross amount"]],
  ["forma", ["forma de pagamento", "meio de pagamento", "tipo de pagamento", "modalidade", "produto", "forma", "tipo", "payment method"]],
  ["parcelas", ["quantidade de parcelas", "qtd parcelas", "qtd. parcelas", "numero de parcelas", "parcelas", "parcela", "installments"]],
  ["status", ["status", "situacao", "estado"]],
  ["codigo", ["codigo da transacao", "codigo da venda", "id da transacao", "nsu", "codigo", "id", "transaction id"]],
]

function acharColunas(cabecalho: string[]): Record<string, number> {
  const nomes = cabecalho.map(normalizar)
  const usadas = new Set<number>()
  const achadas: Record<string, number> = {}
  for (const [chave, sinonimos] of COLUNAS) {
    let indice = -1
    for (const sinonimo of sinonimos) {
      indice = nomes.findIndex((nome, i) => !usadas.has(i) && nome === sinonimo)
      if (indice >= 0) break
    }
    if (indice < 0) {
      for (const sinonimo of sinonimos) {
        // Sinônimo curto ("id", "net", "fee") só casa inteiro: "id" está dentro de "liquido".
        if (sinonimo.length <= 3) continue
        indice = nomes.findIndex((nome, i) => !usadas.has(i) && nome.includes(sinonimo))
        if (indice >= 0) break
      }
    }
    if (indice >= 0) {
      achadas[chave] = indice
      usadas.add(indice)
    }
  }
  return achadas
}

const NEGADA = /cancel|estorn|negad|recusad|nao autoriz|desfeit|chargeback|contest|devolvid|reembols/
const PAGA = /\bpag[oa]\b|liquidad|liberad|recebid|creditad|disponivel|paid|released/

function lerForma(texto: string, parcelas: number): FormaDaMaquininha | null {
  const t = normalizar(texto)
  if (!t) return null
  if (t.includes("pix")) return "PIX"
  if (t.includes("debit")) return "DEBITO"
  if (t.includes("credit") || t.includes("parcel")) return parcelas > 1 || t.includes("parcel") ? "CREDITO_PARCELADO" : "CREDITO_VISTA"
  return null
}

/** "07/10/2026 14:32" vira dia e hora; a hora pode vir em coluna própria. */
function lerDiaEHora(texto: string): { dia: string; hora: string | null } | null {
  const limpo = texto.trim().replace("T", " ")
  const [parteDia, parteHora] = limpo.split(/\s+/)
  const data = lerData(parteDia ?? "")
  if (!data) return null
  const hora = /^(\d{1,2}):(\d{2})/.exec(parteHora ?? "")
  return { dia: data.toISOString().slice(0, 10), hora: hora ? `${hora[1].padStart(2, "0")}:${hora[2]}` : null }
}

export function lerArquivoDaMaquininha(conteudo: string): LeituraDaMaquininha {
  const linhas = conteudo.replace(/^﻿/, "").split(/\r?\n/)
  const naoVazias = linhas.map((texto, i) => ({ texto, numero: i + 1 })).filter((linha) => linha.texto.trim())
  if (naoVazias.length === 0) return { vendas: [], cabecalho: [], descartadas: [], falta: "o arquivo está vazio" }

  // Título e período antes do cabeçalho são comuns: o cabeçalho é a primeira
  // linha com data e valor.
  let inicio = 0
  let separador = detectarSeparador(naoVazias[0].texto)
  for (let i = 0; i < Math.min(naoVazias.length, 15); i += 1) {
    const sep = detectarSeparador(naoVazias[i].texto)
    const colunas = acharColunas(dividirLinha(naoVazias[i].texto, sep))
    if (colunas.data !== undefined && (colunas.bruto !== undefined || colunas.liquido !== undefined)) {
      inicio = i
      separador = sep
      break
    }
  }
  const cabecalho = dividirLinha(naoVazias[inicio].texto, separador)
  const col = acharColunas(cabecalho)
  if (col.data === undefined) return { vendas: [], cabecalho, descartadas: [], falta: "a coluna da data da venda" }
  if (col.bruto === undefined && (col.liquido === undefined || col.taxa === undefined)) {
    return { vendas: [], cabecalho, descartadas: [], falta: "a coluna do valor da venda" }
  }
  const taxaEmPercentual = col.taxa !== undefined && cabecalho[col.taxa].includes("%") && !/r\$/i.test(cabecalho[col.taxa])

  const vendas: VendaDaMaquininha[] = []
  const descartadas: LeituraDaMaquininha["descartadas"] = []
  for (const { texto, numero } of naoVazias.slice(inicio + 1)) {
    const campos = dividirLinha(texto, separador)
    const campo = (chave: string) => (col[chave] === undefined ? "" : (campos[col[chave]] ?? "").trim())
    const fora = (motivo: string) => descartadas.push({ linha: numero, conteudo: texto.slice(0, 120), motivo })

    const status = normalizar(campo("status"))
    if (NEGADA.test(status)) {
      fora("cancelada, negada ou estornada: não é venda")
      continue
    }
    const quando = lerDiaEHora(campo("data"))
    if (!quando) {
      fora("data não reconhecida")
      continue
    }
    const textoTaxa = campo("taxa")
    const percentual = taxaEmPercentual || textoTaxa.includes("%")
    let bruto = campo("bruto") ? Math.abs(paraCentavos(campo("bruto"))) : null
    let liquido = campo("liquido") ? Math.abs(paraCentavos(campo("liquido"))) : null
    let taxa: number | null = null
    if (textoTaxa && !percentual) taxa = Math.abs(paraCentavos(textoTaxa))
    if (bruto === null && liquido !== null && taxa !== null) bruto = liquido + taxa
    if (!bruto) {
      fora("valor zerado ou ilegível")
      continue
    }
    if (textoTaxa && percentual) {
      // "2,99%": a taxa em reais sai do bruto. paraCentavos("2,99") = 299 = bps.
      taxa = Math.round((bruto * Math.abs(paraCentavos(textoTaxa.replace("%", "")))) / 10_000)
    }
    if (taxa === null && liquido !== null) taxa = bruto - liquido
    if (liquido === null && taxa !== null) liquido = bruto - taxa

    const textoForma = campo("forma")
    const parcelasDoTexto = /(\d{1,2})\s*x/i.exec(textoForma)
    const parcelas = Math.max(1, Number.parseInt(campo("parcelas"), 10) || (parcelasDoTexto ? Number(parcelasDoTexto[1]) : 1))
    const hora = quando.hora ?? (/^(\d{1,2}):(\d{2})/.exec(campo("hora")) ? campo("hora").slice(0, 5).padStart(5, "0") : null)
    const previsao = campo("previsao") ? lerDiaEHora(campo("previsao"))?.dia ?? null : null

    vendas.push({
      linha: numero, dia: quando.dia, hora, forma: lerForma(textoForma, parcelas), parcelas,
      brutoCentavos: bruto, taxaCentavos: taxa, liquidoCentavos: liquido,
      previsao, pago: PAGA.test(status), codigo: campo("codigo") || null,
    })
  }
  return { vendas, cabecalho, descartadas, falta: null }
}

export interface PagamentoDoBalcao {
  id: string
  vendaNumero: number
  /** Dia e hora da venda no fuso do lar. */
  dia: string
  hora: string
  forma: string
  parcelas: number
  valorCentavos: number
  taxaBps: number
  liquidoCentavos: number
  previsao: string
  recebido: boolean
}

export interface Aviso {
  tipo: "forma" | "taxa" | "previsao"
  texto: string
}

export interface ParConciliado {
  maquininha: VendaDaMaquininha
  balcao: PagamentoDoBalcao
  avisos: Aviso[]
}

/** Correção proposta para um pagamento do Balcão; só grava com o toque da pessoa. */
export interface AjusteProposto {
  pagamentoId: string
  vendaNumero: number
  /** A maquininha diz que pagou: marcar como recebido nesse dia. */
  recebidoEm?: string
  /** A data em que a maquininha diz que cai, no lugar da estimada pela regra. */
  previsao?: string
  /** O líquido que a maquininha pagou de fato, no lugar do calculado com a taxa cadastrada. */
  liquidoCentavos?: number
}

export interface Conciliacao {
  periodo: { de: string; ate: string } | null
  bateram: ParConciliado[]
  /** Passou na maquininha e não está no Balcão: venda esquecida. */
  soNaMaquininha: VendaDaMaquininha[]
  /** Está no Balcão e não na maquininha, dentro do período do arquivo. */
  soNoBalcao: PagamentoDoBalcao[]
  /**
   * Para cada venda esquecida (pela linha do arquivo), o pagamento do Balcão
   * mais parecido que sobrou: mesmo dia ou o seguinte, valor perto. É o caso
   * de quem lançou R$ 80 quando passou R$ 82 na maquininha, e não esqueceu.
   */
  parecidas: Record<number, PagamentoDoBalcao>
  /** Só com as vendas que bateram e têm taxa no arquivo; `null` se nenhuma tem. */
  taxa: { cobradaCentavos: number; esperadaCentavos: number; diferencaCentavos: number } | null
  ajustes: AjusteProposto[]
}

const DIA_MS = 86_400_000
const diasEntre = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DIA_MS)
const minutos = (hora: string) => Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3, 5))
const formatarDia = (dia: string) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}`
const NOME_DA_FORMA: Record<string, string> = { DEBITO: "débito", CREDITO_VISTA: "crédito à vista", CREDITO_PARCELADO: "crédito parcelado", PIX: "Pix" }

function compativel(maquininha: VendaDaMaquininha, balcao: PagamentoDoBalcao): boolean {
  if (maquininha.forma === "PIX" || balcao.forma === "PIX") return maquininha.forma === balcao.forma
  return CARTAO.includes(balcao.forma)
}

/**
 * Casa cada venda do arquivo com um pagamento do Balcão de mesmo valor, no
 * mesmo dia ou no seguinte (quem lança depois de fechar a loja). Entre vários
 * candidatos, vence o mesmo dia, depois a mesma forma, depois a hora mais
 * perto. Débito lançado como crédito ainda casa, com aviso: o dinheiro é o
 * mesmo, a taxa e o prazo é que mudam.
 */
export function conciliar(arquivo: VendaDaMaquininha[], balcao: PagamentoDoBalcao[]): Conciliacao {
  if (arquivo.length === 0) return { periodo: null, bateram: [], soNaMaquininha: [], soNoBalcao: [], parecidas: {}, taxa: null, ajustes: [] }
  const dias = arquivo.map((venda) => venda.dia).sort()
  const periodo = { de: dias[0], ate: dias[dias.length - 1] }
  const temPix = arquivo.some((venda) => venda.forma === "PIX")

  const livres = new Set(balcao.map((pagamento) => pagamento.id))
  const bateram: ParConciliado[] = []
  const soNaMaquininha: VendaDaMaquininha[] = []
  const ordenadas = [...arquivo].sort((a, b) => a.dia.localeCompare(b.dia) || (a.hora ?? "").localeCompare(b.hora ?? ""))

  for (const venda of ordenadas) {
    let melhor: { pagamento: PagamentoDoBalcao; pontos: number } | null = null
    for (const pagamento of balcao) {
      if (!livres.has(pagamento.id) || pagamento.valorCentavos !== venda.brutoCentavos || !compativel(venda, pagamento)) continue
      const distancia = diasEntre(venda.dia, pagamento.dia)
      if (distancia < 0 || distancia > 1) continue
      const pontos = distancia * 100_000 + (venda.forma && venda.forma !== pagamento.forma ? 10_000 : 0)
        + (venda.hora ? Math.abs(minutos(venda.hora) - minutos(pagamento.hora)) : 0)
      if (!melhor || pontos < melhor.pontos) melhor = { pagamento, pontos }
    }
    if (!melhor) {
      soNaMaquininha.push(venda)
      continue
    }
    livres.delete(melhor.pagamento.id)
    bateram.push({ maquininha: venda, balcao: melhor.pagamento, avisos: avisosDoPar(venda, melhor.pagamento) })
  }

  const soNoBalcao = balcao.filter((pagamento) => livres.has(pagamento.id) && pagamento.dia >= periodo.de && pagamento.dia <= periodo.ate
    && (CARTAO.includes(pagamento.forma) || (temPix && pagamento.forma === "PIX")))

  const parecidas: Record<number, PagamentoDoBalcao> = {}
  for (const venda of soNaMaquininha) {
    const parecida = maisParecida(venda, soNoBalcao)
    if (parecida) parecidas[venda.linha] = parecida
  }

  const comTaxa = bateram.filter((par) => par.maquininha.taxaCentavos !== null)
  const cobrada = comTaxa.reduce((soma, par) => soma + (par.maquininha.taxaCentavos ?? 0), 0)
  const esperada = comTaxa.reduce((soma, par) => soma + (par.balcao.valorCentavos - par.balcao.liquidoCentavos), 0)

  return {
    periodo, bateram, soNaMaquininha, soNoBalcao, parecidas,
    taxa: comTaxa.length ? { cobradaCentavos: cobrada, esperadaCentavos: esperada, diferencaCentavos: cobrada - esperada } : null,
    ajustes: bateram.map(ajusteDoPar).filter((ajuste): ajuste is AjusteProposto => ajuste !== null),
  }
}

/**
 * O pagamento do Balcão que pode ser esta venda lançada com outro valor:
 * mesma família de forma, mesmo dia ou o seguinte, e diferença de até
 * R$ 20 ou 10% do valor (o que for maior). Mais perto no valor vence; no
 * empate, mais perto na hora. É só sugestão: quem decide é a pessoa.
 */
export function maisParecida(venda: VendaDaMaquininha, candidatos: PagamentoDoBalcao[]): PagamentoDoBalcao | null {
  const folga = Math.max(2_000, Math.round(venda.brutoCentavos / 10))
  let melhor: { pagamento: PagamentoDoBalcao; pontos: number } | null = null
  for (const pagamento of candidatos) {
    const diferenca = Math.abs(pagamento.valorCentavos - venda.brutoCentavos)
    const distancia = diasEntre(venda.dia, pagamento.dia)
    if (diferenca === 0 || diferenca > folga || distancia < 0 || distancia > 1 || !compativel(venda, pagamento)) continue
    const pontos = diferenca * 10_000 + distancia * 2_000 + (venda.hora ? Math.abs(minutos(venda.hora) - minutos(pagamento.hora)) : 0)
    if (!melhor || pontos < melhor.pontos) melhor = { pagamento, pontos }
  }
  return melhor?.pagamento ?? null
}

function avisosDoPar(venda: VendaDaMaquininha, pagamento: PagamentoDoBalcao): Aviso[] {
  const avisos: Aviso[] = []
  if (venda.forma && venda.forma !== pagamento.forma) {
    avisos.push({ tipo: "forma", texto: `Na maquininha foi ${NOME_DA_FORMA[venda.forma]}; no Balcão está ${NOME_DA_FORMA[pagamento.forma] ?? pagamento.forma}.` })
  }
  const esperada = pagamento.valorCentavos - pagamento.liquidoCentavos
  // Um centavo de folga: a maquininha arredonda a taxa de cada venda.
  if (venda.taxaCentavos !== null && Math.abs(venda.taxaCentavos - esperada) > 1) {
    avisos.push({ tipo: "taxa", texto: `A maquininha cobrou ${reais(venda.taxaCentavos)} de taxa; pela taxa cadastrada seriam ${reais(esperada)}.` })
  }
  if (venda.previsao && venda.previsao !== pagamento.previsao && pagamento.parcelas <= 1) {
    avisos.push({ tipo: "previsao", texto: `Cai em ${formatarDia(venda.previsao)}, não em ${formatarDia(pagamento.previsao)} como o Tino estimou.` })
  }
  return avisos
}

const reais = (centavos: number) => `R$ ${(centavos / 100).toFixed(2).replace(".", ",")}`

/**
 * O parcelado fica de fora das correções de data: cada parcela cai num mês,
 * e o pagamento do Balcão guarda uma data só. Corrigir com a primeira
 * parcela faria o resto parecer recebido.
 */
function ajusteDoPar({ maquininha, balcao }: ParConciliado): AjusteProposto | null {
  const ajuste: AjusteProposto = { pagamentoId: balcao.id, vendaNumero: balcao.vendaNumero }
  if (balcao.parcelas <= 1 && maquininha.parcelas <= 1) {
    if (maquininha.pago && !balcao.recebido) ajuste.recebidoEm = maquininha.previsao ?? maquininha.dia
    else if (maquininha.previsao && maquininha.previsao !== balcao.previsao && !balcao.recebido) ajuste.previsao = maquininha.previsao
  }
  if (maquininha.liquidoCentavos !== null && Math.abs(maquininha.liquidoCentavos - balcao.liquidoCentavos) > 1
    && maquininha.liquidoCentavos > 0 && maquininha.liquidoCentavos <= balcao.valorCentavos) {
    ajuste.liquidoCentavos = maquininha.liquidoCentavos
  }
  return Object.keys(ajuste).length > 2 ? ajuste : null
}
