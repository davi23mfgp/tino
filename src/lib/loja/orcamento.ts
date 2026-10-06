/**
 * Orçamento da loja e a lista "Para retomar hoje" (opção A do canvas, passo
 * 36, Davi em 05/10/2026).
 *
 * Funções puras: a tela, a rota e o teste leem a mesma resposta. O que o dono
 * de MEI perde hoje não é o orçamento, é o retorno: manda o preço no WhatsApp
 * e esquece de perguntar se o cliente decidiu. Por isso a tela abre no que
 * pede uma ação hoje, e não numa lista de cadastro.
 *
 * Ideias vindas do ERP Controllares (docs/referencias): número por loja,
 * validade, link público com contagem de aberturas, motivo obrigatório na
 * perda e próximo passo com data no cliente.
 */

import { ratear } from "@/lib/dinheiro"
import { diaNoFuso } from "@/lib/loja/contas"

export type StatusOrcamento = "RASCUNHO" | "ENVIADO" | "APROVADO" | "CONVERTIDO" | "PERDIDO"
export type MotivoPerda = "PRECO" | "PRAZO" | "ATENDIMENTO" | "DESISTIU" | "SEM_RESPOSTA" | "OUTRO"

/// O motivo é o que, somado no fim do mês, diz se o problema é preço, prazo ou
/// atendimento. "Perdido" sem motivo não ensina nada.
export const MOTIVOS_DE_PERDA: { valor: MotivoPerda; rotulo: string }[] = [
  { valor: "PRECO", rotulo: "Preço" },
  { valor: "PRAZO", rotulo: "Prazo" },
  { valor: "ATENDIMENTO", rotulo: "Atendimento" },
  { valor: "DESISTIU", rotulo: "Desistiu da compra" },
  { valor: "SEM_RESPOSTA", rotulo: "Não respondeu" },
  { valor: "OUTRO", rotulo: "Outro" },
]

export const rotuloDoMotivo = (motivo: MotivoPerda | null | undefined) =>
  MOTIVOS_DE_PERDA.find((item) => item.valor === motivo)?.rotulo ?? "sem motivo"

export const numeroDoOrcamento = (numero: number) => String(numero).padStart(4, "0")

export interface OrcamentoResumo {
  id: string
  numero: number
  status: StatusOrcamento
  totalCentavos: number
  /// Último dia em que o orçamento vale, gravado como meia-noite UTC do dia.
  validoAte: Date | null
  enviadoEm: Date | null
  aberturas: number
  ultimaAberturaEm: Date | null
  aprovadoPeloCliente: boolean
  motivoPerda: MotivoPerda | null
  vendaNumero: number | null
  criadoEm: Date
}

export type Situacao = "rascunho" | "enviado" | "visto" | "vencido" | "aprovado" | "convertido" | "perdido"

const diaGravado = (data: Date) => data.toISOString().slice(0, 10)

/**
 * Onde o orçamento parou.
 *
 * "Vencido" não é status gravado: é o enviado cuja validade passou. Gravar
 * exigiria uma tarefa à meia-noite só para mudar uma palavra, e a tarefa que
 * falha deixa o orçamento "válido" para sempre.
 */
export function situacaoDoOrcamento(orcamento: OrcamentoResumo, agora: Date, fuso?: string): Situacao {
  switch (orcamento.status) {
    case "RASCUNHO":
      return "rascunho"
    case "APROVADO":
      return "aprovado"
    case "CONVERTIDO":
      return "convertido"
    case "PERDIDO":
      return "perdido"
    case "ENVIADO":
      if (orcamento.validoAte && diaGravado(orcamento.validoAte) < diaNoFuso(agora, fuso)) return "vencido"
      return orcamento.aberturas > 0 ? "visto" : "enviado"
  }
}

/** Dias até o último dia de validade: 0 é hoje, 1 é amanhã. */
export function diasParaVencer(orcamento: OrcamentoResumo, agora: Date, fuso?: string): number | null {
  if (!orcamento.validoAte) return null
  const hoje = Date.parse(`${diaNoFuso(agora, fuso)}T00:00:00Z`)
  return Math.round((Date.parse(`${diaGravado(orcamento.validoAte)}T00:00:00Z`) - hoje) / 86_400_000)
}

