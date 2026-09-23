/**
 * IA (Groq) como reforço na importação de fatura.
 *
 * Entra em dois pontos, e em nenhum deles a palavra dela basta:
 *
 * 1. **Categoria** das compras que regra, dicionário e ramo do banco não
 *    cobriram. Só vale categoria que existe no lar, e a prévia mostra que a
 *    sugestão é da IA — o usuário confere antes de gravar.
 * 2. **Releitura da fatura** quando a leitura por regra não fecha com o total
 *    que o banco declara (banco de layout novo, página fora de ordem). Cada
 *    lançamento que a IA devolve tem de estar escrito no PDF — valor na linha
 *    que ela apontou, começo da descrição ali perto — e a soma tem de fechar
 *    com o total impresso. Se não fechar, a resposta é descartada inteira.
 *    Modelo de linguagem inventa número com toda a confiança; a conta que
 *    fecha com o banco é que não inventa.
 *
 * Sem chave configurada, nada daqui roda e a importação segue só com regras.
 */

import { lerData } from "@/lib/datas"
import { paraCentavos } from "@/lib/dinheiro"
import type { LancamentoBruto } from "@/lib/importar/ofx"
import {
  acharVencimento,
  dataSemAno,
  lerInicio,
  linhasDoTexto,
  somaDaFatura,
  somarMeses,
  type ConferenciaFatura,
} from "@/lib/importar/pdf"

/** Recebe instrução e pedido, devolve o texto da resposta (JSON) ou `null`. */
export type ModeloJson = (sistema: string, usuario: string) => Promise<string | null>

export function modeloDaImportacao(): ModeloJson | null {
  // A chave do assessor, ou na falta dela a do áudio: as duas pagam a mesma
  // conta no Groq, e usar uma delas aqui não muda quem responde o chat.
  const chave = process.env.GROQ_API_KEY || process.env.GROQ_API_KEY_AUDIO
  if (!chave) return null
  return async (sistema, usuario) => {
    try {
      const resposta = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        signal: AbortSignal.timeout(25_000),
        headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: process.env.GROQ_MODEL || "openai/gpt-oss-20b",
          max_completion_tokens: 8000,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: sistema },
            { role: "user", content: usuario },
          ],
        }),
      })
      if (!resposta.ok) return null
      const dados = (await resposta.json()) as { choices?: { message?: { content?: string } }[] }
      return dados.choices?.[0]?.message?.content ?? null
    } catch {
      // IA fora do ar ou lenta não pode derrubar a importação: sem ela, vale a regra.
      return null
    }
  }
}

function lerJson(texto: string | null): unknown {
  if (!texto) return null
  try {
    return JSON.parse(texto)
  } catch {
    const bloco = /\{[\s\S]*\}/.exec(texto)
    if (!bloco) return null
    try {
      return JSON.parse(bloco[0])
    } catch {
      return null
    }
  }
}

// ---------------------------------------------------------------------------
// Categoria
// ---------------------------------------------------------------------------

/// Pix, TED e transferência vão para uma pessoa: o nome dela não diz o que foi
/// pago, e mandar nome de terceiro para fora não se justifica por um palpite.
const TRANSFERENCIA = /^(pix|ted|doc|transf)/i

export function ehTransferencia(descricaoOriginal: string): boolean {
  return TRANSFERENCIA.test(descricaoOriginal.trim())
}

/**
 * Devolve, para cada descrição que a IA soube classificar, o nome de uma das
 * `categorias` dadas. Descrição que ela não soube fica de fora do mapa.
 */
export async function sugerirCategorias(
  descricoes: string[],
  categorias: string[],
  modelo: ModeloJson,
): Promise<Map<string, string>> {
  const resultado = new Map<string, string>()
  const alvo = [...new Set(descricoes.map((d) => d.trim()))].filter((d) => d && !TRANSFERENCIA.test(d)).slice(0, 80)
  if (alvo.length === 0 || categorias.length === 0) return resultado

  const permitidas = new Set(categorias)
  const sistema =
    "Você classifica compras de fatura de cartão de crédito brasileira nas categorias de um app de finanças pessoais. Responda apenas com JSON."
  const usuario = [
    "Categorias permitidas (use o nome exatamente como está escrito):",
    ...categorias.map((categoria) => `- ${categoria}`),
    "",
    "Compras (nome do lojista como sai na fatura, às vezes cortado):",
    ...alvo.map((descricao, indice) => `${indice + 1}. ${descricao}`),
    "",
    'Devolva {"itens":[{"n":1,"categoria":"Nome exato da lista"}]}.',
    'Use "categoria": null quando o nome não deixar claro o que foi comprado. Nunca use categoria fora da lista.',
  ].join("\n")

  const json = lerJson(await modelo(sistema, usuario)) as { itens?: { n?: unknown; categoria?: unknown }[] } | null
  for (const item of Array.isArray(json?.itens) ? json.itens : []) {
    const n = Number(item?.n)
    const categoria = typeof item?.categoria === "string" ? item.categoria.trim() : ""
    if (!Number.isInteger(n) || n < 1 || n > alvo.length || !permitidas.has(categoria)) continue
    resultado.set(alvo[n - 1], categoria)
  }
  return resultado
}

