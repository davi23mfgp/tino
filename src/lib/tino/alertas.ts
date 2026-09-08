/**
 * Alertas do Tino — o que ele diria sem ser perguntado.
 *
 * Cada alerta tem uma `chave` estável dentro do período. É ela que impede o
 * mesmo aviso de reaparecer todo dia: um assessor que repete o mesmo recado
 * cinco vezes deixa de ser lido.
 */

import type { SeveridadeAlerta } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { formatarDecimal, formatarMoeda } from "@/lib/dinheiro"
import { rotuloCompetencia } from "@/lib/datas"
import { montarPanorama, type Panorama } from "@/lib/tino/panorama"
import { diasEntre, formatarData } from "@/lib/datas"

export interface AlertaGerado {
  tipo: string
  severidade: SeveridadeAlerta
  titulo: string
  texto: string
  acaoRota?: string
  chave: string
  dados?: Record<string, unknown>
}

/**
 * O catálogo dos vigias — pedido do redesign de 07/09/2026: cada TIPO de
 * alerta que o motor pode gerar, com nome curto e a frase de "o que faz",
 * pra tela de Configurações listar e o usuário ligar/desligar por tipo.
 *
 * Nem todo `tipo` que `gerarAlertas` produz está aqui — os de MEI só fazem
 * sentido pra quem é MEI, e entrar na lista geral confundiria quem não é.
 * Os seis daqui são os que o brief pediu nominalmente.
 */
export const VIGIAS = [
  {
    tipo: "orcamento_estourado",
    nome: "Estouro de categoria",
    frase: "Avisa quando uma categoria do orçamento passa de 80% do limite.",
  },
  {
    tipo: "fatura_acima_limite",
    nome: "Fatura acima do limite",
    frase: "Avisa quando a fatura de um cartão já passou do limite cadastrado.",
  },
  {
    tipo: "vencimento_proximo",
    nome: "Vencimento próximo",
    frase: "Avisa quando uma conta fixa vence nos próximos 3 dias.",
  },
  {
    tipo: "caixa_negativo",
    nome: "Caixa negativo à frente",
    frase: "Avisa quando a projeção mostra o saldo virando negativo.",
  },
  {
    tipo: "juros_abusivo",
    nome: "Dívida cara parada",
    frase: "Avisa quando alguma dívida cobra juro alto (10% ao mês ou mais).",
  },
  {
    tipo: "sem_categoria",
    nome: "Categoria fora do padrão",
    frase: "Avisa quando 5 ou mais lançamentos do mês ainda não têm categoria.",
  },
] as const

export type TipoVigia = (typeof VIGIAS)[number]["tipo"]

