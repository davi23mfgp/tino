/**
 * Camada 4 dos logos: a IA identifica a loja das compras que nada mais
 * reconheceu (28/09/2026).
 *
 * As camadas de antes resolvem sem IA e na hora: o catálogo (`marcas.ts`), o
 * intermediário na frente do nome ("EBW*SPOTIFY") e a loja que a pessoa
 * escolheu com um toque. Aqui chega só o que sobrou.
 *
 * COTA PRÓPRIA, PEQUENA E FIXA. Davi pediu que isto não esgote a IA do
 * assistente e das outras ferramentas, que usam as mesmas chaves (Groq e
 * Anthropic têm limite por minuto e por dia). Por isso:
 * - roda uma vez por dia, no agendamento da noite, nunca por clique;
 * - UMA chamada por dia, com no máximo `COTA_POR_DIA` descrições;
 * - cada descrição é perguntada uma vez só na vida (a resposta fica em
 *   `MarcaDescoberta`, compartilhada por todos os lares), inclusive quando a
 *   IA não sabe;
 * - as descrições mais frequentes vão primeiro, porque são as que mais
 *   aparecem na tela.
 *
 * A IA SUGERE, NÃO DECIDE SOZINHA. Logo errado na tela é pior do que nenhum
 * (um "Carrefour" na compra do mercadinho estraga a confiança no extrato
 * inteiro). Só vira logo automático:
 * - marca do catálogo, com confiança de pelo menos 70; ou
 * - site fora do catálogo com confiança de pelo menos 85 E que devolve um
 *   logo de verdade.
 * O resto vira sugestão em "Qual loja é esta?", para a pessoa confirmar.
 */

import Anthropic from "@anthropic-ai/sdk"

import { prisma } from "@/lib/prisma"
import { chaveDaDescricao, marcaDaCompra, marcaDoCatalogo } from "@/lib/marcas"
import { logoDaInternet, siteLimpo } from "@/lib/logo-da-internet"

/// Quantas descrições cabem na única chamada do dia. 40 textos curtos dão
/// perto de 1.500 palavras entre ida e volta: uma fração pequena da cota
/// diária gratuita do Groq, e centavos no modelo mais barato da Anthropic.
export const COTA_POR_DIA = 40

/// Janela da cota. 20h e não 24h: o agendamento roda sempre no mesmo horário,
/// e uma execução que atrasasse alguns minutos acharia a de ontem ainda dentro
/// da janela e pularia o dia.
const JANELA_MS = 20 * 60 * 60 * 1000

const ORIGENS_DO_BANCO = ["IMPORT_OFX", "IMPORT_CSV", "IMPORT_PDF", "OPEN_FINANCE"] as const

export type Situacao = "IDENTIFICADA" | "SUGERIDA" | "DESCONHECIDA"

export interface RespostaDaIA {
  i: number
  marca: string | null
  site: string | null
  confianca: number
}

export interface Decisao {
  situacao: Situacao
  marcaNome: string | null
  site: string | null
  confianca: number
}

/**
 * Transferência, Pix, tarifa e juros não são compra em loja: não têm logo e
 * podem ter nome de pessoa, que não deve sair para um serviço de fora.
 */
const NAO_E_LOJA = /^\s*(pix|ted|doc|transf|transferencia|pagamento|pagto|pgto|salario|rendimento|juros|iof|tarifa|estorno|saque|deposito|resgate|aplicacao|fatura|anuidade|encargos?)\b/i

export function vaiParaIA(descricao: string): boolean {
  const semAcento = descricao.normalize("NFD").replace(/[̀-ͯ]/g, "")
  if (NAO_E_LOJA.test(semAcento)) return false
  if (marcaDaCompra(descricao)) return false
  return chaveDaDescricao(descricao).replace(/ /g, "").length >= 3
}

export function montarPergunta(descricoes: string[]): string {
  return [
    "Abaixo estão textos de compras no cartão de crédito no Brasil, do jeito que o banco escreve.",
    "Para cada um, diga qual é a empresa, SÓ se for uma rede, marca ou empresa conhecida.",
    "Loja pequena, de bairro, nome de pessoa ou texto que você não reconhece com segurança: marca null.",
    "Não adivinhe. É melhor null do que a marca errada.",
    'Responda somente JSON, sem texto em volta: {"itens":[{"i":0,"marca":"Nome da marca","site":"dominio-oficial.com.br","confianca":0}]}',
    "confianca vai de 0 a 100. site é o domínio oficial no Brasil, sem https e sem www.",
    "",
    ...descricoes.map((descricao, indice) => `${indice}: ${descricao}`),
  ].join("\n")
}