// ---------------------------------------------------------------------------
// Releitura da fatura
// ---------------------------------------------------------------------------

const VALOR_ESCRITO = /^\d{1,3}(?:\.\d{3})*,\d{2}$/
const ROTULO_TOTAL = /total|fatura|pagar|despesas|consumos|lan[çc]amentos|valor/i
const MESES_CURTOS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]

/// Só vai para fora o que pode ser lançamento ou total: linha com valor ou que
/// começa com data. Nome, endereço e texto jurídico ficam aqui.
function linhaCandidata(linha: string): boolean {
  if (!/\d,\d{2}/.test(linha) && !/^\d{1,2}[\s/.-]/.test(linha)) return false
  // Código de barras e linha digitável: dezenas de dígitos, nenhum lançamento.
  return linha.replace(/\D/g, "").length <= 24
}

function redigir(linha: string): string {
  return linha
    .replace(/\d{3}\.\d{3}\.\d{3}-\d{2}/g, "[CPF]")
    .replace(/\b\d{5}-\d{3}\b/g, "[CEP]")
}

function contemValor(linha: string, valor: string): boolean {
  return new RegExp(`(?<![\\d.,])${valor.replace(/\./g, "\\.")}(?![\\d,])`).test(linha)
}

const soLetrasENumeros = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")

export interface ReleituraIa {
  lancamentos: LancamentoBruto[]
  conferencia: ConferenciaFatura
}

/**
 * Pede à IA os lançamentos da fatura e só devolve o resultado se ele se
 * sustentar sozinho: cada item conferido contra o texto, e a soma fechando com
 * o total declarado. Qualquer outra coisa é `null`.
 */
export async function relerFaturaComIa(
  texto: string,
  modelo: ModeloJson,
  opcoes: { hoje: Date; totalInformadoCentavos?: number },
): Promise<ReleituraIa | null> {
  const linhas = linhasDoTexto(texto)
  const ancora = acharVencimento(linhas) ?? opcoes.hoje
  const enviadas = linhas
    .map((linha, indice) => ({ linha, indice }))
    .filter(({ linha }) => linhaCandidata(linha))
    .slice(0, 500)
  if (enviadas.length === 0) return null
  const numeros = new Set(enviadas.map(({ indice }) => indice))

  const sistema =
    "Você lê faturas de cartão de crédito brasileiras e devolve os lançamentos em JSON. Copie data, descrição e valor exatamente como estão no texto. Responda apenas com JSON."
  const usuario = [
    "Linhas da fatura, numeradas:",
    ...enviadas.map(({ linha, indice }) => `${indice}: ${redigir(linha)}`),
    "",
    "Devolva:",
    '{"total_da_fatura":"valor como está escrito, ou null","lancamentos":[{"linha":12,"data":"dd/mm ou dd/mm/aaaa","descricao":"...","valor":"1.234,56","credito":false,"parcela":"10/12 ou null"}]}',
    "",
    "Regras:",
    "- Só lançamentos DESTA fatura: compras, tarifas, IOF, juros, estornos e o pagamento da fatura anterior (credito true).",
    "- Ignore resumo, limites, pagamento mínimo, simulação de parcelamento, encargos do próximo período e a lista de parcelas das PRÓXIMAS faturas.",
    '- "linha" é o número da linha em que o valor está escrito.',
    '- "total_da_fatura" é a soma dos lançamentos desta fatura que o banco declara (ex.: "Lançamentos atuais", "Despesas do mês"), sem saldo de fatura anterior.',
  ].join("\n")

  const json = lerJson(await modelo(sistema, usuario)) as {
    total_da_fatura?: unknown
    lancamentos?: Record<string, unknown>[]
  } | null
  if (!json || !Array.isArray(json.lancamentos)) return null

  let informado = opcoes.totalInformadoCentavos
  if (informado === undefined && typeof json.total_da_fatura === "string") {
    const total = json.total_da_fatura.replace(/^R\$\s*/, "").trim()
    // O total tem de estar escrito na fatura, numa linha que se apresenta como
    // total e não é lançamento. Sem essa exigência, a IA podia devolver uma
    // compra só e chamar o valor dela de total — e a conta "fecharia".
    const linhaDeTotal = ({ linha }: { linha: string }) =>
      !lerInicio(linha) && ROTULO_TOTAL.test(linha) && contemValor(linha, total)
    if (VALOR_ESCRITO.test(total) && enviadas.some(linhaDeTotal)) informado = paraCentavos(total)
  }
  if (informado === undefined) return null

  const lancamentos: LancamentoBruto[] = []
  const linhasUsadas = new Set<number>()
  for (const item of json.lancamentos) {
    const lancamento = validarItem(item, linhas, numeros, linhasUsadas, ancora)
    if (lancamento) lancamentos.push(lancamento)
  }

  const conferencia = { informadoCentavos: informado, lidoCentavos: somaDaFatura(lancamentos) }
  if (lancamentos.length === 0 || conferencia.lidoCentavos !== conferencia.informadoCentavos) return null
  return { lancamentos, conferencia }
}

