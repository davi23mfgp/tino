import { prisma } from "@/lib/prisma"
import { comSessao, corpo, ok } from "@/lib/api"
import { competenciaAtual, competenciaMaisMeses } from "@/lib/datas"
import { criarParcelamento } from "@/lib/parcelamentos"
import { reservaIdeal } from "@/lib/financeiro"
import { valorVigente } from "@/lib/parametros"

interface Entrada {
  rendaMensalCentavos?: number
  custoMensalEstimadoCentavos?: number
  diaInicioMes?: number

  contas?: {
    nome: string
    tipo: "CORRENTE" | "POUPANCA" | "DINHEIRO" | "INVESTIMENTO" | "PJ_MEI"
    instituicao?: string
    saldoCentavos: number
    /// Juros do cheque especial em pontos-base, quando a conta está negativa.
    jurosChequeEspecialBps?: number
  }[]

  cartoes?: {
    nome: string
    instituicao?: string
    limiteCentavos?: number
    diaVencimento?: number
    faturaAtualCentavos?: number
  }[]

  parcelamentos?: {
    descricao: string
    cartaoIndice?: number
    valorParcelaCentavos: number
    parcelasTotal: number
    parcelasPagas: number
  }[]

  dividas?: {
    credor: string
    tipo?: string
    saldoDevedorCentavos: number
    jurosMensalBps?: number
    parcelaCentavos?: number
    diaVencimento?: number
  }[]

  metas?: { nome: string; tipo?: string; alvoCentavos: number; saldoCentavos?: number; aporteMensalCentavos?: number; dataAlvo?: string }[]

  mei?: { ativo: boolean; cnpj?: string; atividade?: string; dasMensalCentavos?: number }
}

/**
 * Grava tudo o que o usuário respondeu na conversa inicial.
 *
 * É uma transação só: se qualquer parte falhar, nada entra pela metade — um lar
 * com cartão cadastrado e parcela não cadastrada mostraria projeção errada, o
 * que é pior que não ter nada.
 */
