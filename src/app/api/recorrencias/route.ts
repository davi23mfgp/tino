import { prisma } from "@/lib/prisma"
import { comSessao, corpo, ok } from "@/lib/api"
import { campo, doLar, validar, z } from "@/lib/validar"
import { competenciaDe, diaSeguro } from "@/lib/datas"

const PASSO_MESES: Record<string, number> = {
  MENSAL: 1,
  BIMESTRAL: 2,
  TRIMESTRAL: 3,
  SEMESTRAL: 6,
  ANUAL: 12,
}

export const GET = comSessao(async (sessao) => {
  const recorrencias = await prisma.recorrencia.findMany({
    where: { larId: sessao.larId },
    include: { categoria: true, conta: { select: { nome: true } } },
    orderBy: [{ ativa: "desc" }, { proximaData: "asc" }],
  })

  const ativas = recorrencias.filter((recorrencia) => recorrencia.ativa)
  return ok({
    recorrencias,
    // "Quanto sai todo mês antes de eu gastar qualquer coisa" — o número que
    // define a reserva de emergência e o piso da projeção.
    custoFixoMensalCentavos: ativas
      .filter((r) => r.tipo === "DESPESA" && r.periodicidade === "MENSAL")
      .reduce((soma, r) => soma + r.valorCentavos, 0),
    receitaFixaMensalCentavos: ativas
      .filter((r) => r.tipo === "RECEITA" && r.periodicidade === "MENSAL")
      .reduce((soma, r) => soma + r.valorCentavos, 0),
  })
})

export const POST = comSessao(async (sessao, requisicao) => {
  const dados = validar(
    z.object({
      descricao: campo.textoObrigatorio(120),
      valorCentavos: campo.centavos(),
      tipo: z.enum(["RECEITA", "DESPESA"]).default("DESPESA"),
      periodicidade: z.enum(["MENSAL", "BIMESTRAL", "TRIMESTRAL", "SEMESTRAL", "ANUAL"]).default("MENSAL"),
      diaVencimento: campo.dia(),
      contaId: campo.id(),
      categoriaId: campo.id().nullish(),
      valorVariavel: z.boolean().optional(),
      fimEm: campo.data().nullish(),
    }),
    await corpo(requisicao),
  )
  await doLar(sessao.larId, { conta: dados.contaId, categoria: dados.categoriaId })

  const dia = dados.diaVencimento
  const hoje = new Date()

  // Se o dia do mês já passou, a próxima ocorrência é no mês que vem — senão a
  // projeção começaria cobrando uma conta que já foi paga.
  const jaPassou = hoje.getUTCDate() > dia
  const proximaData = diaSeguro(
    hoje.getUTCFullYear(),
    hoje.getUTCMonth() + 1 + (jaPassou ? 1 : 0),
    dia,
  )

  const recorrencia = await prisma.recorrencia.create({
    data: {
      larId: sessao.larId,
      descricao: dados.descricao,
      valorCentavos: dados.valorCentavos,
      tipo: dados.tipo,
      periodicidade: dados.periodicidade,
      diaVencimento: dia,
      proximaData,
      contaId: dados.contaId,
      categoriaId: dados.categoriaId ?? null,
      valorVariavel: dados.valorVariavel ?? false,
      fimEm: dados.fimEm ?? null,
    },
  })

  return ok(recorrencia, 201)
})

/**
 * Lança a ocorrência do período e avança a data. Idempotente por competência:
 * clicar duas vezes em "paguei" não gera duas contas de luz.
 */
export const PUT = comSessao(async (sessao, requisicao) => {
  const dados = await corpo<{ id: string; valorCentavos?: number; data?: string }>(requisicao)

  const recorrencia = await prisma.recorrencia.findFirst({ where: { id: dados.id, larId: sessao.larId } })
  if (!recorrencia) return ok({ erro: "Recorrência não encontrada." }, 404)

  const data = dados.data ? new Date(dados.data) : recorrencia.proximaData
  const competencia = competenciaDe(data)

  const jaLancado = await prisma.transacao.findFirst({
    where: { larId: sessao.larId, recorrenciaId: recorrencia.id, competencia },
    select: { id: true },
  })
  if (jaLancado) return ok({ jaLancado: true, transacaoId: jaLancado.id })

  const passo = PASSO_MESES[recorrencia.periodicidade] ?? 1
  const proxima = diaSeguro(
    data.getUTCFullYear(),
    data.getUTCMonth() + 1 + passo,
    recorrencia.diaVencimento,
  )

  const resultado = await prisma.$transaction(async (tx) => {
    const transacao = await tx.transacao.create({
      data: {
        larId: sessao.larId,
        contaId: recorrencia.contaId,
        categoriaId: recorrencia.categoriaId,
        data,
        descricao: recorrencia.descricao,
        valorCentavos: dados.valorCentavos ?? recorrencia.valorCentavos,
        tipo: recorrencia.tipo,
        competencia,
        origem: "RECORRENCIA",
        recorrenciaId: recorrencia.id,
      },
    })

    await tx.recorrencia.update({
      where: { id: recorrencia.id },
      data: {
        proximaData: proxima,
        // Conta de valor variável guarda o último valor: é a melhor estimativa
        // disponível para a projeção do mês seguinte.
        ...(recorrencia.valorVariavel && dados.valorCentavos ? { valorCentavos: dados.valorCentavos } : {}),
        ...(recorrencia.fimEm && proxima > recorrencia.fimEm ? { ativa: false } : {}),
      },
    })

    return transacao
  })

  return ok(resultado, 201)
})

export const DELETE = comSessao(async (sessao, requisicao) => {
  const id = new URL(requisicao.url).searchParams.get("id")
  if (!id) return ok({ erro: "Informe a recorrência." }, 400)

  // Os lançamentos já gerados continuam: são despesas que de fato aconteceram.
  await prisma.transacao.updateMany({ where: { recorrenciaId: id }, data: { recorrenciaId: null } })
  await prisma.recorrencia.deleteMany({ where: { id, larId: sessao.larId } })
  return ok({ removida: true })
})