export function gerarAlertas(panorama: Panorama, desativados: ReadonlySet<string> = new Set()): AlertaGerado[] {
  const alertas: AlertaGerado[] = []
  const mes = panorama.competencia

  // ── Caixa ─────────────────────────────────────────────────
  const primeiroNegativo = panorama.projecao.find((linha) => linha.negativo)
  if (primeiroNegativo) {
    alertas.push({
      tipo: "caixa_negativo",
      severidade: "CRITICO",
      titulo: "Seu caixa fica negativo antes do previsto",
      texto: `Mantendo o ritmo atual, o saldo fica negativo em ${rotuloCompetencia(primeiroNegativo.competencia)} (${formatarMoeda(primeiroNegativo.saldoAcumuladoCentavos)}). Dá para evitar cortando ${formatarMoeda(Math.abs(primeiroNegativo.saldoAcumuladoCentavos))} ao longo dos próximos meses.`,
      acaoRota: "/projecao",
      chave: `caixa_negativo:${primeiroNegativo.competencia}`,
      dados: { competencia: primeiroNegativo.competencia },
    })
  }

  if (panorama.mes.sobraCentavos < 0) {
    alertas.push({
      tipo: "mes_no_vermelho",
      severidade: "ATENCAO",
      titulo: "Você gastou mais do que recebeu neste mês",
      texto: `Saldo do mês: ${formatarMoeda(panorama.mes.sobraCentavos)}. A maior despesa foi ${panorama.mes.despesasPorCategoria[0]?.nome ?? "sem categoria"} (${formatarMoeda(panorama.mes.despesasPorCategoria[0]?.totalCentavos ?? 0)}).`,
      acaoRota: "/transacoes",
      chave: `mes_no_vermelho:${mes}`,
    })
  }

  // ── Orçamento ─────────────────────────────────────────────
  for (const linha of panorama.orcamento.linhas.filter((l) => l.estourou)) {
    alertas.push({
      tipo: "orcamento_estourado",
      severidade: "ATENCAO",
      titulo: `${linha.nome} passou do orçamento`,
      texto: `Você planejou ${formatarMoeda(linha.limiteCentavos)} e já gastou ${formatarMoeda(linha.gastoCentavos)} (${linha.percentual}%).`,
      acaoRota: "/orcamento",
      chave: `orcamento_estourado:${mes}:${linha.categoriaId}`,
    })
  }

  // 80% do orçamento com o mês ainda correndo é o momento útil de avisar:
  // depois de estourar, o aviso vira só constatação.
  for (const linha of panorama.orcamento.linhas.filter((l) => !l.estourou && l.percentual >= 80)) {
    alertas.push({
      tipo: "orcamento_perto",
      severidade: "INFO",
      titulo: `${linha.nome} está em ${linha.percentual}% do orçamento`,
      texto: `Restam ${formatarMoeda(linha.limiteCentavos - linha.gastoCentavos)} até o limite que você definiu.`,
      acaoRota: "/orcamento",
      chave: `orcamento_perto:${mes}:${linha.categoriaId}`,
    })
  }

  // ── Reserva ───────────────────────────────────────────────
  if (panorama.reserva.percentual < 100 && panorama.reserva.mesesDeFolga < 3) {
    alertas.push({
      tipo: "reserva_baixa",
      severidade: panorama.reserva.mesesDeFolga < 1 ? "CRITICO" : "ATENCAO",
      titulo: "Sua reserva cobre pouco tempo",
      texto: `Hoje a reserva sustenta ${panorama.reserva.mesesDeFolga} mês(es) do seu custo essencial. O alvo do seu lar é ${panorama.lar.mesesReserva} meses (${formatarMoeda(panorama.reserva.idealCentavos)}).`,
      acaoRota: "/metas",
      chave: `reserva_baixa:${mes}`,
    })
  }

  // ── Dívidas ───────────────────────────────────────────────
  if (panorama.dividas.comprometimentoBps > 3000) {
    alertas.push({
      tipo: "divida_alta",
      severidade: panorama.dividas.comprometimentoBps > 4000 ? "CRITICO" : "ATENCAO",
      titulo: "Dívidas comprometem parte grande da renda",
      texto: `${(panorama.dividas.comprometimentoBps / 100).toFixed(0)}% da sua renda média vai para parcelas (${formatarMoeda(panorama.dividas.parcelaMensalCentavos)} por mês). Acima de 30% o orçamento fica sem folga para imprevisto.`,
      acaoRota: "/dividas",
      chave: `divida_alta:${mes}`,
    })
  }

  const rotativo = panorama.dividas.lista.find((divida) => divida.jurosMensalBps >= 1000)
  if (rotativo) {
    alertas.push({
      tipo: "juros_abusivo",
      severidade: "CRITICO",
      titulo: `Juro muito alto em ${rotativo.credor}`,
      texto: `Essa dívida cobra ${formatarDecimal(rotativo.jurosMensalBps / 100, 2)}% ao mês. Trocá-la por um crédito mais barato (portabilidade ou consignado) costuma cortar boa parte do custo.`,
      acaoRota: "/emprestimos",
      chave: `juros_abusivo:${mes}:${rotativo.id}`,
    })
  }

  if (panorama.dividas.plano && panorama.dividas.plano.economiaAvalancheCentavos > 10_000) {
    alertas.push({
      tipo: "estrategia_divida",
      severidade: "INFO",
      titulo: "Trocar a ordem de pagamento economiza juros",
      texto: `Atacando primeiro a dívida de maior juro, você pagaria ${formatarMoeda(panorama.dividas.plano.economiaAvalancheCentavos)} a menos em juros e terminaria ${Math.abs(panorama.dividas.plano.mesesAMais)} mês(es) antes.`,
      acaoRota: "/dividas",
      chave: `estrategia_divida:${mes}`,
    })
  }

  // ── Metas ─────────────────────────────────────────────────
  for (const meta of panorama.metas.filter((m) => !m.noPrazo && m.dataAlvo)) {
    const diferenca = meta.aporteNecessarioCentavos - meta.aporteAtualCentavos
    if (diferenca <= 0) continue
    alertas.push({
      tipo: "meta_atrasada",
      severidade: "INFO",
      titulo: `${meta.nome} não chega na data`,
      texto: `Com ${formatarMoeda(meta.aporteAtualCentavos)} por mês a meta não fecha no prazo. Seriam necessários ${formatarMoeda(meta.aporteNecessarioCentavos)} — ${formatarMoeda(diferenca)} a mais.`,
      acaoRota: "/metas",
      chave: `meta_atrasada:${mes}:${meta.id}`,
    })
  }

  // ── Cartão ────────────────────────────────────────────────
  // Fatura acima do limite é diferente de orçamento estourado: orçamento é
  // meta que o próprio usuário definiu por categoria; aqui é o teto que o
  // BANCO deu, e passar dele tem juro rotativo de verdade te esperando.
  for (const conta of panorama.saldoPorConta) {
    if (conta.tipo !== "CARTAO_CREDITO" || conta.limiteCentavos === null) continue
    const usado = Math.abs(Math.min(0, conta.saldoCentavos))
    if (usado <= conta.limiteCentavos) continue
    alertas.push({
      tipo: "fatura_acima_limite",
      severidade: "CRITICO",
      titulo: `Fatura do ${conta.nome} passou do limite`,
      texto: `Limite de ${formatarMoeda(conta.limiteCentavos)}, fatura em ${formatarMoeda(usado)} — ${formatarMoeda(usado - conta.limiteCentavos)} acima. O excedente costuma virar rotativo, o juro mais caro depois do cheque especial.`,
      acaoRota: "/cartoes",
      chave: `fatura_acima_limite:${mes}:${conta.id}`,
    })
  }

  // ── Contas fixas ──────────────────────────────────────────
  const JANELA_VENCIMENTO_DIAS = 3
  const proximaDespesa = panorama.recorrenciasProximas.find((r) => r.tipo === "DESPESA")
  if (proximaDespesa) {
    const dias = diasEntre(new Date(), proximaDespesa.proximaData)
    if (dias >= 0 && dias <= JANELA_VENCIMENTO_DIAS) {
      alertas.push({
        tipo: "vencimento_proximo",
        severidade: dias === 0 ? "ATENCAO" : "INFO",
        titulo:
          dias === 0
            ? `${proximaDespesa.descricao} vence hoje`
            : `${proximaDespesa.descricao} vence em ${dias} dia${dias === 1 ? "" : "s"}`,
        texto: `${formatarMoeda(proximaDespesa.valorCentavos)}, em ${formatarData(proximaDespesa.proximaData)}.`,
        acaoRota: "/recorrencias",
        // A chave leva a data: a próxima ocorrência do MESMO fixo, mês que
        // vem, é um vencimento diferente e merece avisar de novo.
        chave: `vencimento_proximo:${proximaDespesa.id}:${formatarData(proximaDespesa.proximaData)}`,
      })
    }
  }

  // ── Higiene dos dados ─────────────────────────────────────
  if (panorama.mes.naoCategorizadas >= 5) {
    alertas.push({
      tipo: "sem_categoria",
      severidade: "INFO",
      titulo: `${panorama.mes.naoCategorizadas} lançamentos sem categoria`,
      texto: "Categorizar deixa a projeção e o orçamento corretos. Cada correção vira uma regra: da próxima vez o Tino acerta sozinho.",
      acaoRota: "/transacoes?filtro=sem-categoria",
      chave: `sem_categoria:${mes}`,
    })
  }

  // ── MEI ───────────────────────────────────────────────────
  if (panorama.mei) {
    const mei = panorama.mei

    if (mei.risco === "ESTOURO_ACIMA_20") {
      alertas.push({
        tipo: "mei_estouro_grave",
        severidade: "CRITICO",
        titulo: "Faturamento passou o limite do MEI em mais de 20%",
        texto: `Você faturou ${formatarMoeda(mei.faturamentoAnoCentavos)} contra o limite de ${formatarMoeda(mei.limiteAnualCentavos)}. Nesse patamar o desenquadramento é retroativo ao início do ano. Procure seu contador para migrar de regime.`,
        acaoRota: "/mei",
        chave: `mei_estouro_grave:${mes.slice(0, 4)}`,
      })
    } else if (mei.risco === "ESTOURO_ATE_20") {
      alertas.push({
        tipo: "mei_estouro",
        severidade: "CRITICO",
        titulo: "Faturamento passou o limite do MEI",
        texto: `Excesso de ${formatarMoeda(mei.faturamentoAnoCentavos - mei.limiteAnualCentavos)}. Até 20% de excesso, o imposto sobre a diferença é recolhido e o desenquadramento vale a partir de janeiro do ano seguinte.`,
        acaoRota: "/mei",
        chave: `mei_estouro:${mes.slice(0, 4)}`,
      })
    } else if (mei.risco === "ATENCAO") {
      alertas.push({
        tipo: "mei_atencao",
        severidade: "ATENCAO",
        titulo: `MEI em ${mei.percentualUsado}% do limite anual`,
        texto: mei.mesQueEstoura
          ? `No ritmo atual (${formatarMoeda(mei.mediaMensalCentavos)} por mês), o limite estoura em ${rotuloCompetencia(mei.mesQueEstoura)}. Para fechar o ano dentro dele, o teto é ${formatarMoeda(mei.tetoMensalRestanteCentavos)} por mês.`
          : `Restam ${formatarMoeda(mei.disponivelCentavos)} de limite para o ano.`,
        acaoRota: "/mei",
        chave: `mei_atencao:${mes}`,
      })
    }

    if (mei.dasEmAberto.length > 0) {
      alertas.push({
        tipo: "mei_das_atrasado",
        severidade: "CRITICO",
        titulo: `${mei.dasEmAberto.length} DAS em aberto`,
        texto: `Competências pendentes: ${mei.dasEmAberto.map((c) => rotuloCompetencia(c, true)).join(", ")}. DAS atrasado gera multa e juros, e atrasa a contagem para aposentadoria.`,
        acaoRota: "/mei",
        chave: `mei_das_atrasado:${mes}:${mei.dasEmAberto.length}`,
      })
    }
  }

  return desativados.size > 0 ? alertas.filter((a) => !desativados.has(a.tipo)) : alertas
}

