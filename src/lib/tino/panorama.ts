/**
 * Panorama — a foto financeira completa do lar num objeto só.
 *
 * É a fonte única de números do app: o painel, os alertas e o assistente leem
 * daqui. Ter um cálculo por tela é como o mesmo saldo aparece diferente em
 * dois lugares e o usuário perde a confiança no sistema inteiro.
 */

import { prisma } from "@/lib/prisma"
import { saldoDisponivel, patrimonio, aplicado } from "@/lib/saldo-disponivel"
import {
  competenciaAtual,
  competenciaMaisMeses,
  distanciaEmMeses,
  janelaDoMes,
  partesCompetencia,
  ultimasCompetencias,
} from "@/lib/datas"
import {
  avaliarMei,
  compararEstrategias,
  mesesDeFolga,
  projetarAposentadoria,
  projetarFluxo,
  projetarMeta,
  reservaIdeal,
  type DividaEntrada,
} from "@/lib/financeiro"

export interface Panorama {
  lar: {
    id: string
    nome: string
    tipo: string
    diaInicioMes: number
    estrategiaDivida: "AVALANCHE" | "BOLA_DE_NEVE" | "PROPORCIONAL"
    mesesReserva: number
  }
  competencia: string
  saldoTotalCentavos: number
  /// Tudo que a pessoa tem, menos a dívida do cartão — inclui o aplicado.
  patrimonioCentavos: number
  /// A parte que está em conta de investimento e não entra no caixa.
  aplicadoCentavos: number
  saldoPorConta: { id: string; nome: string; tipo: string; saldoCentavos: number; limiteCentavos: number | null }[]
  mes: {
    receitasCentavos: number
    despesasCentavos: number
    sobraCentavos: number
    taxaPoupancaBps: number
    despesasPorCategoria: {
      categoriaId: string | null
      nome: string
      grupo: string
      essencial: boolean
      totalCentavos: number
      /// Mesmo período do mês passado, para comparar em vez de só informar.
      anteriorCentavos: number
      /// Variação em pontos-base. null quando não havia gasto antes — nesse
      /// caso "aumentou 100%" seria uma leitura sem sentido.
      variacaoBps: number | null
    }[]
    despesasPorMembro: { membroId: string | null; nome: string; totalCentavos: number }[]
    /// Gasto de cada dia do mês, para o mapa de calor.
    gastosPorDia: { dia: number; diaDaSemana: number; totalCentavos: number }[]
    maiorGastoDoDia: { dia: number; totalCentavos: number } | null
    mediaDiariaCentavos: number
    aPagarCentavos: number
    naoCategorizadas: number
  }
  historico: { competencia: string; receitasCentavos: number; despesasCentavos: number; sobraCentavos: number }[]
  medias: {
    receitaCentavos: number
    despesaCentavos: number
    sobraCentavos: number
    custoFixoCentavos: number
    custoEssencialCentavos: number
    /// Soma do que os membros declararam ganhar. Usada como referência quando
    /// ainda não há receita lançada.
    rendaDeclaradaCentavos: number
  }
  orcamento: {
    competencia: string
    linhas: { categoriaId: string; nome: string; limiteCentavos: number; gastoCentavos: number; percentual: number; estourou: boolean }[]
    limiteTotalCentavos: number
    gastoTotalCentavos: number
  }
  metas: {
    id: string
    nome: string
    tipo: string
    alvoCentavos: number
    saldoCentavos: number
    percentual: number
    mesesRestantes: number | null
    aporteNecessarioCentavos: number
    aporteAtualCentavos: number
    noPrazo: boolean
    dataAlvo: Date | null
  }[]
  dividas: {
    lista: (DividaEntrada & { tipo: string; parcelasTotal: number | null; parcelasPagas: number; diaVencimento: number })[]
    totalCentavos: number
    parcelaMensalCentavos: number
    comprometimentoBps: number
    plano: ReturnType<typeof compararEstrategias> | null
  }
  reserva: {
    idealCentavos: number
    atualCentavos: number
    percentual: number
    mesesDeFolga: number
  }
  projecao: ReturnType<typeof projetarFluxo>
  aposentadoria: ReturnType<typeof projetarAposentadoria> | null
  mei: (ReturnType<typeof avaliarMei> & { dasEmAberto: string[]; proximoDasEm: Date | null }) | null
  recorrenciasProximas: { id: string; descricao: string; valorCentavos: number; tipo: string; proximaData: Date }[]
}

