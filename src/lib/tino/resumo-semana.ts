/**
 * Resumo da semana, mandado no domingo à noite pelo Telegram.
 *
 * É o "acompanhamento contínuo" que o Davi pediu (10/11/2026): a pessoa não
 * precisa abrir o app para saber como foi a semana e o que vence na próxima.
 * Vai pelo Telegram, e não pela notificação, porque leva valores: notificação
 * aparece na tela de bloqueio, e a conversa com o bot é da própria pessoa.
 */

import { responder, telegramDisponivel } from "@/lib/captura/telegram"
import { formatarMoeda } from "@/lib/dinheiro"
import { prisma } from "@/lib/prisma"

export interface DadosDaSemana {
  gastoCentavos: number
  gastoSemanaAnteriorCentavos: number
  categorias: { nome: string; centavos: number }[]
  vencimentos: { descricao: string; centavos: number; dia: string }[]
  esperandoConferir: number
}

/**
 * O texto do resumo, ou `null` quando não há o que dizer. Semana sem gasto
 * lançado e sem conta a vencer não vira "você gastou R$ 0,00": isso seria
 * afirmar algo que o Tino não sabe (a pessoa pode só não ter anotado).
 */
export function textoDoResumo(dados: DadosDaSemana): string | null {
  if (dados.gastoCentavos <= 0 && dados.vencimentos.length === 0 && dados.esperandoConferir === 0) return null
  const linhas: string[] = ["<b>Sua semana no Tino</b>"]

  if (dados.gastoCentavos > 0) {
    let comparacao = ""
    // A semana anterior é a referência (regra 4). Sem ela, o número vai só.
    if (dados.gastoSemanaAnteriorCentavos > 0) {
      const diferenca = dados.gastoCentavos - dados.gastoSemanaAnteriorCentavos
      comparacao =
        diferenca === 0
          ? ", igual à semana anterior"
          : `, ${formatarMoeda(Math.abs(diferenca))} a ${diferenca > 0 ? "mais" : "menos"} que na semana anterior`
    }
    linhas.push(`Você gastou ${formatarMoeda(dados.gastoCentavos)}${comparacao}.`)
    if (dados.categorias.length) {
      linhas.push("Para onde foi: " + dados.categorias.map((linha) => `${linha.nome} ${formatarMoeda(linha.centavos)}`).join(", ") + ".")
    }
  } else {
    linhas.push("Nenhum gasto anotado nesta semana.")
  }

  if (dados.vencimentos.length) {
    linhas.push("")
    linhas.push("<b>Vence nos próximos 7 dias</b>")
    for (const conta of dados.vencimentos) linhas.push(`${conta.dia}: ${conta.descricao}, ${formatarMoeda(conta.centavos)}`)
  }

  if (dados.esperandoConferir > 0) {
    linhas.push("")
    linhas.push(
      dados.esperandoConferir === 1
        ? "Há 1 compra esperando você conferir no app."
        : `Há ${dados.esperandoConferir} compras esperando você conferir no app.`,
    )
  }
  return linhas.join("\n")
}

const DIA = 86_400_000
const escapar = (texto: string) => texto.replace(/[&<>]/g, (letra) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[letra] as string)

export async function dadosDaSemana(larId: string, agora: Date): Promise<DadosDaSemana> {
  const inicio = new Date(agora.getTime() - 7 * DIA)
  const antes = new Date(agora.getTime() - 14 * DIA)
  const [gastos, anteriores, fixas, esperandoConferir] = await Promise.all([
    prisma.transacao.findMany({
      where: { larId, tipo: "DESPESA", data: { gt: inicio, lte: agora } },
      select: { valorCentavos: true, categoria: { select: { nome: true } } },
    }),
    prisma.transacao.aggregate({ where: { larId, tipo: "DESPESA", data: { gt: antes, lte: inicio } }, _sum: { valorCentavos: true } }),
    prisma.recorrencia.findMany({
      where: { larId, ativa: true, tipo: "DESPESA", proximaData: { gte: agora, lte: new Date(agora.getTime() + 7 * DIA) } },
      select: { descricao: true, valorCentavos: true, proximaData: true },
      orderBy: { proximaData: "asc" },
      take: 8,
    }),
    prisma.captura.count({ where: { larId, status: "PENDENTE" } }),
  ])

  const porCategoria = new Map<string, number>()
  for (const gasto of gastos) {
    const nome = gasto.categoria?.nome ?? "Sem categoria"
    porCategoria.set(nome, (porCategoria.get(nome) ?? 0) + gasto.valorCentavos)
  }
  return {
    gastoCentavos: gastos.reduce((soma, gasto) => soma + gasto.valorCentavos, 0),
    gastoSemanaAnteriorCentavos: anteriores._sum.valorCentavos ?? 0,
    categorias: [...porCategoria.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([nome, centavos]) => ({ nome: escapar(nome), centavos })),
    vencimentos: fixas.map((conta) => ({
      descricao: escapar(conta.descricao),
      centavos: conta.valorCentavos,
      dia: conta.proximaData.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" }),
    })),
    esperandoConferir,
  }
}

/** Domingo em São Paulo: o cron roda às 20h de lá, uma vez por dia. */
export function ehDiaDoResumo(agora: Date): boolean {
  return new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", weekday: "short" }).format(agora) === "Sun"
}

/** Manda o resumo a cada conversa do Telegram ligada. Devolve quantos saíram. */
export async function enviarResumosDaSemana(agora: Date): Promise<number> {
  if (!telegramDisponivel() || !ehDiaDoResumo(agora)) return 0
  const chaves = await prisma.chaveCaptura.findMany({
    where: { origem: "TELEGRAM", ativa: true, chatId: { not: null } },
    select: { larId: true, chatId: true },
  })
  let enviados = 0
  const jaFoi = new Set<string>()
  for (const chave of chaves) {
    // Duas chaves da mesma conversa não viram dois resumos.
    const marca = `${chave.larId}:${chave.chatId}`
    if (jaFoi.has(marca)) continue
    jaFoi.add(marca)
    try {
      const texto = textoDoResumo(await dadosDaSemana(chave.larId, agora))
      if (!texto) continue
      await responder(chave.chatId as string, texto)
      enviados += 1
    } catch {
      // Um lar com problema não pode segurar o resumo dos outros.
    }
  }
  return enviados
}