/**
 * Recalcula e persiste os alertas do lar.
 *
 * `skipDuplicates` no índice (larId, chave) é o que torna a função idempotente:
 * pode rodar a cada abertura do app sem multiplicar avisos.
 */
export async function atualizarAlertas(larId: string) {
  const [panorama, desligados] = await Promise.all([
    montarPanorama(larId),
    prisma.vigiaConfig.findMany({ where: { larId, ativo: false }, select: { tipo: true } }),
  ])
  const gerados = gerarAlertas(panorama, new Set(desligados.map((v) => v.tipo)))

  if (gerados.length > 0) {
    await prisma.alerta.createMany({
      data: gerados.map((alerta) => ({
        larId,
        tipo: alerta.tipo,
        severidade: alerta.severidade,
        titulo: alerta.titulo,
        texto: alerta.texto,
        acaoRota: alerta.acaoRota,
        chave: alerta.chave,
        dados: (alerta.dados ?? {}) as object,
      })),
      skipDuplicates: true,
    })
  }

  // Antes só trazia os não lidos — o painel de notificações do topo
  // (`barra-topo.tsx`) agora tem aba "Todas", que precisa ver os já lidos
  // também. Não lido primeiro (é o que importa agora), depois mais recente;
  // `lido` já existe no schema desde a migration inicial, só não era lido
  // por nenhuma tela até esta rodada.
  return prisma.alerta.findMany({
    where: { larId },
    orderBy: [{ lido: "asc" }, { severidade: "desc" }, { criadoEm: "desc" }],
    take: 30,
  })
}