/**
 * Entrada e parcelas sem perder centavo.
 *
 * A sobra da divisão vai para as primeiras parcelas, como em `ratear`: o
 * cliente vê R$ 100,01 + R$ 100,00 e a soma bate com o total do orçamento.
 */
export function dividirPagamento(totalCentavos: number, entradaCentavos: number | null, parcelas: number) {
  const entrada = Math.min(Math.max(0, entradaCentavos ?? 0), totalCentavos)
  const quantas = Math.max(1, Math.trunc(parcelas))
  return { entradaCentavos: entrada, parcelas: ratear(totalCentavos - entrada, quantas) }
}

const vezes = (n: number) => (n === 1 ? "1 vez" : `${n} vezes`)

function hora(data: Date, fuso?: string) {
  const [h, m] = data.toLocaleTimeString("pt-BR", { timeZone: fuso ?? "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }).split(":")
  return m === "00" ? `${Number(h)}h` : `${Number(h)}h${m}`
}

const diaMes = (dia: string) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}`

export interface ClienteComOrcamentos {
  id: string
  nome: string
  telefone: string | null
  proximoPasso: string | null
  proximoPassoEm: Date | null
  orcamentos: OrcamentoResumo[]
}

export interface ParaRetomar {
  clienteId: string
  nome: string
  telefone: string | null
  orcamentoId: string | null
  numero: number | null
  valorCentavos: number | null
  /// O que fazer, numa linha.
  linha: string
  /// Quando, curto: vai no selo.
  quando: string
  tom: "atencao" | "neutro" | "positivo"
  /// Ordem na lista: atrasado primeiro, rascunho por último.
  peso: number
}

/**
 * O que pede o dono hoje.
 *
 * Entram: o próximo passo marcado para hoje ou que já passou, o enviado que
 * vence hoje ou amanhã, o vencido, o aprovado que ainda não virou venda e o
 * rascunho por terminar. Enviado dentro do prazo e sem passo marcado não
 * entra: ele está esperando o cliente, não o dono.
 */
export function paraRetomarHoje(clientes: ClienteComOrcamentos[], agora: Date, fuso?: string): ParaRetomar[] {
  const hoje = diaNoFuso(agora, fuso)
  const lista: ParaRetomar[] = []

  for (const cliente of clientes) {
    const base = { clienteId: cliente.id, nome: cliente.nome, telefone: cliente.telefone }
    const cartoes: ParaRetomar[] = []

    for (const orcamento of cliente.orcamentos) {
      const numero = numeroDoOrcamento(orcamento.numero)
      const doOrcamento = { ...base, orcamentoId: orcamento.id, numero: orcamento.numero, valorCentavos: orcamento.totalCentavos }
      const situacao = situacaoDoOrcamento(orcamento, agora, fuso)
      if (situacao === "rascunho") {
        cartoes.push({ ...doOrcamento, linha: `Orçamento ${numero} · rascunho`, quando: "terminar", tom: "neutro", peso: 5 })
      } else if (situacao === "vencido") {
        cartoes.push({ ...doOrcamento, linha: `Orçamento ${numero} · reenvie ou marque como perdido`, quando: `venceu ${diaMes(diaGravado(orcamento.validoAte!))}`, tom: "atencao", peso: 1 })
      } else if (situacao === "aprovado") {
        cartoes.push({ ...doOrcamento, linha: `Orçamento ${numero} · aprovado${orcamento.aprovadoPeloCliente ? " pelo link" : ""}`, quando: "virar venda", tom: "positivo", peso: 4 })
      } else if (situacao === "enviado" || situacao === "visto") {
        const dias = diasParaVencer(orcamento, agora, fuso)
        if (dias !== null && dias <= 1) {
          const comoEsta = situacao === "visto" ? `abriu ${vezes(orcamento.aberturas)}, não respondeu` : "ainda não abriu o link"
          cartoes.push({ ...doOrcamento, linha: `Orçamento ${numero} · ${comoEsta}`, quando: dias === 0 ? "vence hoje" : "vence amanhã", tom: "atencao", peso: 3 })
        }
      }
    }

    // O próximo passo do cliente vai junto do orçamento dele que está andando,
    // em vez de virar um segundo cartão com o mesmo nome.
    if (cliente.proximoPasso && cliente.proximoPassoEm && diaNoFuso(cliente.proximoPassoEm, fuso) <= hoje) {
      const dia = diaNoFuso(cliente.proximoPassoEm, fuso)
      const atrasado = dia < hoje
      const quando = atrasado ? `atrasado, ${diaMes(dia)}` : `hoje, ${hora(cliente.proximoPassoEm, fuso)}`
      const andando = cliente.orcamentos
        .filter((orcamento) => ["enviado", "visto", "aprovado", "rascunho", "vencido"].includes(situacaoDoOrcamento(orcamento, agora, fuso)))
        .sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime())[0]
      const passo = {
        ...base,
        orcamentoId: andando?.id ?? null,
        numero: andando?.numero ?? null,
        valorCentavos: andando?.totalCentavos ?? null,
        linha: andando ? `${cliente.proximoPasso} · orçamento ${numeroDoOrcamento(andando.numero)}` : cliente.proximoPasso,
        quando,
        tom: "atencao" as const,
        // Atrasado vem antes de tudo; o de hoje, pela hora.
        peso: atrasado ? 0 : 2 + cliente.proximoPassoEm.getTime() / 1e15,
      }
      const semRepetir = cartoes.filter((cartao) => cartao.orcamentoId !== passo.orcamentoId || passo.orcamentoId === null)
      cartoes.length = 0
      cartoes.push(passo, ...semRepetir)
    }

    lista.push(...cartoes)
  }

  return lista.sort((a, b) => a.peso - b.peso)
}

/**
 * O que está em aberto, por etapa. Vencido fica de fora: não é dinheiro que
 * o dono pode esperar, é um orçamento para reenviar ou dar por perdido.
 */
export function emAberto(orcamentos: OrcamentoResumo[], agora: Date, fuso?: string) {
  const partes = { rascunho: 0, enviado: 0, visto: 0 }
  let quantidade = 0
  for (const orcamento of orcamentos) {
    const situacao = situacaoDoOrcamento(orcamento, agora, fuso)
    if (situacao === "rascunho" || situacao === "enviado" || situacao === "visto") {
      partes[situacao] += orcamento.totalCentavos
      quantidade += 1
    }
  }
  return { totalCentavos: partes.rascunho + partes.enviado + partes.visto, quantidade, partes }
}

const JANELA_MS = 90 * 86_400_000

/**
 * Quantos dos orçamentos enviados viraram sim, nos últimos 90 dias e nos 90
 * anteriores (a referência do número).
 *
 * Conta pelo dia do envio: rascunho nunca enviado não é oferta recusada. O
 * percentual sai em pontos-base inteiros, e `null` quando não houve envio,
 * porque 0 de 0 não é 0%.
 */
export function taxaDeFechamento(orcamentos: OrcamentoResumo[], agora: Date) {
  const janela = (de: number, ate: number) => {
    const enviados = orcamentos.filter((orcamento) => orcamento.enviadoEm && orcamento.enviadoEm.getTime() > de && orcamento.enviadoEm.getTime() <= ate)
    const fechados = enviados.filter((orcamento) => orcamento.status === "APROVADO" || orcamento.status === "CONVERTIDO").length
    return { fechados, enviados: enviados.length, bps: enviados.length > 0 ? Math.round((fechados * 10_000) / enviados.length) : null }
  }
  const fim = agora.getTime()
  return { atual: janela(fim - JANELA_MS, fim), anterior: janela(fim - 2 * JANELA_MS, fim - JANELA_MS) }
}

/**
 * A linha do cliente em "Todos os clientes": o último fato, e o valor que
 * importa (fiado na rua vem antes do orçamento, porque é dinheiro já devido).
 */
export function resumoDoCliente(cliente: { orcamentos: OrcamentoResumo[]; criadoEm: Date }, fiadoCentavos: number, agora: Date, fuso?: string) {
  const ultimo = [...cliente.orcamentos].sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime())[0]
  let detalhe = `cliente desde ${diaMes(diaNoFuso(cliente.criadoEm, fuso))}/${diaNoFuso(cliente.criadoEm, fuso).slice(0, 4)}`
  let rotulo = ""
  if (ultimo) {
    const numero = numeroDoOrcamento(ultimo.numero)
    const situacao = situacaoDoOrcamento(ultimo, agora, fuso)
    const textos: Record<Situacao, [string, string]> = {
      rascunho: [`orçamento ${numero} em rascunho`, "rascunho"],
      enviado: [`orçamento ${numero} enviado, não abriu`, "em aberto"],
      visto: [`orçamento ${numero} aberto ${vezes(ultimo.aberturas)}`, "em aberto"],
      vencido: [`orçamento ${numero} venceu`, "vencido"],
      aprovado: [`aprovou o ${numero}`, "aprovado"],
      convertido: [ultimo.vendaNumero ? `o ${numero} virou a venda ${ultimo.vendaNumero}` : `o ${numero} virou venda`, "vendido"],
      perdido: [`recusou o ${numero} · ${rotuloDoMotivo(ultimo.motivoPerda).toLowerCase()}`, "perdido"],
    }
    ;[detalhe, rotulo] = textos[situacao]
  }
  if (fiadoCentavos > 0) return { detalhe, valorCentavos: fiadoCentavos, rotuloValor: "no fiado" }
  return { detalhe, valorCentavos: ultimo ? ultimo.totalCentavos : null, rotuloValor: rotulo }
}

/// Quem busca o link para montar a prévia, e não é o cliente lendo. Sem isto,
/// o WhatsApp do próprio dono abre o link ao enviar, e todo orçamento nasce
/// "aberto 1 vez".
const LEITORES_DE_PREVIA = /whatsapp|facebookexternalhit|facebot|telegrambot|twitterbot|slackbot|discordbot|linkedinbot|skypeuripreview|googlebot|bingbot|bot\b|crawler|spider|preview|curl|wget|python-requests|headless/i

const INTERVALO_ENTRE_ABERTURAS_MS = 30 * 60_000

/**
 * Esta visita conta como "o cliente abriu"?
 *
 * Não conta: robô de prévia, o próprio dono conferindo o link, e a mesma
 * pessoa recarregando a página em menos de 30 minutos (seria "aberto 5
 * vezes" de quem leu uma vez só).
 */
export function aberturaConta(visita: { userAgent: string | null; ehDaLoja: boolean; ultimaAberturaEm: Date | null; agora: Date }) {
  if (visita.ehDaLoja) return false
  if (!visita.userAgent || LEITORES_DE_PREVIA.test(visita.userAgent)) return false
  if (visita.ultimaAberturaEm && visita.agora.getTime() - visita.ultimaAberturaEm.getTime() < INTERVALO_ENTRE_ABERTURAS_MS) return false
  return true
}

/** Resumo a partir de qualquer leitura do orçamento que traga estes campos. */
export function paraResumoSimples(linha: {
  id: string; numero: number; status: string; totalCentavos: number; validoAte: Date | null; enviadoEm: Date | null
  aberturas: number; ultimaAberturaEm: Date | null; aprovadoPeloCliente: boolean; motivoPerda: string | null; criadoEm: Date
}): OrcamentoResumo {
  return {
    id: linha.id, numero: linha.numero, status: linha.status as StatusOrcamento, totalCentavos: linha.totalCentavos,
    validoAte: linha.validoAte, enviadoEm: linha.enviadoEm, aberturas: linha.aberturas, ultimaAberturaEm: linha.ultimaAberturaEm,
    aprovadoPeloCliente: linha.aprovadoPeloCliente, motivoPerda: (linha.motivoPerda as MotivoPerda | null) ?? null,
    vendaNumero: null, criadoEm: linha.criadoEm,
  }
}