export const POST = comSessao(async (sessao, requisicao) => {
  const dados = await corpo<Entrada>(requisicao)
  const competencia = competenciaAtual()
  const cartoesCriados: string[] = []

  // Lido antes da transação: consulta a mais dentro dela seguraria o lock por
  // mais tempo sem nenhuma vantagem, e o valor não muda no meio da gravação.
  const chequeEspecialPadraoBps = await valorVigente("juros.chequeEspecialBps")

  await prisma.$transaction(async (tx) => {
    if (dados.rendaMensalCentavos !== undefined && sessao.membroId) {
      await tx.membro.update({
        where: { id: sessao.membroId },
        data: { rendaMensalCentavos: dados.rendaMensalCentavos },
      })
    }

    // O app já cria "Conta corrente" e "Carteira" no cadastro. Se o usuário
    // descreveu as contas dele aqui, as genéricas viram ruído.
    if (dados.contas?.length) {
      await tx.conta.deleteMany({
        where: { larId: sessao.larId, transacoes: { none: {} }, nome: { in: ["Conta corrente", "Carteira"] } },
      })
    }

    for (const conta of dados.contas ?? []) {
      const criada = await tx.conta.create({
        data: {
          larId: sessao.larId,
          membroId: sessao.membroId,
          nome: conta.nome,
          tipo: conta.tipo,
          instituicao: conta.instituicao || null,
          // O saldo informado já embute todo o histórico anterior ao app, então
          // entra como saldo inicial e não como lançamento.
          saldoInicialCentavos: conta.saldoCentavos,
        },
      })

      // Conta no negativo é cheque especial em uso: vira dívida para aparecer no
      // plano de pagamento com o juro que ela realmente cobra.
      if (conta.saldoCentavos < 0) {
        await tx.divida.create({
          data: {
            larId: sessao.larId,
            contaId: criada.id,
            credor: `${conta.nome} — cheque especial`,
            tipo: "CHEQUE_ESPECIAL",
            saldoDevedorCentavos: Math.abs(conta.saldoCentavos),
            // A taxa informada pelo usuário vence. Sem ela, o teto legal de 8%
            // ao mês: superestimar avisa demais, subestimar esconde a dívida
            // mais cara que a pessoa tem.
            jurosMensalBps: conta.jurosChequeEspecialBps ?? chequeEspecialPadraoBps,
            observacao: conta.jurosChequeEspecialBps
              ? null
              : "Juros no teto legal de 8% a.m. — informe a taxa do seu contrato para a projeção ficar exata.",
          },
        })
      }
    }

    for (const cartao of dados.cartoes ?? []) {
      const criado = await tx.conta.create({
        data: {
          larId: sessao.larId,
          membroId: sessao.membroId,
          nome: cartao.nome,
          tipo: "CARTAO_CREDITO",
          instituicao: cartao.instituicao || null,
          limiteCentavos: cartao.limiteCentavos ?? null,
          diaVencimento: cartao.diaVencimento ?? null,
          // A fatura já aberta entra como saldo inicial negativo, não como
          // lançamento: virar despesa do mês inflaria a média de gastos e faria
          // a projeção repetir esse valor todo mês para sempre.
          saldoInicialCentavos: cartao.faturaAtualCentavos ? -Math.abs(cartao.faturaAtualCentavos) : 0,
        },
      })
      cartoesCriados.push(criado.id)
    }

    for (const divida of dados.dividas ?? []) {
      await tx.divida.create({
        data: {
          larId: sessao.larId,
          credor: divida.credor,
          tipo: (divida.tipo ?? "OUTRO") as never,
          saldoDevedorCentavos: Math.abs(divida.saldoDevedorCentavos),
          jurosMensalBps: divida.jurosMensalBps ?? 0,
          parcelaCentavos: divida.parcelaCentavos ?? 0,
          diaVencimento: divida.diaVencimento ?? 10,
        },
      })
    }

    for (const meta of dados.metas ?? []) {
      await tx.meta.create({
        data: {
          larId: sessao.larId,
          nome: meta.nome,
          tipo: (meta.tipo ?? "OUTRO") as never,
          alvoCentavos: Math.abs(meta.alvoCentavos),
          saldoCentavos: meta.saldoCentavos ?? 0,
          aporteMensalCentavos: meta.aporteMensalCentavos ?? 0,
          dataAlvo: meta.dataAlvo ? new Date(meta.dataAlvo) : null,
        },
      })
    }

    // A reserva de emergência já nasce com o cadastro, mas sem alvo: só agora o
    // app sabe o custo mensal para calcular quanto ela precisa ter.
    if (dados.custoMensalEstimadoCentavos) {
      const lar = await tx.lar.findUniqueOrThrow({ where: { id: sessao.larId }, select: { mesesReserva: true } })
      await tx.meta.updateMany({
        where: { larId: sessao.larId, tipo: "RESERVA_EMERGENCIA", alvoCentavos: 0 },
        data: { alvoCentavos: reservaIdeal(dados.custoMensalEstimadoCentavos, lar.mesesReserva) },
      })
    }

    if (dados.mei?.ativo) {
      await tx.meiPerfil.upsert({
        where: { larId: sessao.larId },
        update: {
          cnpj: dados.mei.cnpj?.replace(/\D/g, "") || null,
          ...(dados.mei.atividade ? { atividade: dados.mei.atividade as never } : {}),
          ...(dados.mei.dasMensalCentavos ? { dasMensalCentavos: dados.mei.dasMensalCentavos } : {}),
        },
        create: {
          larId: sessao.larId,
          cnpj: dados.mei.cnpj?.replace(/\D/g, "") || null,
          ...(dados.mei.atividade ? { atividade: dados.mei.atividade as never } : {}),
          ...(dados.mei.dasMensalCentavos ? { dasMensalCentavos: dados.mei.dasMensalCentavos } : {}),
        },
      })

      await tx.conta.create({
        data: { larId: sessao.larId, nome: "Conta do CNPJ", tipo: "PJ_MEI", cor: "purple" },
      })
    }

    await tx.lar.update({
      where: { id: sessao.larId },
      data: {
        onboardingEm: new Date(),
        ...(dados.diaInicioMes ? { diaInicioMes: dados.diaInicioMes } : {}),
        ...(dados.custoMensalEstimadoCentavos
          ? { custoEstimadoCentavos: dados.custoMensalEstimadoCentavos }
          : {}),
      },
    })
  })

  // Parcelamentos ficam fora da transação porque `criarParcelamento` monta as
  // parcelas em uma escrita própria. Se um falhar, o resto do lar já está de pé.
  for (const parcelamento of dados.parcelamentos ?? []) {
    const contaId = cartoesCriados[parcelamento.cartaoIndice ?? 0]
    if (!contaId) continue

    // A primeira parcela em aberto cai no mês corrente; as pagas ficam nos
    // meses anteriores, para o histórico não mentir sobre quando começou.
    const primeira = competenciaMaisMeses(competencia, -parcelamento.parcelasPagas)

    await criarParcelamento({
      larId: sessao.larId,
      contaId,
      descricao: parcelamento.descricao,
      valorTotalCentavos: parcelamento.valorParcelaCentavos * parcelamento.parcelasTotal,
      parcelasTotal: parcelamento.parcelasTotal,
      parcelasPagas: parcelamento.parcelasPagas,
      dataCompra: new Date(),
      primeiraCompetencia: primeira,
      diaVencimento: 10,
    })
  }

  return ok({ concluido: true })
})

/** Pula a conversa inicial e vai direto para o app. */
export const PATCH = comSessao(async (sessao) => {
  await prisma.lar.update({ where: { id: sessao.larId }, data: { onboardingEm: new Date() } })
  return ok({ pulado: true })
})

/**
 * Reabre a conversa inicial.
 *
 * Quem pulou fica com o painel vazio e sem caminho de volta — a única saída
 * seria criar outra conta. Reabrir apenas limpa a marca; nada do que já foi
 * cadastrado é apagado, e o que for respondido de novo soma ao que existe.
 */
export const DELETE = comSessao(async (sessao) => {
  await prisma.lar.update({ where: { id: sessao.larId }, data: { onboardingEm: null } })
  return ok({ reaberto: true })
})
