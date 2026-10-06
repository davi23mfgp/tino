/**
 * Agenda e ordem de serviço da loja (opção A do passo 37, Davi, 05/10/2026).
 *
 * Funções puras: a tela, a rota e o teste leem a mesma resposta. A agenda
 * junta três coisas que o dono hoje anota em lugares diferentes: o
 * compromisso marcado, o prazo do serviço e o retorno combinado com o
 * cliente (o "próximo passo" da tela Clientes).
 */

import { diaNoFuso } from "@/lib/loja/contas"

export type Etapa = "RECEBIDO" | "FAZENDO" | "ESPERANDO_PECA" | "PRONTO" | "ENTREGUE"

export const ETAPAS: { valor: Etapa; rotulo: string; doCliente: string }[] = [
  { valor: "RECEBIDO", rotulo: "Recebido", doCliente: "Recebido" },
  { valor: "FAZENDO", rotulo: "Fazendo", doCliente: "Em conserto" },
  { valor: "ESPERANDO_PECA", rotulo: "Esperando peça", doCliente: "Esperando peça" },
  { valor: "PRONTO", rotulo: "Pronto", doCliente: "Pronto para buscar" },
  { valor: "ENTREGUE", rotulo: "Entregue", doCliente: "Entregue" },
]

export const rotuloDaEtapa = (etapa: Etapa) => ETAPAS.find((item) => item.valor === etapa)?.rotulo ?? etapa

export const numeroDaOrdem = (numero: number) => String(numero).padStart(4, "0")

