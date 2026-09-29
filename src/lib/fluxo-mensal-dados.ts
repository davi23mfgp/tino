import { prisma } from "@/lib/prisma"
import { cicloDaFatura, faturaAberta } from "@/lib/cartoes"
import { competenciaMaisMeses, diasNoMes, partesCompetencia } from "@/lib/datas"
import type { DadosDoFluxo, FaturaDoFluxo } from "@/lib/fluxo-mensal"

/// Meses fechados que entram nas médias. Seis pegam a sazonalidade curta sem
/// arrastar o que a casa gastava há um ano.
const MESES_DE_HISTORICO = 6
/// Quantos dos últimos quatro meses uma entrada precisa aparecer para ser
/// tratada como "todo mês" — o salário que não foi cadastrado em Contas fixas.
const PRESENCA_MINIMA = 3

const FORA_DO_CAIXA = new Set(["CARTAO_CREDITO", "INVESTIMENTO"])

/// Média arredondada para o real: estimativa com centavos ("R$ 9.291,60")
/// finge uma precisão que a média não tem.
const emReais = (centavos: number) => Math.round(centavos / 100) * 100

/** "Salário  Rafael " e "salario rafael" são a mesma entrada. */
function normalizar(texto: string) {
  return texto.normalize("NFD").replace(new RegExp("[\\u0300-\\u036f]", "g"), "").toLowerCase().replace(/\s+/g, " ").trim()
}

/**
 * Levanta no banco o que `montarFluxoMensal` precisa. Toda a regra está lá; aqui
 * só se busca e se agrupa.
 */
