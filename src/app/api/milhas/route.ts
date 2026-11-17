import { prisma } from "@/lib/prisma"
import { comSessao, corpo, ok, ErroDeUso } from "@/lib/api"
import { validar, z } from "@/lib/validar"
import { custoPorMilheiroCentavos, saldoDesatualizado } from "@/lib/milhas"

export const dynamic = "force-dynamic"

/** Saldo de milhas por programa, informado pela pessoa. */
export const GET = comSessao(async (sessao) => {
  const hoje = new Date()
  const saldos = await prisma.saldoMilhas.findMany({ where: { larId: sessao.larId }, orderBy: { programa: "asc" } })
  return ok(saldos.map((saldo) => ({
    ...saldo,
    custoPorMilheiroCentavos: custoPorMilheiroCentavos(saldo.pontos, saldo.custoCentavos),
    desatualizado: saldoDesatualizado(saldo.atualizadoEm, hoje),
  })))
})

const SALDO = z.object({
  programa: z.string().trim().min(1).max(40),
  pontos: z.number().int().min(0).max(2_000_000_000),
  pontosQueVencem: z.number().int().min(1).max(2_000_000_000).nullable().optional(),
  venceEm: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  custoCentavos: z.number().int().min(1).max(2_000_000_000).nullable().optional(),
}).strict()

/** Um saldo por programa: informar de novo atualiza, não soma. */
export const POST = comSessao(async (sessao, requisicao) => {
  const dados = validar(SALDO, await corpo(requisicao))
  // Vencimento e quantidade andam juntos: um sem o outro não gera aviso certo.
  if (Boolean(dados.venceEm) !== Boolean(dados.pontosQueVencem)) throw new ErroDeUso("Informe quantos pontos vencem e em que dia.")
  if ((dados.pontosQueVencem ?? 0) > dados.pontos) throw new ErroDeUso("Os pontos que vencem não podem passar do saldo.")
  const venceEm = dados.venceEm ? new Date(`${dados.venceEm}T00:00:00Z`) : null
  if (venceEm && Number.isNaN(venceEm.getTime())) throw new ErroDeUso("Data inválida.")

  const campos = { pontos: dados.pontos, pontosQueVencem: dados.pontosQueVencem ?? null, venceEm, custoCentavos: dados.custoCentavos ?? null }
  const saldo = await prisma.saldoMilhas.upsert({
    where: { larId_programa: { larId: sessao.larId, programa: dados.programa } },
    create: { larId: sessao.larId, programa: dados.programa, ...campos },
    update: campos,
  })
  return ok(saldo, 201)
})

export const DELETE = comSessao(async (sessao, requisicao) => {
  const id = new URL(requisicao.url).searchParams.get("id") ?? ""
  const apagados = await prisma.saldoMilhas.deleteMany({ where: { id, larId: sessao.larId } })
  if (!apagados.count) throw new ErroDeUso("Saldo não encontrado.", 404)
  return ok({ ok: true })
})