/** Lê a resposta da IA sem confiar nela: item fora do formato é descartado. */
export function lerResposta(texto: string, quantidade: number): RespostaDaIA[] {
  const inicio = texto.indexOf("{")
  const fim = texto.lastIndexOf("}")
  if (inicio < 0 || fim < inicio) return []
  let dados: unknown
  try {
    dados = JSON.parse(texto.slice(inicio, fim + 1))
  } catch {
    return []
  }
  const itens = (dados as { itens?: unknown })?.itens
  if (!Array.isArray(itens)) return []
  const vistos = new Set<number>()
  const resultado: RespostaDaIA[] = []
  for (const item of itens) {
    if (!item || typeof item !== "object") continue
    const { i, marca, site, confianca } = item as Record<string, unknown>
    if (typeof i !== "number" || !Number.isInteger(i) || i < 0 || i >= quantidade || vistos.has(i)) continue
    vistos.add(i)
    resultado.push({
      i,
      marca: typeof marca === "string" && marca.trim() ? marca.trim().slice(0, 60) : null,
      site: typeof site === "string" && site.trim() ? site.trim() : null,
      confianca: typeof confianca === "number" && Number.isFinite(confianca) ? Math.max(0, Math.min(100, Math.round(confianca))) : 0,
    })
  }
  return resultado
}

/** O que fazer com uma resposta. `temLogo` confere se o site devolve logo de verdade. */
export async function decidir(resposta: RespostaDaIA, temLogo: (site: string) => Promise<boolean>): Promise<Decisao> {
  const { marca, confianca } = resposta
  if (!marca) return { situacao: "DESCONHECIDA", marcaNome: null, site: null, confianca }
  const site = resposta.site ? siteLimpo(resposta.site) : null

  const doCatalogo = marcaDoCatalogo(marca, site)
  if (doCatalogo) {
    return { situacao: confianca >= 70 ? "IDENTIFICADA" : "SUGERIDA", marcaNome: doCatalogo.nome, site: doCatalogo.site, confianca }
  }
  if (confianca >= 85 && site && (await temLogo(site))) return { situacao: "IDENTIFICADA", marcaNome: marca, site, confianca }
  if (confianca >= 50) return { situacao: "SUGERIDA", marcaNome: marca, site, confianca }
  return { situacao: "DESCONHECIDA", marcaNome: null, site: null, confianca }
}

/** Chama o modelo mais barato disponível. Groq primeiro: tem cota gratuita. */
async function perguntarAoModelo(pergunta: string): Promise<string> {
  if (process.env.GROQ_API_KEY) {
    const resposta = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      signal: AbortSignal.timeout(30000),
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.GROQ_MODELO_MARCAS || "openai/gpt-oss-20b",
        max_completion_tokens: 2500,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: pergunta }],
      }),
    })
    if (!resposta.ok) throw new Error(`Groq respondeu ${resposta.status}`)
    const dados = (await resposta.json()) as { choices?: { message?: { content?: string } }[] }
    return dados.choices?.[0]?.message?.content ?? ""
  }
  const cliente = new Anthropic()
  const mensagem = await cliente.messages.create({
    model: process.env.ANTHROPIC_MODELO_MARCAS || "claude-haiku-4-5",
    max_tokens: 2500,
    messages: [{ role: "user", content: pergunta }],
  })
  return mensagem.content.map((bloco) => (bloco.type === "text" ? bloco.text : "")).join("")
}

/**
 * As descrições que ainda não têm loja, das mais frequentes para as menos,
 * no máximo `limite`.
 */