const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"]
const somarDias = (dia: string, dias: number) => new Date(Date.parse(`${dia}T00:00:00Z`) + dias * 86_400_000).toISOString().slice(0, 10)
const diaDaSemana = (dia: string) => DIAS[new Date(`${dia}T00:00:00Z`).getUTCDay()]!
export const diaMes = (dia: string) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}`

/** A semana de segunda a domingo que contém o dia, no fuso do lar. */
export function semanaDe(dia: string) {
  const domingoEhZero = new Date(`${dia}T00:00:00Z`).getUTCDay()
  const segunda = somarDias(dia, -((domingoEhZero + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => {
    const d = somarDias(segunda, i)
    return { dia: d, nome: diaDaSemana(d), numero: d.slice(8, 10) }
  })
}

function hora(data: Date, fuso?: string) {
  return data.toLocaleTimeString("pt-BR", { timeZone: fuso ?? "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" })
}

/**
 * Prazo da OS em palavras. Conta pelo dia no fuso do lar: o aparelho que
 * vence às 18h de hoje "vence hoje" desde a meia-noite, não só depois das 18h.
 */
export function prazoDaOrdem(prazoEm: Date | null, etapa: Etapa, agora: Date, fuso?: string): { texto: string; tom: "atencao" | "neutro" } {
  if (!prazoEm) return { texto: "sem prazo", tom: "neutro" }
  if (etapa === "ENTREGUE") return { texto: `entregue`, tom: "neutro" }
  const hoje = diaNoFuso(agora, fuso)
  const dia = diaNoFuso(prazoEm, fuso)
  const dias = Math.round((Date.parse(`${dia}T00:00:00Z`) - Date.parse(`${hoje}T00:00:00Z`)) / 86_400_000)
  if (dias < 0) return { texto: dias === -1 ? "atrasou 1 dia" : `atrasou ${-dias} dias`, tom: "atencao" }
  if (dias === 0) return { texto: etapa === "PRONTO" ? `entregar hoje, ${hora(prazoEm, fuso).replace(":00", "h").replace(":", "h")}` : "prazo hoje", tom: "atencao" }
  if (dias === 1) return { texto: "prazo amanhã", tom: "neutro" }
  return { texto: `prazo ${diaDaSemana(dia)} ${diaMes(dia)}`, tom: "neutro" }
}

export interface CompromissoDia { id: string; titulo: string; detalhe: string | null; inicioEm: Date; diaInteiro: boolean; feitoEm: Date | null; cliente: string | null; ordemNumero: number | null }
export interface OrdemDia { id: string; numero: number; cliente: string; objeto: string; servico: string; etapa: Etapa; prazoEm: Date | null; valorCentavos: number | null }
export interface PassoDia { clienteId: string; cliente: string; proximoPasso: string; proximoPassoEm: Date }

export interface ItemDaAgenda {
  tipo: "compromisso" | "os" | "retorno"
  id: string
  hora: string | null
  titulo: string
  sub: string
  selo: { texto: string; tom: "atencao" | "neutro" | "positivo" } | null
  feito: boolean
}

/**
 * O dia em linha do tempo: compromisso, prazo de OS aberta e retorno de
 * cliente, pela hora. O que é do dia inteiro vem primeiro, sem hora.
 * OS entregue não ocupa a agenda: já saiu da loja.
 */
export function itensDoDia(dia: string, fontes: { compromissos: CompromissoDia[]; ordens: OrdemDia[]; passos: PassoDia[] }, agora: Date, fuso?: string): ItemDaAgenda[] {
  const itens: (ItemDaAgenda & { ordem: number })[] = []
  for (const c of fontes.compromissos) {
    const doDia = c.diaInteiro ? c.inicioEm.toISOString().slice(0, 10) : diaNoFuso(c.inicioEm, fuso)
    if (doDia !== dia) continue
    const ligado = [c.cliente, c.ordemNumero ? `para a OS ${numeroDaOrdem(c.ordemNumero)}` : null, c.detalhe].filter(Boolean).join(" · ")
    itens.push({ tipo: "compromisso", id: c.id, hora: c.diaInteiro ? null : hora(c.inicioEm, fuso), titulo: c.titulo, sub: ligado, selo: null, feito: Boolean(c.feitoEm), ordem: c.diaInteiro ? 0 : c.inicioEm.getTime() })
  }
  for (const o of fontes.ordens) {
    if (!o.prazoEm || o.etapa === "ENTREGUE" || diaNoFuso(o.prazoEm, fuso) !== dia) continue
    const etapa = rotuloDaEtapa(o.etapa).toLowerCase()
    itens.push({
      tipo: "os", id: o.id, hora: hora(o.prazoEm, fuso), titulo: `OS ${numeroDaOrdem(o.numero)} · ${o.cliente}`, sub: `${o.objeto}, ${o.servico}`,
      selo: { texto: etapa, tom: o.etapa === "PRONTO" ? "positivo" : "neutro" }, feito: false, ordem: o.prazoEm.getTime(),
    })
  }
  for (const p of fontes.passos) {
    if (diaNoFuso(p.proximoPassoEm, fuso) !== dia) continue
    const atrasado = p.proximoPassoEm.getTime() < agora.getTime()
    itens.push({
      tipo: "retorno", id: p.clienteId, hora: hora(p.proximoPassoEm, fuso), titulo: p.cliente, sub: p.proximoPasso,
      selo: { texto: atrasado ? "passou da hora" : "retorno", tom: "atencao" }, feito: false, ordem: p.proximoPassoEm.getTime(),
    })
  }
  return itens.sort((a, b) => a.ordem - b.ordem).map(({ ordem: _ordem, ...item }) => item)
}

/** Quantos itens cada dia da semana tem, para os pontos da faixa de dias. */
export function contarPorDia(semana: { dia: string }[], fontes: Parameters<typeof itensDoDia>[1], agora: Date, fuso?: string) {
  return Object.fromEntries(semana.map(({ dia }) => [dia, itensDoDia(dia, fontes, agora, fuso).length]))
}

export interface ItemDaChecklist { texto: string; feito: boolean }

/** Checklist gravada como JSON: o que não tiver a forma certa fica de fora. */
export function lerChecklist(valor: unknown): ItemDaChecklist[] {
  if (!Array.isArray(valor)) return []
  return valor.flatMap((item) =>
    item && typeof item === "object" && typeof (item as ItemDaChecklist).texto === "string"
      ? [{ texto: (item as ItemDaChecklist).texto, feito: Boolean((item as ItemDaChecklist).feito) }]
      : [],
  )
}

export interface AvisoGerado { chave: string; tipo: string; titulo: string; texto: string; rota: string; acao: string }

/**
 * Lembretes do sino, recalculados a cada abertura. A chave leva o dia, então
 * "OS 0008 vence hoje" nasce uma vez por dia, e não a cada recarga.
 */
export function lembretes(
  fontes: {
    ordens: OrdemDia[]
    orcamentos: { id: string; numero: number; cliente: string; clienteId: string; status: string; validoAte: Date | null; aberturas: number }[]
  },
  agora: Date,
  fuso?: string,
): AvisoGerado[] {
  const hoje = diaNoFuso(agora, fuso)
  const amanha = somarDias(hoje, 1)
  const avisos: AvisoGerado[] = []
  for (const o of fontes.ordens) {
    if (!o.prazoEm || o.etapa === "ENTREGUE" || o.etapa === "PRONTO") continue
    const dia = diaNoFuso(o.prazoEm, fuso)
    const n = numeroDaOrdem(o.numero)
    if (dia === hoje) avisos.push({ chave: `os-vence:${o.id}:${hoje}`, tipo: "os_vence", titulo: `OS ${n} vence hoje`, texto: `${o.objeto} de ${o.cliente}, ${o.servico}`, rota: `/loja/agenda?os=${o.id}`, acao: "Ver OS" })
    else if (dia < hoje) avisos.push({ chave: `os-atrasada:${o.id}:${hoje}`, tipo: "os_atrasada", titulo: `OS ${n} passou do prazo`, texto: `${o.objeto} de ${o.cliente}: prazo era ${diaMes(dia)}`, rota: `/loja/agenda?os=${o.id}`, acao: "Ver OS" })
  }
  for (const orc of fontes.orcamentos) {
    if (orc.status !== "ENVIADO" || !orc.validoAte) continue
    if (orc.validoAte.toISOString().slice(0, 10) !== amanha) continue
    avisos.push({
      chave: `orc-vence:${orc.id}:${hoje}`, tipo: "orcamento_vence", titulo: `Orçamento ${String(orc.numero).padStart(4, "0")} de ${orc.cliente} vence amanhã`,
      texto: orc.aberturas > 0 ? `abriu ${orc.aberturas === 1 ? "1 vez" : `${orc.aberturas} vezes`} e não respondeu` : "ainda não abriu o link",
      rota: `/loja/clientes?cliente=${orc.clienteId}`, acao: "Abrir",
    })
  }
  return avisos
}

/** A mensagem de "está pronto", para o dono mandar do próprio WhatsApp. */
export function mensagemDePronto(cliente: string, objeto: string, loja: string, link: string) {
  return `Olá, ${cliente.split(" ")[0]}! Seu ${objeto} está pronto na ${loja}. Pode buscar quando quiser. Acompanhe por aqui: ${link}`
}
