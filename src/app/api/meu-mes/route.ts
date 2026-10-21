import { prisma } from "@/lib/prisma"
import { comSessao, ok } from "@/lib/api"
import { competenciaAtual, janelaDoMes } from "@/lib/datas"
import { competenciaDosLimites } from "@/lib/orcamento-herdado"
import { resumoMeuMes } from "@/lib/meu-mes"

export const dynamic = "force-dynamic"

/**
 * Tudo da planilha Meu mês numa ida: as contas fixas (com o que já foi pago
 * neste mês), os limites do dia a dia, a renda e a conta padrão para a linha
 * nova. A edição usa as rotas de sempre (recorrências, orçamento, categorias),
 * para a regra de cada uma continuar num lugar só.
 */
export const GET = comSessao(async (sessao) => {
  const competencia = competenciaAtual()
  const lar = await prisma.lar.findUniqueOrThrow({ where: { id: sessao.larId }, select: { diaInicioMes: true } })
  const janela = janelaDoMes(competencia, lar.diaInicioMes)

  const meses = await prisma.orcamento.findMany({ where: { larId: sessao.larId, competencia: { lte: competencia } }, distinct: ["competencia"], select: { competencia: true } })
  const base = competenciaDosLimites(meses.map((linha) => linha.competencia), competencia)

  const [recorrencias, pagas, orcamentos, gastos, categorias, membros, conta] = await Promise.all([
    prisma.recorrencia.findMany({ where: { larId: sessao.larId, ativa: true }, orderBy: [{ diaVencimento: "asc" }, { descricao: "asc" }] }),
    prisma.transacao.findMany({ where: { larId: sessao.larId, recorrenciaId: { not: null }, data: { gte: janela.de, lte: janela.ate } }, select: { recorrenciaId: true, valorCentavos: true } }),
    base ? prisma.orcamento.findMany({ where: { larId: sessao.larId, competencia: base }, include: { categoria: { select: { nome: true } } } }) : Promise.resolve([]),
    prisma.transacao.groupBy({ by: ["categoriaId"], where: { larId: sessao.larId, tipo: "DESPESA", data: { gte: janela.de, lte: janela.ate } }, _sum: { valorCentavos: true } }),
    prisma.categoria.findMany({ where: { larId: sessao.larId, tipo: "DESPESA" }, select: { id: true, nome: true }, orderBy: { nome: "asc" } }),
    prisma.membro.findMany({ where: { larId: sessao.larId }, select: { rendaMensalCentavos: true } }),
    prisma.conta.findFirst({ where: { larId: sessao.larId, arquivada: false, tipo: { notIn: ["CARTAO_CREDITO", "PJ_MEI", "INVESTIMENTO"] } }, orderBy: { criadoEm: "asc" }, select: { id: true } }),
  ])

  // Só as mensais entram no total do mês; a anual (seguro) aparece, mas dividida
  // por 12 enganaria quem paga de uma vez.
  // Renda: as entradas fixas que a pessoa cadastrou valem mais que o número
  // digitado no cadastro, que podia aparecer aqui sem ela saber de onde vinha.
  // O que já terminou (a ajuda até dezembro, em janeiro) sai da conta do mês.
  const vale = (r: { fimEm: Date | null }) => !r.fimEm || r.fimEm >= janela.de
  const entradas = recorrencias.filter((r) => r.tipo === "RECEITA" && r.periodicidade === "MENSAL" && vale(r))
  const despesas = recorrencias.filter((r) => r.tipo === "DESPESA" && vale(r))
  const fixas = despesas.map((r) => {
    const paga = pagas.filter((t) => t.recorrenciaId === r.id)
    return {
      id: r.id, descricao: r.descricao, valorCentavos: r.valorCentavos, diaVencimento: r.diaVencimento, periodicidade: r.periodicidade,
      contaId: r.contaId, categoriaId: r.categoriaId, valorVariavel: r.valorVariavel,
      pagoCentavos: paga.length ? paga.reduce((s, t) => s + t.valorCentavos, 0) : null,
    }
  })
  const deContaFixa = new Set(despesas.map((r) => r.categoriaId).filter((id): id is string => Boolean(id)))
  const gastoDe = (id: string) => gastos.find((g) => g.categoriaId === id)?._sum.valorCentavos ?? 0
  const variaveis = orcamentos
    .filter((o) => !deContaFixa.has(o.categoriaId))
    .map((o) => ({ categoriaId: o.categoriaId, nome: o.categoria.nome, limiteCentavos: o.limiteCentavos, gastoCentavos: gastoDe(o.categoriaId) }))
    .sort((a, b) => b.limiteCentavos - a.limiteCentavos)

  const rendaEntradas = entradas.reduce((s, r) => s + r.valorCentavos, 0)
  const rendaCadastro = membros.reduce((s, m) => s + m.rendaMensalCentavos, 0)
  const renda = rendaEntradas || rendaCadastro
  const rendaOrigem = rendaEntradas ? "entradas" : rendaCadastro ? "cadastro" : null
  return ok({
    competencia,
    rendaOrigem,
    entradas: entradas.map((r) => ({ id: r.id, descricao: r.descricao, valorCentavos: r.valorCentavos, diaVencimento: r.diaVencimento, fimEm: r.fimEm })),
    fixas,
    variaveis,
    resumo: resumoMeuMes(fixas.filter((f) => f.periodicidade === "MENSAL"), variaveis, renda),
    categorias: categorias.filter((c) => !deContaFixa.has(c.id) && !variaveis.some((v) => v.categoriaId === c.id)),
    contaPadraoId: conta?.id ?? null,
  })
})