export async function montarDadosDoFluxo(larId: string, hoje: string, meses = 12): Promise<DadosDoFluxo & { contasDoFluxo: { id: string; nome: string; saldoCentavos: number }[] }> {
  const atual = hoje.slice(0, 7)
  const historico = Array.from({ length: MESES_DE_HISTORICO }, (_, indice) => competenciaMaisMeses(atual, -(indice + 1)))
  const horizonte = Array.from({ length: meses + 1 }, (_, indice) => competenciaMaisMeses(atual, indice))

  const [lar, contas, movimentos, transferencias, recorrencias, transacoes, parcelas, dividas] = await Promise.all([
    prisma.lar.findUniqueOrThrow({ where: { id: larId }, select: { fluxoForaChaves: true } }),
    prisma.conta.findMany({ where: { larId, arquivada: false }, orderBy: { criadoEm: "asc" } }),
    // O saldo é derivado dos lançamentos pela mesma regra de /api/contas, para
    // as duas telas nunca mostrarem saldos diferentes.
    prisma.transacao.groupBy({ by: ["contaId", "tipo"], where: { larId, pago: true, tipo: { in: ["RECEITA", "DESPESA"] } }, _sum: { valorCentavos: true } }),
    prisma.transacao.findMany({ where: { larId, pago: true, tipo: "TRANSFERENCIA" }, select: { contaId: true, valorCentavos: true, transferenciaParId: true } }),
    prisma.recorrencia.findMany({ where: { larId, ativa: true }, include: { conta: { select: { tipo: true } } } }),
    prisma.transacao.findMany({
      where: { larId, tipo: { in: ["RECEITA", "DESPESA"] }, OR: [{ competencia: { in: [...historico, atual] } }, { competenciaFatura: { in: [...historico, ...horizonte] } }, { fatura: { competencia: { in: [...historico, ...horizonte] } } }] },
      select: { contaId: true, tipo: true, valorCentavos: true, descricao: true, data: true, competencia: true, competenciaFatura: true, recorrenciaId: true, dividaId: true, metaId: true, fatura: { select: { competencia: true } } },
    }),
    prisma.parcelaCompra.findMany({ where: { paga: false, competencia: { in: horizonte }, parcelamento: { larId, ativo: true } }, select: { competencia: true, valorCentavos: true, parcelamento: { select: { contaId: true } } } }),
    prisma.divida.findMany({ where: { larId, quitada: false }, select: { parcelaCentavos: true, diaVencimento: true } }),
  ])

  const tipoDaConta = new Map(contas.map((conta) => [conta.id, conta.tipo]))
  const noCaixa = (contaId: string) => !FORA_DO_CAIXA.has(tipoDaConta.get(contaId) ?? "")
  const somar = (contaId: string, tipo: string) => movimentos.find((m) => m.contaId === contaId && m.tipo === tipo)?._sum.valorCentavos ?? 0
  const contasDoFluxo = contas.filter((conta) => noCaixa(conta.id)).map((conta) => ({
    id: conta.id,
    nome: conta.nome,
    saldoCentavos: conta.saldoInicialCentavos + somar(conta.id, "RECEITA") - somar(conta.id, "DESPESA")
      + transferencias.filter((linha) => linha.contaId === conta.id).reduce((soma, linha) => soma + (linha.transferenciaParId ? linha.valorCentavos : -linha.valorCentavos), 0),
  }))

  // Recorrência lançada no cartão já está dentro da fatura: contá-la de novo
  // como conta fixa pagaria a Netflix duas vezes no mesmo mês.
  const recorrenciasDoCaixa = recorrencias.filter((linha) => linha.conta.tipo !== "CARTAO_CREDITO")
  const nomesFixos = new Set(recorrenciasDoCaixa.map((linha) => normalizar(linha.descricao)))
  // Pagamento de conta fixa lançado à mão, sem o vínculo com a recorrência,
  // também é a conta fixa: sai da média pelo nome, senão contaria duas vezes.
  const ehFixa = (t: { recorrenciaId: string | null; descricao: string }) => Boolean(t.recorrenciaId) || nomesFixos.has(normalizar(t.descricao))

  const doCaixa = transacoes.filter((t) => noCaixa(t.contaId))
  const mesesComDados = historico.filter((mes) => doCaixa.some((t) => t.competencia === mes))
  const divisor = Math.max(1, mesesComDados.length)

  // ── Entradas que não são conta fixa ───────────────────────
  const entradasSoltas = doCaixa.filter((t) => t.tipo === "RECEITA" && !ehFixa(t))
  const ultimosQuatro = historico.slice(0, 4)
  const porNome = new Map<string, typeof entradasSoltas>()
  for (const t of entradasSoltas) porNome.set(normalizar(t.descricao), [...(porNome.get(normalizar(t.descricao)) ?? []), t])
  const detectadas = [...porNome.entries()]
    .map(([chave, lista]) => ({ chave, lista, presenca: ultimosQuatro.filter((mes) => lista.some((t) => t.competencia === mes)).length }))
    .filter((linha) => linha.presenca >= PRESENCA_MINIMA)
  const chavesDetectadas = new Set(detectadas.map((linha) => linha.chave))
  const entradasDetectadas = detectadas.map(({ chave, lista }) => {
    const doHistorico = lista.filter((t) => historico.includes(t.competencia))
    const mesesDela = new Set(doHistorico.map((t) => t.competencia)).size || 1
    const recente = [...lista].sort((a, b) => b.data.getTime() - a.data.getTime())[0]
    return {
      chave,
      descricao: recente.descricao,
      valorCentavos: emReais(doHistorico.reduce((soma, t) => soma + t.valorCentavos, 0) / mesesDela),
      dia: recente.data.getUTCDate(),
      jaRecebidaNoMes: lista.some((t) => t.competencia === atual),
    }
  })
  const outras = entradasSoltas.filter((t) => !chavesDetectadas.has(normalizar(t.descricao)))
  const somaEm = (lista: { valorCentavos: number; competencia: string }[], meses: string[]) => lista.filter((t) => meses.includes(t.competencia)).reduce((soma, t) => soma + t.valorCentavos, 0)

  // ── Gasto do dia a dia fora do cartão ─────────────────────
  // Sem conta fixa, dívida ou aporte de meta: cada um desses entra no fluxo
  // pela própria linha.
  const variaveis = doCaixa.filter((t) => t.tipo === "DESPESA" && !ehFixa(t) && !t.dividaId && !t.metaId)

  // ── Faturas ───────────────────────────────────────────────
  const competenciaDaCompra = (t: (typeof transacoes)[number]) => t.fatura?.competencia ?? t.competenciaFatura ?? t.competencia
  const faturas: FaturaDoFluxo[] = []
  for (const cartao of contas.filter((conta) => conta.tipo === "CARTAO_CREDITO")) {
    const compras = transacoes.filter((t) => t.contaId === cartao.id)
    const totalDa = (competencia: string) => compras.filter((t) => competenciaDaCompra(t) === competencia).reduce((soma, t) => soma + (t.tipo === "DESPESA" ? t.valorCentavos : -t.valorCentavos), 0)
    const aberta = faturaAberta(cartao, hoje)
    const fechadas = historico.filter((mes) => mes < aberta && compras.some((t) => competenciaDaCompra(t) === mes))
    const media = fechadas.length ? emReais(fechadas.reduce((soma, mes) => soma + totalDa(mes), 0) / fechadas.length) : 0
    for (const competencia of horizonte) {
      const ciclo = cicloDaFatura(cartao, competencia)
      const { ano, mes } = partesCompetencia(competencia)
      faturas.push({
        cartaoId: cartao.id,
        cartao: cartao.nome.replace(/^Cart[aã]o\s+/i, "").replace(/\s*\(.*\)\s*$/, ""),
        competencia,
        venceEm: ciclo?.venceEm ?? `${competencia}-${String(diasNoMes(ano, mes)).padStart(2, "0")}`,
        semVencimento: !ciclo,
        fechada: ciclo ? hoje > ciclo.fechaEm : competencia < aberta,
        comprasConhecidasCentavos: Math.max(0, totalDa(competencia)),
        parcelasCentavos: parcelas.filter((p) => p.parcelamento.contaId === cartao.id && p.competencia === competencia).reduce((soma, p) => soma + p.valorCentavos, 0),
        mediaComprasCentavos: media,
      })
    }
  }

  return {
    hoje,
    meses,
    fora: lar.fluxoForaChaves,
    contas: contasDoFluxo,
    contasDoFluxo,
    recorrencias: recorrenciasDoCaixa.map((linha) => ({
      id: linha.id, descricao: linha.descricao, tipo: linha.tipo === "RECEITA" ? "RECEITA" as const : "DESPESA" as const,
      valorCentavos: linha.valorCentavos, periodicidade: linha.periodicidade, proximaData: linha.proximaData.toISOString().slice(0, 10),
    })),
    entradasDetectadas,
    outrasEntradasMediaCentavos: emReais(somaEm(outras, mesesComDados) / divisor),
    outrasEntradasNoMesCentavos: somaEm(outras, [atual]),
    gastoVariavelMedioCentavos: emReais(somaEm(variaveis, mesesComDados) / divisor),
    gastoVariavelNoMesCentavos: somaEm(variaveis, [atual]),
    faturas,
    dividas: dividas.map((divida) => ({ centavos: divida.parcelaCentavos, dia: divida.diaVencimento })),
    dividasPagasNoMesCentavos: doCaixa.filter((t) => t.tipo === "DESPESA" && t.dividaId && t.competencia === atual).reduce((soma, t) => soma + t.valorCentavos, 0),
  }
}
