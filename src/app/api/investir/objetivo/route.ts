import { prisma } from "@/lib/prisma"
import { comSessao, corpo, ok, ErroDeUso } from "@/lib/api"

/**
 * O quanto o lar decidiu separar por mês para investir.
 *
 * Fica gravado, e não no estado da tela, porque é a decisão da pessoa — não
 * uma simulação. Quem abre a tela na semana seguinte precisa ver o objetivo
 * que assumiu, e não um campo vazio pedindo para decidir de novo.
 */
export const GET = comSessao(async (sessao) => {
  const objetivo = await prisma.objetivoDeAporte.findUnique({ where: { larId: sessao.larId } })
  return ok(objetivo ?? null)
})

export const PUT = comSessao(async (sessao, requisicao) => {
  const dados = await corpo<{ valorMensalCentavos: number; prazoAnos?: number }>(requisicao)

  const valor = Number(dados?.valorMensalCentavos)
  if (!Number.isSafeInteger(valor) || valor < 0 || valor > 2_147_483_647) throw new ErroDeUso("Informe um valor válido.")

  const prazo = dados.prazoAnos ?? 10
  if (!Number.isSafeInteger(prazo) || prazo < 1 || prazo > 50) throw new ErroDeUso("Prazo entre 1 e 50 anos.")

  return ok(
    await prisma.objetivoDeAporte.upsert({
      where: { larId: sessao.larId },
      create: { larId: sessao.larId, valorMensalCentavos: valor, prazoAnos: prazo },
      update: { valorMensalCentavos: valor, prazoAnos: prazo },
    }),
  )
})

/** Desistir do objetivo é uma decisão como qualquer outra, e precisa de saída. */
export const DELETE = comSessao(async (sessao) => {
  await prisma.objetivoDeAporte.deleteMany({ where: { larId: sessao.larId } })
  return ok({ removido: true })
})
