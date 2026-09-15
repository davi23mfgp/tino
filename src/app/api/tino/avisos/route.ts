import { comSessao, corpo, ok, ErroDeUso } from "@/lib/api"
import { prisma } from "@/lib/prisma"
import { avisar, escolherAvisos } from "@/lib/tino/avisar"

export const dynamic = "force-dynamic"

const CANAIS = ["NENHUM", "WHATSAPP", "TELEGRAM"] as const
const SEVERIDADES = ["INFO", "ATENCAO", "CRITICO"] as const

/**
 * Como o Tino pode falar primeiro — e o ensaio do que ele diria.
 *
 * O GET nunca manda nada: devolve a configuração e a lista do que sairia
 * agora, com o motivo quando não sai. É assim que dá para conferir o
 * comportamento antes de ligar uma torneira que cobra por mensagem.
 */
export const GET = comSessao(async (sessao) => {
  const config = await prisma.avisoProativo.findUnique({ where: { larId: sessao.larId } })

  const agora = new Date()
  const inicioDoDia = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate())

  const [jaMandados, pendentes] = await Promise.all([
    prisma.alerta.count({ where: { larId: sessao.larId, avisadoEm: { gte: inicioDoDia } } }),
    prisma.alerta.findMany({
      where: { larId: sessao.larId, avisadoEm: null, dispensadoEm: null },
      orderBy: [{ severidade: "desc" }, { criadoEm: "asc" }],
      take: 50,
      select: { id: true, tipo: true, titulo: true, texto: true, severidade: true },
    }),
  ])

  const ensaio = escolherAvisos({
    canal: config?.canal ?? "NENHUM",
    limiteDiario: config?.limiteDiario ?? 3,
    horaInicio: config?.horaInicio ?? 9,
    horaFim: config?.horaFim ?? 21,
    severidadeMinima: config?.severidadeMinima ?? "ATENCAO",
    jaMandados,
    pendentes,
    agora,
  })

  return ok({ config, jaMandados, ensaio })
})

/** Escolhe se, quando e por onde o Tino pode falar primeiro. */
export const PUT = comSessao(async (sessao, requisicao) => {
  const dados = await corpo<{
    canal?: string
    limiteDiario?: number
    horaInicio?: number
    horaFim?: number
    severidadeMinima?: string
  }>(requisicao)

  const canal = dados.canal ?? "NENHUM"
  if (!CANAIS.includes(canal as never)) throw new ErroDeUso("Canal desconhecido.")

  const severidadeMinima = dados.severidadeMinima ?? "ATENCAO"
  if (!SEVERIDADES.includes(severidadeMinima as never)) throw new ErroDeUso("Severidade desconhecida.")

  const hora = (valor: number | undefined, padrao: number) => {
    const numero = Number.isFinite(valor) ? Math.trunc(valor as number) : padrao
    if (numero < 0 || numero > 23) throw new ErroDeUso("A hora precisa estar entre 0 e 23.")
    return numero
  }

  // Teto com limite duro: quem digita 500 aqui não está pedindo um assessor,
  // está pedindo uma conta alta e uma pessoa irritada.
  const limiteDiario = Math.min(Math.max(Math.trunc(dados.limiteDiario ?? 3), 0), 10)

  const valores = {
    canal: canal as never,
    limiteDiario,
    horaInicio: hora(dados.horaInicio, 9),
    horaFim: hora(dados.horaFim, 21),
    severidadeMinima: severidadeMinima as never,
  }

  return ok(
    await prisma.avisoProativo.upsert({
      where: { larId: sessao.larId },
      create: { larId: sessao.larId, ...valores },
      update: valores,
    }),
  )
})

/**
 * Manda agora o que estiver pendente.
 *
 * Existe para o próprio app chamar quando o painel for aberto — e para dar um
 * jeito de provar o caminho inteiro sem esperar uma agenda. Mesmo aqui, todos
 * os freios valem: sem canal escolhido, fora de hora ou sem modelo aprovado
 * pela Meta, devolve o motivo e não manda nada.
 */
export const POST = comSessao(async (sessao) => ok(await avisar(sessao.larId)))
