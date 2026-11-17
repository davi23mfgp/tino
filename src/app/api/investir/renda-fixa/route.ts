import { prisma } from "@/lib/prisma"
import { comSessao, ok } from "@/lib/api"
import { cdiDiarioDesde, valorPeloCdi, type MovimentoDaAplicacao } from "@/lib/renda-fixa"

export const dynamic = "force-dynamic"

const dia = (data: Date) => data.toISOString().slice(0, 10)

/**
 * Rendimento bruto de cada conta de investimento que rende pelo CDI.
 *
 * Os movimentos são os mesmos que formam o saldo (`saldos-das-contas.ts`): o
 * saldo inicial na data em que a conta foi criada, receita, despesa e as duas
 * pontas de transferência. Sem a série do Banco Central a rota devolve
 * `semFonte`, e a tela mostra só o aplicado: rendimento chutado não entra.
 */
export const GET = comSessao(async (sessao) => {
  const contas = await prisma.conta.findMany({
    where: { larId: sessao.larId, tipo: "INVESTIMENTO", arquivada: false, percentualCdiBps: { not: null } },
    select: { id: true, nome: true, percentualCdiBps: true, saldoInicialCentavos: true, criadoEm: true },
  })
  if (!contas.length) return ok({ contas: [], semFonte: false, fonte: null })

  const transacoes = await prisma.transacao.findMany({
    where: { larId: sessao.larId, pago: true, contaId: { in: contas.map((conta) => conta.id) } },
    select: { contaId: true, data: true, tipo: true, valorCentavos: true, transferenciaParId: true },
  })

  const movimentosPorConta = new Map<string, MovimentoDaAplicacao[]>()
  for (const conta of contas) {
    movimentosPorConta.set(conta.id, conta.saldoInicialCentavos ? [{ data: dia(conta.criadoEm), valorCentavos: conta.saldoInicialCentavos }] : [])
  }
  for (const linha of transacoes) {
    const entra = linha.tipo === "RECEITA" || (linha.tipo === "TRANSFERENCIA" && Boolean(linha.transferenciaParId))
    movimentosPorConta.get(linha.contaId)!.push({ data: dia(linha.data), valorCentavos: entra ? linha.valorCentavos : -linha.valorCentavos })
  }

  const primeiro = [...movimentosPorConta.values()].flat().map((m) => m.data).sort()[0]
  const taxas = primeiro ? await cdiDiarioDesde(primeiro) : []
  if (taxas === null) return ok({ contas: [], semFonte: true, fonte: null })

  return ok({
    semFonte: false,
    fonte: "Banco Central · CDI ao dia (SGS 12)",
    contas: contas.map((conta) => ({
      contaId: conta.id,
      nome: conta.nome,
      percentualCdiBps: conta.percentualCdiBps,
      ...valorPeloCdi(movimentosPorConta.get(conta.id) ?? [], conta.percentualCdiBps!, taxas),
    })),
  })
})