const bps = (parte: number, todo: number) => (todo <= 0 ? 0 : Math.round((parte / todo) * 10_000))

export async function montarPanorama(larId: string, competencia = competenciaAtual()): Promise<Panorama> {
  const lar = await prisma.lar.findUniqueOrThrow({
    where: { id: larId },
    include: { meiPerfil: true, membros: true },
  })

  const janela = janelaDoMes(competencia, lar.diaInicioMes)
  const historicoCompetencias = ultimasCompetencias(12, competencia)

  // Tudo que só depende do `larId` vai junto, numa rodada só. Cada `await`
  // solto é uma ida e volta ao banco, e num Postgres gerenciado longe da
  // função isso custa dezenas de milissegundos — a conta que fazia o painel
  // demorar não era SQL lento, era quantidade de viagens.
  const [
    contas,
    transacoesMes,
    transacoesHistorico,
    orcamentos,
    metas,
    dividas,
    recorrencias,
    meiCompetencias,
    movimentosPorConta,
    transferencias,
  ] =
    await Promise.all([
      prisma.conta.findMany({ where: { larId, arquivada: false } }),
      prisma.transacao.findMany({
        where: { larId, data: { gte: janela.de, lte: janela.ate } },
        include: { categoria: true, membro: true },
      }),
      prisma.transacao.findMany({
        where: { larId, competencia: { in: historicoCompetencias } },
        include: { categoria: true },
      }),
      prisma.orcamento.findMany({ where: { larId, competencia }, include: { categoria: true } }),
      prisma.meta.findMany({ where: { larId, status: "ATIVA" }, orderBy: { prioridade: "desc" } }),
      prisma.divida.findMany({ where: { larId, quitada: false } }),
      prisma.recorrencia.findMany({ where: { larId, ativa: true }, orderBy: { proximaData: "asc" } }),
      lar.meiPerfil ? prisma.meiCompetencia.findMany({ where: { larId } }) : Promise.resolve([]),

      // ── Saldos ────────────────────────────────────────────
      // Transferência nunca entra em receita ou despesa: as duas pontas se
      // anulam e contá-las inflaria receita e despesa no mesmo valor.
      prisma.transacao.groupBy({
        by: ["contaId", "tipo"],
        where: { larId, pago: true, tipo: { in: ["RECEITA", "DESPESA"] } },
        _sum: { valorCentavos: true },
      }),

      // Transferência não entra em receita nem em despesa — as duas pontas se
      // anulam no resultado do mês — mas move saldo entre contas. Sem contá-la
      // aqui, guardar dinheiro na poupança ou pagar a fatura do cartão não
      // mudava saldo nenhum, e a fatura ficava aberta para sempre.
      //
      // A direção vem do vínculo: a ponta de destino é a que aponta para a de
      // origem (`transferenciaParId`), como criado na rota de transações.
      prisma.transacao.findMany({
        where: { larId, pago: true, tipo: "TRANSFERENCIA" },
        select: { contaId: true, valorCentavos: true, transferenciaParId: true },
      }),
    ])

  const saldoPorConta = contas.map((conta) => {
    const entradas = movimentosPorConta.find((m) => m.contaId === conta.id && m.tipo === "RECEITA")?._sum.valorCentavos ?? 0
    const saidas = movimentosPorConta.find((m) => m.contaId === conta.id && m.tipo === "DESPESA")?._sum.valorCentavos ?? 0

    const movidoPorTransferencia = transferencias
      .filter((linha) => linha.contaId === conta.id)
      .reduce((soma, linha) => soma + (linha.transferenciaParId ? linha.valorCentavos : -linha.valorCentavos), 0)

    return {
      id: conta.id,
      nome: conta.nome,
      tipo: conta.tipo as string,
      saldoCentavos: conta.saldoInicialCentavos + entradas - saidas + movidoPorTransferencia,
      limiteCentavos: conta.limiteCentavos,
    }
  })

  // Cartão de crédito é dívida, e investimento não é dinheiro que está na
  // conta: os dois ficam fora do caixa. O que é aplicado continua contado no
  // patrimônio, logo abaixo — sai da pergunta "dá para pagar?", não do bolso
  // da pessoa. Ver `lib/saldo-disponivel.ts`.
  const saldoTotalCentavos = saldoDisponivel(saldoPorConta)
  const patrimonioCentavos = patrimonio(saldoPorConta)
  const aplicadoCentavos = aplicado(saldoPorConta)

  // ── Mês corrente ──────────────────────────────────────────
  const doMes = transacoesMes.filter((t) => t.tipo !== "TRANSFERENCIA")
  const receitasMes = doMes.filter((t) => t.tipo === "RECEITA").reduce((s, t) => s + t.valorCentavos, 0)
  const despesasMes = doMes.filter((t) => t.tipo === "DESPESA").reduce((s, t) => s + t.valorCentavos, 0)

  const porCategoria = new Map<string, { categoriaId: string | null; nome: string; grupo: string; essencial: boolean; totalCentavos: number }>()
  for (const transacao of doMes.filter((t) => t.tipo === "DESPESA")) {
    const chave = transacao.categoriaId ?? "sem-categoria"
    const atual = porCategoria.get(chave) ?? {
      categoriaId: transacao.categoriaId,
      nome: transacao.categoria?.nome ?? "Sem categoria",
      grupo: transacao.categoria?.grupo ?? "OUTROS",
      essencial: transacao.categoria?.essencial ?? false,
      totalCentavos: 0,
    }
    atual.totalCentavos += transacao.valorCentavos
    porCategoria.set(chave, atual)
  }

  // Mesmo mapa para o mês anterior: é o que permite dizer "gastou 39% menos em
  // supermercado" em vez de só mostrar o número do mês, que sozinho não diz se
  // a pessoa está melhorando ou piorando.
  const competenciaAnterior = competenciaMaisMeses(competencia, -1)
  const porCategoriaAnterior = new Map<string, number>()
  for (const transacao of transacoesHistorico) {
    if (transacao.competencia !== competenciaAnterior || transacao.tipo !== "DESPESA") continue
    const chave = transacao.categoriaId ?? "sem-categoria"
    porCategoriaAnterior.set(chave, (porCategoriaAnterior.get(chave) ?? 0) + transacao.valorCentavos)
  }

  const porMembro = new Map<string, { membroId: string | null; nome: string; totalCentavos: number }>()
  for (const transacao of doMes.filter((t) => t.tipo === "DESPESA")) {
    const chave = transacao.membroId ?? "compartilhado"
    const atual = porMembro.get(chave) ?? {
      membroId: transacao.membroId,
      nome: transacao.membro?.nome ?? "Compartilhado",
      totalCentavos: 0,
    }
    atual.totalCentavos += transacao.valorCentavos
    porMembro.set(chave, atual)
  }

  // ── Gasto por dia ─────────────────────────────────────────
  // Todos os dias do mês entram, inclusive os sem gasto: o mapa de calor
  // precisa da grade completa, e um dia zerado é informação (não gastou nada).
  const { ano: anoDoMes, mes: mesDoMes } = partesCompetencia(competencia)
  const totalDeDias = new Date(Date.UTC(anoDoMes, mesDoMes, 0)).getUTCDate()
  const porDia = new Map<number, number>()

  for (const transacao of doMes.filter((t) => t.tipo === "DESPESA")) {
    const diaDoMes = transacao.data.getUTCDate()
    porDia.set(diaDoMes, (porDia.get(diaDoMes) ?? 0) + transacao.valorCentavos)
  }

  const gastosPorDia = Array.from({ length: totalDeDias }, (_, indice) => {
    const numeroDoDia = indice + 1
    return {
      dia: numeroDoDia,
      diaDaSemana: new Date(Date.UTC(anoDoMes, mesDoMes - 1, numeroDoDia)).getUTCDay(),
      totalCentavos: porDia.get(numeroDoDia) ?? 0,
    }
  })

  // A média considera só os dias em que houve gasto: incluir os zerados diria
  // que a pessoa gasta menos por dia do que realmente gasta quando gasta.
  const diasComGasto = [...porDia.values()].filter((valor) => valor > 0).length

  // ── Histórico e médias ────────────────────────────────────
  const historico = historicoCompetencias.map((mes) => {
    const doPeriodo = transacoesHistorico.filter((t) => t.competencia === mes && t.tipo !== "TRANSFERENCIA")
    const receitas = doPeriodo.filter((t) => t.tipo === "RECEITA").reduce((s, t) => s + t.valorCentavos, 0)
    const despesas = doPeriodo.filter((t) => t.tipo === "DESPESA").reduce((s, t) => s + t.valorCentavos, 0)
    return { competencia: mes, receitasCentavos: receitas, despesasCentavos: despesas, sobraCentavos: receitas - despesas }
  })

  // Meses sem nenhum lançamento são lar recém-criado, não mês de gasto zero:
  // incluí-los na média puxaria a despesa média artificialmente para baixo.
  const mesesComDados = historico.filter((mes) => mes.receitasCentavos > 0 || mes.despesasCentavos > 0)
  const divisor = Math.max(1, mesesComDados.length)

  // Renda declarada pelos membros na conversa inicial. Vale como referência
  // enquanto não há salário lançado: sem ela, todo cálculo que divide pela renda
  // (comprometimento, plano de pagamento) trataria quem acabou de chegar como
  // se não ganhasse nada, e diria que nenhuma dívida fecha.
  const rendaDeclaradaCentavos = lar.membros.reduce((soma, membro) => soma + membro.rendaMensalCentavos, 0)

  const receitaObservada = Math.round(mesesComDados.reduce((s, m) => s + m.receitasCentavos, 0) / divisor)
  const despesaObservada = Math.round(mesesComDados.reduce((s, m) => s + m.despesasCentavos, 0) / divisor)

  const compromissoMetas = metas.filter(m => m.compromissoMensal).reduce((s,m)=>s+m.aporteMensalCentavos,0)
  const idsMetasFixas = new Set(metas.filter(m=>m.compromissoMensal).map(m=>m.id))
  const mediaAportesFixos = Math.round(transacoesHistorico.filter(t=>t.metaId && idsMetasFixas.has(t.metaId)).reduce((s,t)=>s+(t.tipo==="DESPESA"?t.valorCentavos:t.tipo==="RECEITA"?-t.valorCentavos:0),0)/divisor)
  const medias = {
    receitaCentavos: receitaObservada || rendaDeclaradaCentavos,
    // Mesma lógica da receita: sem histórico, vale o que o usuário estimou na
    // conversa inicial. Custo zero faria o app anunciar uma sobra irreal.
    despesaCentavos: despesaObservada || lar.custoEstimadoCentavos,
    sobraCentavos: receitaObservada
      ? Math.round(mesesComDados.reduce((s, m) => s + m.sobraCentavos, 0) / divisor)
      : rendaDeclaradaCentavos - (despesaObservada || lar.custoEstimadoCentavos),
    custoFixoCentavos: recorrencias
      .filter((recorrencia) => recorrencia.tipo === "DESPESA" && recorrencia.periodicidade === "MENSAL")
      .reduce((soma, recorrencia) => soma + recorrencia.valorCentavos, 0),
    custoEssencialCentavos: Math.round(
      transacoesHistorico
        .filter((t) => t.tipo === "DESPESA" && t.categoria?.essencial)
        .reduce((s, t) => s + t.valorCentavos, 0) / divisor,
    ),
    rendaDeclaradaCentavos,
  }

  // Aporte confirmado já integra o histórico. Só a diferença planejada é acrescentada.
  const ajusteMetas = compromissoMetas - mediaAportesFixos
  medias.despesaCentavos = Math.max(0, medias.despesaCentavos + ajusteMetas)
  medias.sobraCentavos = medias.receitaCentavos - medias.despesaCentavos
  medias.custoFixoCentavos += compromissoMetas

  // ── Orçamento ─────────────────────────────────────────────
  const linhasOrcamento = orcamentos.map((orcamento) => {
    const gasto = porCategoria.get(orcamento.categoriaId)?.totalCentavos ?? 0
    return {
      categoriaId: orcamento.categoriaId,
      nome: orcamento.categoria.nome,
      limiteCentavos: orcamento.limiteCentavos,
      gastoCentavos: gasto,
      percentual: orcamento.limiteCentavos > 0 ? Math.round((gasto / orcamento.limiteCentavos) * 100) : 0,
      estourou: gasto > orcamento.limiteCentavos,
    }
  })

  // ── Metas ─────────────────────────────────────────────────
  const metasProjetadas = metas.map((meta) => {
    const projecao = projetarMeta({
      alvoCentavos: meta.alvoCentavos,
      saldoAtualCentavos: meta.saldoCentavos,
      aporteMensalCentavos: meta.aporteMensalCentavos,
      rendimentoAnualBps: meta.rendimentoAnualBps,
      dataAlvo: meta.dataAlvo,
    })
    return {
      id: meta.id,
      nome: meta.nome,
      tipo: meta.tipo as string,
      alvoCentavos: meta.alvoCentavos,
      saldoCentavos: meta.saldoCentavos,
      percentual: projecao.percentual,
      mesesRestantes: projecao.mesesRestantes,
      aporteNecessarioCentavos: projecao.aporteNecessarioCentavos,
      aporteAtualCentavos: meta.aporteMensalCentavos,
      noPrazo: projecao.noPrazo,
      dataAlvo: meta.dataAlvo,
    }
  })

  // ── Dívidas ───────────────────────────────────────────────
  const listaDividas = dividas.map((divida) => ({
    id: divida.id,
    credor: divida.credor,
    saldoDevedorCentavos: divida.saldoDevedorCentavos,
    jurosMensalBps: divida.jurosMensalBps,
    parcelaCentavos: divida.parcelaCentavos,
    tipo: divida.tipo as string,
    parcelasTotal: divida.parcelasTotal,
    parcelasPagas: divida.parcelasPagas,
    diaVencimento: divida.diaVencimento,
  }))

  const parcelaMensal = listaDividas.reduce((soma, divida) => soma + divida.parcelaCentavos, 0)
  const rendaReferencia = medias.receitaCentavos || receitasMes || 1
  const sobraParaDividas = Math.max(0, medias.sobraCentavos)

  // ── Reserva ───────────────────────────────────────────────
  const custoParaReserva = medias.custoEssencialCentavos || medias.custoFixoCentavos || medias.despesaCentavos
  const metaReserva = metas.find((meta) => meta.tipo === "RESERVA_EMERGENCIA")
  const reservas=await prisma.meta.aggregate({where:{larId,tipo:"RESERVA_EMERGENCIA",status:{in:["ATIVA","CONCLUIDA","PAUSADA"]}},_sum:{saldoCentavos:true}})
  const reservaAtual = reservas._sum.saldoCentavos ?? 0
  const idealReserva = reservaIdeal(custoParaReserva, lar.mesesReserva)

  // ── Projeção de caixa ─────────────────────────────────────
  const eventosFuturos = recorrencias
    .filter((recorrencia) => recorrencia.periodicidade !== "MENSAL")
    .map((recorrencia) => ({
      competencia: `${recorrencia.proximaData.getUTCFullYear()}-${String(recorrencia.proximaData.getUTCMonth() + 1).padStart(2, "0")}`,
      valorCentavos: recorrencia.valorCentavos,
      tipo: recorrencia.tipo === "RECEITA" ? ("RECEITA" as const) : ("DESPESA" as const),
    }))

  const receitasFixas = recorrencias
    .filter((r) => r.tipo === "RECEITA" && r.periodicidade === "MENSAL")
    .reduce((soma, r) => soma + r.valorCentavos, 0)

  const projecao = projetarFluxo({
    competenciaInicial: competenciaMaisMeses(competencia, 1),
    meses: 12,
    saldoInicialCentavos: saldoTotalCentavos,
    receitasFixasCentavos: receitasFixas || medias.receitaCentavos,
    despesasFixasCentavos: medias.custoFixoCentavos + parcelaMensal,
    despesasVariaveisMediaCentavos: Math.max(0, medias.despesaCentavos - medias.custoFixoCentavos),
    eventos: eventosFuturos,
    proximaCompetencia: competenciaMaisMeses,
  })

  // ── Aposentadoria ─────────────────────────────────────────
  const metaAposentadoria = metas.find((meta) => meta.tipo === "APOSENTADORIA")
  const aposentadoria = metaAposentadoria
    ? projetarAposentadoria({
        idadeAtual: 35,
        idadeAposentadoria: metaAposentadoria.dataAlvo
          ? 35 + Math.max(1, Math.round(distanciaEmMeses(competencia, `${metaAposentadoria.dataAlvo.getUTCFullYear()}-01`) / 12))
          : 60,
        patrimonioAtualCentavos: metaAposentadoria.saldoCentavos,
        aporteMensalCentavos: metaAposentadoria.aporteMensalCentavos,
        // Sem rendimento informado, 5% reais ao ano é a referência conservadora
        // usada para carteira diversificada de longo prazo no Brasil.
        rendimentoRealAnualBps: metaAposentadoria.rendimentoAnualBps || 500,
        gastoMensalDesejadoCentavos: medias.despesaCentavos || 500_000,
      })
    : null

  // ── MEI ───────────────────────────────────────────────────
  let mei: Panorama["mei"] = null
  if (lar.meiPerfil) {
    const ano = Number(competencia.slice(0, 4))
    const mesAtual = Number(competencia.slice(5, 7))
    const faturamentoPorCompetencia = meiCompetencias.map((linha) => ({
      competencia: linha.competencia,
      valorCentavos: linha.receitaComercioCentavos + linha.receitaServicosCentavos,
    }))

    const situacao = avaliarMei({
      faturamentoPorCompetencia,
      limiteAnualCentavos: lar.meiPerfil.limiteAnualCentavos,
      mesAtual,
      ano,
    })

    const dasEmAberto = meiCompetencias
      .filter((linha) => !linha.dasPago && linha.competencia < competencia)
      .map((linha) => linha.competencia)
      .sort()

    const proximoDasEm = new Date(
      Date.UTC(ano, mesAtual - 1, Math.min(lar.meiPerfil.diaVencimentoDas, 28)),
    )

    mei = { ...situacao, dasEmAberto, proximoDasEm }
  }

  return {
    lar: {
      id: lar.id,
      nome: lar.nome,
      tipo: lar.tipo as string,
      diaInicioMes: lar.diaInicioMes,
      estrategiaDivida: lar.estrategiaDivida as Panorama["lar"]["estrategiaDivida"],
      mesesReserva: lar.mesesReserva,
    },
    competencia,
    saldoTotalCentavos,
    patrimonioCentavos,
    aplicadoCentavos,
    saldoPorConta,
    mes: {
      receitasCentavos: receitasMes,
      despesasCentavos: despesasMes,
      sobraCentavos: receitasMes - despesasMes,
      taxaPoupancaBps: bps(receitasMes - despesasMes, receitasMes),
      despesasPorCategoria: [...porCategoria.entries()]
        .map(([chave, linha]) => {
          const anterior = porCategoriaAnterior.get(chave) ?? 0
          return {
            ...linha,
            anteriorCentavos: anterior,
            variacaoBps: anterior > 0 ? Math.round(((linha.totalCentavos - anterior) / anterior) * 10_000) : null,
          }
        })
        .sort((a, b) => b.totalCentavos - a.totalCentavos),
      despesasPorMembro: [...porMembro.values()].sort((a, b) => b.totalCentavos - a.totalCentavos),
      gastosPorDia,
      maiorGastoDoDia:
        gastosPorDia.length > 0
          ? gastosPorDia.reduce((maior, linha) => (linha.totalCentavos > maior.totalCentavos ? linha : maior))
          : null,
      mediaDiariaCentavos:
        diasComGasto > 0 ? Math.round(despesasMes / diasComGasto) : 0,
      aPagarCentavos: transacoesMes.filter((t) => !t.pago && t.tipo === "DESPESA").reduce((s, t) => s + t.valorCentavos, 0),
      naoCategorizadas: doMes.filter((t) => !t.categoriaId).length,
    },
    historico,
    medias,
    orcamento: {
      competencia,
      linhas: linhasOrcamento,
      limiteTotalCentavos: linhasOrcamento.reduce((s, l) => s + l.limiteCentavos, 0),
      gastoTotalCentavos: linhasOrcamento.reduce((s, l) => s + l.gastoCentavos, 0),
    },
    metas: metasProjetadas,
    dividas: {
      lista: listaDividas,
      totalCentavos: listaDividas.reduce((s, d) => s + d.saldoDevedorCentavos, 0),
      parcelaMensalCentavos: parcelaMensal,
      comprometimentoBps: bps(parcelaMensal, rendaReferencia),
      plano: listaDividas.length > 0 ? compararEstrategias(listaDividas, sobraParaDividas) : null,
    },
    reserva: {
      idealCentavos: idealReserva,
      atualCentavos: reservaAtual,
      percentual: idealReserva > 0 ? Math.min(100, Math.round((reservaAtual / idealReserva) * 100)) : 0,
      mesesDeFolga: mesesDeFolga(reservaAtual, custoParaReserva),
    },
    projecao,
    aposentadoria,
    mei,
    recorrenciasProximas: recorrencias.slice(0, 10).map((recorrencia) => ({
      id: recorrencia.id,
      descricao: recorrencia.descricao,
      valorCentavos: recorrencia.valorCentavos,
      tipo: recorrencia.tipo as string,
      proximaData: recorrencia.proximaData,
    })),
  }
}
