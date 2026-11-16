import { prisma } from "@/lib/prisma"
import { empurrar } from "@/lib/push"
import { atualizarAlertas } from "@/lib/tino/alertas"

/**
 * Leva os avisos para fora do app, por notificação.
 *
 * Até aqui o aviso só existia para quem abria o Tino: quem mais precisa do
 * "a fatura fecha em 3 dias" é justamente quem não abriu. Sai no máximo
 * `LIMITE_POR_DIA` por lar, do mais grave para o menos, e cada aviso sai uma
 * vez só (`avisadoEm`).
 *
 * A notificação leva só o título: o texto tem valor em reais, e valor na tela
 * de bloqueio é problema de quem perde o celular (mesma regra de `push.ts`).
 */
export const LIMITE_POR_DIA = 2
const PESO = { CRITICO: 0, ATENCAO: 1, INFO: 2 } as const
/// Dos avisos informativos, só os de calendário valem uma notificação.
const INFO_QUE_SAI = ["fatura_fecha", "fatura_vence", "das_vence", "parcela_acaba", "fixa_termina", "vencimento_proximo"]

export interface AvisoPendente { id: string; tipo: string; severidade: keyof typeof PESO; titulo: string; acaoRota: string | null; criadoEm: Date }

/**
 * `desligados`: avisos que a pessoa desligou em Configurações. Desligar só
 * impedia aviso NOVO; o que já estava na fila saía por notificação mesmo
 * desligado (achado de 16/11/2026).
 */
export function avisosParaEntregar(pendentes: AvisoPendente[], limite = LIMITE_POR_DIA, desligados: ReadonlySet<string> = new Set()): AvisoPendente[] {
  return pendentes
    .filter((aviso) => !desligados.has(aviso.tipo))
    .filter((aviso) => aviso.severidade !== "INFO" || INFO_QUE_SAI.includes(aviso.tipo))
    .sort((a, b) => PESO[a.severidade] - PESO[b.severidade] || b.criadoEm.getTime() - a.criadoEm.getTime())
    .slice(0, limite)
}

export async function entregarAvisosDoLar(larId: string): Promise<number> {
  await atualizarAlertas(larId)
  const [pendentes, inscricoes] = await Promise.all([
    prisma.alerta.findMany({ where: { larId, avisadoEm: null, dispensadoEm: null, lido: false }, select: { id: true, tipo: true, severidade: true, titulo: true, acaoRota: true, criadoEm: true } }),
    prisma.inscricaoPush.findMany({ where: { usuario: { larId } } }),
  ])
  if (inscricoes.length === 0) return 0
  let entregues = 0
  const desligados = new Set((await prisma.vigiaConfig.findMany({ where: { larId, ativo: false }, select: { tipo: true } })).map((linha) => linha.tipo))
  for (const aviso of avisosParaEntregar(pendentes, LIMITE_POR_DIA, desligados)) {
    let chegou = false
    for (const inscricao of inscricoes) {
      chegou = (await empurrar(inscricao, { tipo: "aviso", id: aviso.id, titulo: aviso.titulo, rota: aviso.acaoRota ?? "/painel" }).catch(() => false)) || chegou
    }
    // Só marca o que chegou a algum aparelho: o que falhou tenta de novo amanhã.
    if (chegou) { await prisma.alerta.update({ where: { id: aviso.id }, data: { avisadoEm: new Date() } }); entregues += 1 }
  }
  return entregues
}
