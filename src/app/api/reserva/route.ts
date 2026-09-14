import { prisma } from "@/lib/prisma"
import { comSessao, corpo, ok, ErroDeUso } from "@/lib/api"
import { alvoEmCentavos } from "@/lib/tino/reserva"

export const dynamic = "force-dynamic"

/**
 * Define quantos meses de custo essencial a reserva deste lar deve cobrir.
 *
 * Grava o número no lar (é dele que o painel e os alertas tiram o alvo) e
 * ajusta a meta de reserva já existente, para as duas telas não mostrarem
 * alvos diferentes. Nenhum aporte é criado: mudar o alvo não move dinheiro.
 */
export const PUT = comSessao(async (sessao, requisicao) => {
  const dados = await corpo<{ meses: number; custoEssencialCentavos?: number }>(requisicao)
  if (!Number.isInteger(dados?.meses) || dados.meses < 1 || dados.meses > 24) {
    throw new ErroDeUso("Informe entre 1 e 24 meses de reserva.")
  }

  await prisma.lar.update({ where: { id: sessao.larId }, data: { mesesReserva: dados.meses } })

  if (dados.custoEssencialCentavos && dados.custoEssencialCentavos > 0) {
    const meta = await prisma.meta.findFirst({
      where: { larId: sessao.larId, tipo: "RESERVA_EMERGENCIA", status: { in: ["ATIVA", "PAUSADA"] } },
      orderBy: { criadoEm: "asc" },
    })
    if (meta) {
      await prisma.meta.update({
        where: { id: meta.id },
        data: { alvoCentavos: alvoEmCentavos(dados.custoEssencialCentavos, dados.meses) },
      })
    }
  }

  return ok({ meses: dados.meses })
})
