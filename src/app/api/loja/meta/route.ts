import { prisma } from "@/lib/prisma"
import { comSessao, corpo, ErroDeUso, ok } from "@/lib/api"
import { lojaDoLar } from "@/lib/loja/dados"

/** Uma meta mensal por loja; não reaproveita as metas da conta pessoal. */
export const PUT = comSessao(async (sessao, requisicao) => {
  if (sessao.papel === "FUNCIONARIO_LOJA") throw new ErroDeUso("Só o titular define a meta da loja.", 403)
  const dados = await corpo<{ competencia: string; valorCentavos: number }>(requisicao)
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(dados.competencia ?? "")) throw new ErroDeUso("Escolha um mês válido.")
  if (!Number.isInteger(dados.valorCentavos) || dados.valorCentavos <= 0 || dados.valorCentavos > 2_000_000_000) throw new ErroDeUso("Informe uma meta maior que zero.")
  const loja = await lojaDoLar(sessao.larId)
  const meta = await prisma.metaDaLoja.upsert({ where: { lojaId_competencia: { lojaId: loja.id, competencia: dados.competencia } }, update: { valorCentavos: dados.valorCentavos }, create: { lojaId: loja.id, competencia: dados.competencia, valorCentavos: dados.valorCentavos } })
  return ok(meta)
})

export const DELETE = comSessao(async (sessao, requisicao) => {
  if (sessao.papel === "FUNCIONARIO_LOJA") throw new ErroDeUso("Só o titular remove a meta da loja.", 403)
  const competencia = new URL(requisicao.url).searchParams.get("competencia") ?? ""
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(competencia)) throw new ErroDeUso("Escolha um mês válido.")
  const loja = await lojaDoLar(sessao.larId)
  await prisma.metaDaLoja.deleteMany({ where: { lojaId: loja.id, competencia } })
  return ok({ removida: true })
})