function validarItem(
  item: Record<string, unknown>,
  linhas: string[],
  enviadas: Set<number>,
  usadas: Set<number>,
  ancora: Date,
): LancamentoBruto | null {
  const n = Number(item.linha)
  if (!Number.isInteger(n) || !enviadas.has(n) || usadas.has(n)) return null

  const valor = String(item.valor ?? "").replace(/^[-+]?\s*R\$\s*/, "").trim()
  if (!VALOR_ESCRITO.test(valor) || !contemValor(linhas[n], valor)) return null

  // O Inter põe o valor duas linhas abaixo da data e da descrição.
  const janela = [linhas[n], linhas[n - 1], linhas[n - 2]].filter((linha): linha is string => Boolean(linha))
  const descricaoIa = String(item.descricao ?? "").trim()
  const chave = soLetrasENumeros(descricaoIa).slice(0, 5)
  if (chave.length < 3 || !janela.some((linha) => soLetrasENumeros(linha).includes(chave))) return null

  const dataImpressa = dataDoItem(item, janela, ancora)
  if (!dataImpressa) return null

  let atual = 0
  let total = 0
  const parcela = /^(\d{1,2})\s*(?:\/|de)\s*(\d{1,2})$/i.exec(String(item.parcela ?? "").trim())
  if (parcela) {
    atual = Number(parcela[1])
    total = Number(parcela[2])
    const escrita = new RegExp(`(?<!\\d)0?${atual}\\s*(?:/|de)\\s*0?${total}(?!\\d)`, "i")
    if (!(total >= 2 && atual >= 1 && atual <= total && janela.some((linha) => escrita.test(linha)))) atual = total = 0
  }
  const ehParcela = total > 0

  // Sinal colado ao valor é evidência do próprio PDF e vale mais que a IA.
  const sinal = new RegExp(`(?:-|\\+\\s*)(?:R\\$\\s*)?${valor.replace(/\./g, "\\.")}(?![\\d,])`).test(linhas[n])
  const credito = sinal || item.credito === true

  const estabelecimento = descricaoIa.replace(/\s*\(?parcela\s+\d+\s+de\s+\d+\)?/i, "").replace(/\s\d{1,2}\/\d{1,2}$/, "").trim()
  usadas.add(n)
  return {
    data: ehParcela && atual > 1 ? somarMeses(dataImpressa, atual - 1) : dataImpressa,
    descricao: ehParcela
      ? `${estabelecimento} ${String(atual).padStart(2, "0")}/${String(total).padStart(2, "0")}`
      : estabelecimento,
    valorCentavos: paraCentavos(valor),
    tipo: credito ? "RECEITA" : "DESPESA",
    ...(ehParcela ? { parcelaAtual: atual, parcelasTotal: total } : {}),
    ...(ehParcela && atual > 1 ? { dataCompra: dataImpressa } : {}),
  }
}

/**
 * A data vem do próprio texto quando o formato é conhecido. Quando não é
 * (banco novo), aceita a data da IA só se o dia e o mês dela estiverem
 * escritos nas linhas do lançamento.
 */
function dataDoItem(item: Record<string, unknown>, janela: string[], ancora: Date): Date | null {
  for (const linha of janela) {
    const inicio = lerInicio(linha)
    if (inicio) return inicio.ano ? lerData(`${inicio.dia}/${inicio.mes}/${inicio.ano}`) : dataSemAno(inicio.dia, inicio.mes, ancora)
  }

  const casa = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/.exec(String(item.data ?? "").trim())
  if (!casa) return null
  const dia = Number(casa[1])
  const mes = Number(casa[2])
  const juntas = janela.join(" ").toLowerCase()
  const temDia = new RegExp(`(?<!\\d)0?${dia}(?!\\d)`).test(juntas)
  const temMes = new RegExp(`(?<!\\d)0?${mes}(?!\\d)`).test(juntas) || juntas.includes(MESES_CURTOS[mes - 1] ?? "#")
  if (!temDia || !temMes) return null
  return casa[3] ? lerData(`${dia}/${mes}/${casa[3]}`) : dataSemAno(dia, mes, ancora)
}
