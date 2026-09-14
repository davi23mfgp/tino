import { prisma } from "@/lib/prisma"
import { comSessao, ok, ErroDeUso } from "@/lib/api"
import { janelaDoMes } from "@/lib/datas"

/**
 * Quais dias do mês têm lançamento, e quanto.
 *
 * A faixa de calendário do extrato precisa marcar o mês inteiro, e a lista de
 * lançamentos chega paginada de 25 em 25 — marcar os pontos a partir do que já
 * foi carregado deixaria metade do mês sem ponto até a pessoa rolar. Uma
 * consulta agregada resolve, e é barata: agrupa por data, não traz linha.
 */
export const GET = comSessao(async (sessao, requisicao) => {
  const competencia = new URL(requisicao.url).searchParams.get("competencia")
  if (!competencia || !/^\d{4}-(0[1-9]|1[0-2])$/.test(competencia)) throw new ErroDeUso("Informe o mês.")

  const lar = await prisma.lar.findUniqueOrThrow({
    where: { id: sessao.larId },
    select: { diaInicioMes: true },
  })
  const janela = janelaDoMes(competencia, lar.diaInicioMes)

  const linhas = await prisma.$queryRaw<{ dia: Date; entradas: bigint; saidas: bigint; saldo: bigint }[]>`
    SELECT
      date_trunc('day', "data") AS dia,
      COUNT(*) FILTER (WHERE "tipo" = 'RECEITA') AS entradas,
      COUNT(*) FILTER (WHERE "tipo" = 'DESPESA') AS saidas,
      COALESCE(SUM(CASE WHEN "tipo" = 'RECEITA' THEN "valorCentavos"
                        WHEN "tipo" = 'DESPESA' THEN -"valorCentavos"
                        ELSE 0 END), 0) AS saldo
    FROM "Transacao"
    WHERE "larId" = ${sessao.larId} AND "data" >= ${janela.de} AND "data" <= ${janela.ate}
    GROUP BY 1
    ORDER BY 1
  `

  return ok(
    linhas.map((linha) => ({
      dia: linha.dia.toISOString().slice(0, 10),
      lancamentos: Number(linha.entradas) + Number(linha.saidas),
      saldoCentavos: Number(linha.saldo),
    })),
  )
})