async function descricoesPendentes(limite: number): Promise<{ chave: string; exemplo: string }[]> {
  const desde = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
  const grupos = await prisma.transacao.groupBy({
    by: ["descricao", "descricaoOriginal", "origem"],
    where: {
      tipo: "DESPESA",
      data: { gte: desde },
      // Só texto que veio do banco: importado, ou capturado do aviso do
      // celular. O que a pessoa digitou ("Aluguel", "Escola do Téo") é
      // palavra dela, não nome de loja — mandar para a IA só gastaria cota.
      OR: [{ origem: { in: [...ORIGENS_DO_BANCO] } }, { origem: "MANUAL", observacao: { startsWith: "Capturado do celular" } }],
    },
    _count: { _all: true },
    orderBy: { _count: { descricao: "desc" } },
    take: 3000,
  })

  // O que a pessoa já associou com um toque não precisa de IA.
  const identidades = (await prisma.identidadeVisual.findMany({ select: { nome: true } })).map((item) => chaveDaDescricao(item.nome))

  const porChave = new Map<string, { exemplo: string; vezes: number }>()
  for (const grupo of grupos) {
    // Na captura, o original é o aviso inteiro (com final do cartão e
    // valor); a loja é o que ficou na descrição.
    const texto = ORIGENS_DO_BANCO.includes(grupo.origem as never) ? grupo.descricaoOriginal || grupo.descricao : grupo.descricao
    if (!vaiParaIA(texto) || !vaiParaIA(grupo.descricao)) continue
    const chave = chaveDaDescricao(texto)
    if (identidades.some((nome) => nome && chave.includes(nome))) continue
    const atual = porChave.get(chave)
    porChave.set(chave, { exemplo: atual?.exemplo ?? texto.slice(0, 120), vezes: (atual?.vezes ?? 0) + grupo._count._all })
  }

  const jaVistas = new Set(
    (await prisma.marcaDescoberta.findMany({ where: { chave: { in: [...porChave.keys()] } }, select: { chave: true } })).map((linha) => linha.chave),
  )
  return [...porChave.entries()]
    .filter(([chave]) => !jaVistas.has(chave))
    .sort((a, b) => b[1].vezes - a[1].vezes)
    .slice(0, limite)
    .map(([chave, { exemplo }]) => ({ chave, exemplo }))
}

export interface ResultadoDaRodada {
  motivo?: "sem-ia" | "cota-do-dia-usada" | "nada-pendente" | "falha-na-ia"
  perguntadas: number
  identificadas: number
  sugeridas: number
}

/**
 * A rodada do dia. Chamada pelo agendamento da noite; nunca por uma tela.
 */
export async function identificarLojasComIA(
  perguntar: (pergunta: string) => Promise<string> = perguntarAoModelo,
  temLogo: (site: string) => Promise<boolean> = async (site) => Boolean(await logoDaInternet(site)),
): Promise<ResultadoDaRodada> {
  const vazio = { perguntadas: 0, identificadas: 0, sugeridas: 0 }
  if (perguntar === perguntarAoModelo && !process.env.GROQ_API_KEY && !process.env.ANTHROPIC_API_KEY) return { ...vazio, motivo: "sem-ia" }

  const usadasHoje = await prisma.marcaDescoberta.count({ where: { criadoEm: { gte: new Date(Date.now() - JANELA_MS) } } })
  if (usadasHoje >= COTA_POR_DIA) return { ...vazio, motivo: "cota-do-dia-usada" }

  const pendentes = await descricoesPendentes(COTA_POR_DIA - usadasHoje)
  if (!pendentes.length) return { ...vazio, motivo: "nada-pendente" }

  let texto: string
  try {
    texto = await perguntar(montarPergunta(pendentes.map((item) => item.exemplo)))
  } catch {
    // Falhou (limite, rede): nada é gravado, e as mesmas descrições voltam
    // amanhã. Não tenta de novo agora — tentar de novo é gastar a cota dos
    // outros.
    return { ...vazio, motivo: "falha-na-ia" }
  }

  const respostas = new Map(lerResposta(texto, pendentes.length).map((resposta) => [resposta.i, resposta]))
  let identificadas = 0
  let sugeridas = 0
  for (const [indice, pendente] of pendentes.entries()) {
    // Sem resposta para o item conta como "não sabe": perguntar de novo
    // amanhã daria o mesmo resultado e gastaria cota.
    const decisao = await decidir(respostas.get(indice) ?? { i: indice, marca: null, site: null, confianca: 0 }, temLogo)
    if (decisao.situacao === "IDENTIFICADA") identificadas++
    if (decisao.situacao === "SUGERIDA") sugeridas++
    await prisma.marcaDescoberta.upsert({
      where: { chave: pendente.chave },
      create: { chave: pendente.chave, exemplo: pendente.exemplo, ...decisao },
      update: {},
    })
  }
  return { perguntadas: pendentes.length, identificadas, sugeridas }
}

/** O endereço do logo de uma loja descoberta: o guardado no app, se for do catálogo. */
export function logoDaDescoberta(marcaNome: string | null, site: string | null): string | null {
  const doCatalogo = marcaDoCatalogo(marcaNome, site)
  if (doCatalogo) return doCatalogo.logo ?? `/api/logo/${doCatalogo.site}`
  return site ? `/api/logo/${site}` : null
}
