/**
 * Tino — o assessor.
 *
 * Duas camadas, nesta ordem:
 * 1. motor de intenções local, que responde as perguntas frequentes direto do
 *    panorama — instantâneo, gratuito e com número auditável;
 * 2. modelo de linguagem (opcional), para o que a camada 1 não cobre.
 *
 * A camada 1 vem primeiro de propósito: "quanto gastei com mercado?" tem uma
 * resposta certa que sai do banco. Mandar isso para um modelo custa dinheiro,
 * demora e abre espaço para número inventado.
 *
 * O Tino nunca recomenda ativo, corretora ou aplicação específica: explica
 * mecanismo, mostra o número e deixa a decisão com a pessoa.
 */

import { formatarMoeda, formatarPercentual, paraCentavos } from "@/lib/dinheiro"
import { rotuloCompetencia } from "@/lib/datas"
import { analisarEmprestimo } from "@/lib/financeiro"
import type { Panorama } from "@/lib/tino/panorama"

export interface RespostaAssistente {
  texto: string
  /// Números usados na resposta — a tela mostra e o usuário confere.
  contexto?: Record<string, unknown>
  /// Atalho sugerido depois da resposta ("ver dívidas", "simular").
  acao?: { rotulo: string; rota: string }
  fonte: "regras" | "modelo"
}

const NORMALIZAR = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()

const contem = (texto: string, ...termos: string[]) => termos.some((termo) => texto.includes(termo))

/** Extrai o primeiro valor em reais citado na pergunta ("me empresta 5 mil"). */
function valorNaPergunta(pergunta: string): number | null {
  const mil = /(\d+(?:[.,]\d+)?)\s*(mil|k)\b/i.exec(pergunta)
  if (mil) return Math.round(Number(mil[1].replace(",", ".")) * 1000 * 100)

  const reais = /(?:r\$\s*)?(\d{1,3}(?:\.\d{3})*(?:,\d{2})?|\d+(?:[.,]\d{1,2})?)/.exec(pergunta)
  if (!reais) return null
  const centavos = paraCentavos(reais[1])
  // Números de um dígito quase sempre são "12 vezes", não "R$ 9".
  return centavos >= 1000 ? centavos : null
}

function numeroNaPergunta(pergunta: string, ...rotulos: string[]): number | null {
  for (const rotulo of rotulos) {
    const casado = new RegExp(`(\\d+)\\s*${rotulo}`, "i").exec(pergunta)
    if (casado) return Number(casado[1])
  }
  return null
}

/**
 * Responde pelo motor de regras. Devolve null quando não tem certeza —
 * é o sinal para o modelo assumir. Chutar aqui seria pior que passar adiante.
 */
export function responderPorRegras(pergunta: string, panorama: Panorama): RespostaAssistente | null {
  const p = NORMALIZAR(pergunta)

  // ── Saldo e situação geral ────────────────────────────────
  if (contem(p, "quanto eu tenho", "meu saldo", "quanto tenho", "saldo total", "quanto sobrou")) {
    const linhas = panorama.saldoPorConta
      .filter((conta) => conta.tipo !== "CARTAO_CREDITO")
      .map((conta) => `• ${conta.nome}: ${formatarMoeda(conta.saldoCentavos)}`)
      .join("\n")

    return {
      texto: [
        `Você tem ${formatarMoeda(panorama.saldoTotalCentavos)} disponíveis hoje.`,
        linhas,
        "",
        `Neste mês entraram ${formatarMoeda(panorama.mes.receitasCentavos)} e saíram ${formatarMoeda(panorama.mes.despesasCentavos)}, sobra de ${formatarMoeda(panorama.mes.sobraCentavos)}.`,
        "Cartão de crédito não entra nesse total: o limite é dívida futura, não dinheiro seu.",
      ].join("\n"),
      contexto: { saldoTotalCentavos: panorama.saldoTotalCentavos, contas: panorama.saldoPorConta },
      fonte: "regras",
    }
  }

  // ── Gasto por categoria ───────────────────────────────────
  if (contem(p, "quanto gastei", "quanto gasto", "onde foi meu dinheiro", "no que gastei", "maiores gastos")) {
    const categoria = panorama.mes.despesasPorCategoria.find((linha) => p.includes(NORMALIZAR(linha.nome)))

    if (categoria) {
      const media = panorama.medias.despesaCentavos
      return {
        texto: `Em ${rotuloCompetencia(panorama.competencia)} você gastou ${formatarMoeda(categoria.totalCentavos)} com ${categoria.nome}, ${((categoria.totalCentavos / Math.max(1, panorama.mes.despesasCentavos)) * 100).toFixed(0)}% do total do mês (${formatarMoeda(panorama.mes.despesasCentavos)}). Sua despesa média mensal é ${formatarMoeda(media)}.`,
        contexto: { categoria: categoria.nome, totalCentavos: categoria.totalCentavos },
        acao: { rotulo: "Ver lançamentos", rota: "/transacoes" },
        fonte: "regras",
      }
    }

    const top = panorama.mes.despesasPorCategoria.slice(0, 5)
    return {
      texto: [
        `Em ${rotuloCompetencia(panorama.competencia)} saíram ${formatarMoeda(panorama.mes.despesasCentavos)}. Os maiores blocos:`,
        ...top.map(
          (linha, indice) =>
            `${indice + 1}. ${linha.nome}: ${formatarMoeda(linha.totalCentavos)}${linha.essencial ? " (essencial)" : ""}`,
        ),
        "",
        top.some((linha) => !linha.essencial)
          ? "As categorias não essenciais são as que dão para mexer sem mudar seu padrão de vida."
          : "Quase tudo aqui é essencial: cortar exige mudança maior, não ajuste fino.",
      ].join("\n"),
      contexto: { despesasPorCategoria: top },
      acao: { rotulo: "Ver análise completa", rota: "/analise" },
      fonte: "regras",
    }
  }

  // ── Empréstimo ────────────────────────────────────────────
  if (contem(p, "emprestimo", "financiamento", "pegar credito", "vale a pena pegar", "consignado", "parcelar")) {
    const valor = valorNaPergunta(pergunta)
    if (valor) {
      const parcelas = numeroNaPergunta(pergunta, "x", "vezes", "parcelas", "meses") ?? 12
      const jurosBps = (numeroNaPergunta(pergunta, "%") ?? 0) * 100 || 250

      const analise = analisarEmprestimo({
        valorCentavos: valor,
        parcelas,
        jurosMensalBps: jurosBps,
        rendaMensalCentavos: panorama.medias.receitaCentavos || 1,
        parcelasAtuaisCentavos: panorama.dividas.parcelaMensalCentavos,
        sobraMensalCentavos: panorama.medias.sobraCentavos,
        reservaCentavos: panorama.reserva.atualCentavos,
        maiorJurosAtualBps: Math.max(0, ...panorama.dividas.lista.map((divida) => divida.jurosMensalBps)),
      })

      const rotulo =
        analise.veredito === "APROVAR" ? "Cabe no seu orçamento" : analise.veredito === "CUIDADO" ? "Dá, mas aperta" : "Não recomendo"

      return {
        texto: [
          `${rotulo}. Simulando ${formatarMoeda(valor)} em ${parcelas}x a ${formatarPercentual(jurosBps)} ao mês:`,
          "",
          `• Parcela: ${formatarMoeda(analise.parcelaCentavos)}`,
          `• Total pago: ${formatarMoeda(analise.totalPagoCentavos)} (${formatarMoeda(analise.totalJurosCentavos)} só de juros)`,
          `• CET: ${formatarPercentual(analise.cetMensalBps)} ao mês / ${formatarPercentual(analise.cetAnualBps)} ao ano`,
          "",
          ...analise.motivos.map((motivo) => `• ${motivo}`),
          ...(analise.alternativas.length > 0
            ? ["", "Antes de assinar, considere:", ...analise.alternativas.map((alternativa) => `• ${alternativa}`)]
            : []),
        ].join("\n"),
        contexto: {
          parcelaCentavos: analise.parcelaCentavos,
          cetMensalBps: analise.cetMensalBps,
          veredito: analise.veredito,
        },
        acao: { rotulo: "Abrir simulador", rota: "/emprestimos" },
        fonte: "regras",
      }
    }

    return {
      texto: "Me diga o valor, o prazo e a taxa que o banco ofereceu (ex.: \"20 mil em 24x a 2,3% ao mês\") que eu calculo o CET, a parcela e se isso cabe no seu orçamento.",
      acao: { rotulo: "Abrir simulador", rota: "/emprestimos" },
      fonte: "regras",
    }
  }

  // ── Dívidas ───────────────────────────────────────────────
  // Variações da mesma pergunta. "saio do vermelho", "tô negativo", "quando
  // fico livre" — todas querem o plano de quitação, e o usuário não deveria ter
  // de adivinhar a frase que o app entende.
  if (contem(p, "divida", "devendo", "quitar", "vermelho", "negativ", "quando fico livre", "quando eu fico livre", "no azul", "cheque especial")) {
    if (panorama.dividas.lista.length === 0) {
      return { texto: "Você não tem nenhuma dívida cadastrada. Se tiver alguma fora do app, cadastre em Dívidas que eu monto o plano de quitação.", acao: { rotulo: "Cadastrar dívida", rota: "/dividas" }, fonte: "regras" }
    }

    const plano = panorama.dividas.plano
    const escolhido = panorama.lar.estrategiaDivida === "BOLA_DE_NEVE" ? plano?.bolaDeNeve : plano?.avalanche
    const primeira = escolhido?.quitacoes[0]

    return {
      texto: [
        `Você deve ${formatarMoeda(panorama.dividas.totalCentavos)} em ${panorama.dividas.lista.length} dívida(s), pagando ${formatarMoeda(panorama.dividas.parcelaMensalCentavos)} por mês, ${(panorama.dividas.comprometimentoBps / 100).toFixed(0)}% da sua renda média.`,
        "",
        escolhido
          ? `Contando só as dívidas cadastradas, com a sobra atual (${formatarMoeda(Math.max(0, panorama.medias.sobraCentavos))} por mês) você quita em ${escolhido.meses} meses, pagando ${formatarMoeda(escolhido.totalJurosCentavos)} de juros no caminho.`
          : "",
        primeira ? `A primeira a cair seria ${primeira.credor}, no mês ${primeira.mes}.` : "",
        plano && plano.economiaAvalancheCentavos > 0
          ? `\nAtacar pelo maior juro (avalanche) economiza ${formatarMoeda(plano.economiaAvalancheCentavos)} em relação a atacar pelo menor saldo.`
          : "",
      ]
        .filter(Boolean)
        .join("\n"),
      contexto: { totalCentavos: panorama.dividas.totalCentavos, meses: escolhido?.meses },
      acao: { rotulo: "Ver plano de quitação", rota: "/dividas" },
      fonte: "regras",
    }
  }

  // ── Metas ─────────────────────────────────────────────────
  if (contem(p, "meta", "viagem", "juntar", "economizar para", "poupar para", "comprar")) {
    const meta = panorama.metas.find((linha) => p.includes(NORMALIZAR(linha.nome)))

    if (meta) {
      return {
        texto: [
          `${meta.nome}: ${formatarMoeda(meta.saldoCentavos)} de ${formatarMoeda(meta.alvoCentavos)} (${meta.percentual.toFixed(0)}%).`,
          meta.mesesRestantes === null
            ? "Com o aporte atual essa meta não fecha. Aumente o valor mensal ou reveja o alvo."
            : `No ritmo atual (${formatarMoeda(meta.aporteAtualCentavos)} por mês), faltam ${meta.mesesRestantes} meses.`,
          meta.noPrazo ? "Está dentro do prazo." : `Para bater a data, o aporte precisaria ser ${formatarMoeda(meta.aporteNecessarioCentavos)} por mês.`,
        ].join("\n"),
        contexto: { meta: meta.nome, percentual: meta.percentual },
        acao: { rotulo: "Ver metas", rota: "/metas" },
        fonte: "regras",
      }
    }

    if (panorama.metas.length > 0) {
      return {
        texto: [
          "Suas metas ativas:",
          ...panorama.metas.map(
            (linha) =>
              `• ${linha.nome}: ${formatarMoeda(linha.saldoCentavos)} de ${formatarMoeda(linha.alvoCentavos)} (${linha.percentual.toFixed(0)}%)${linha.mesesRestantes !== null ? `, faltam ${linha.mesesRestantes} meses` : ", sem aporte suficiente"}`,
          ),
          "",
          `Sua sobra média é ${formatarMoeda(panorama.medias.sobraCentavos)} por mês, e é dela que saem os aportes.`,
        ].join("\n"),
        acao: { rotulo: "Ver metas", rota: "/metas" },
        fonte: "regras",
      }
    }
  }

  // ── Reserva ───────────────────────────────────────────────
  if (contem(p, "reserva", "emergencia", "colchao", "se eu perder o emprego")) {
    return {
      texto: [
        `Sua reserva está em ${formatarMoeda(panorama.reserva.atualCentavos)}, ${panorama.reserva.percentual}% do alvo de ${formatarMoeda(panorama.reserva.idealCentavos)} (${panorama.lar.mesesReserva} meses de custo essencial).`,
        `Sem nenhuma receita, esse dinheiro sustenta ${panorama.reserva.mesesDeFolga} mês(es) do seu padrão atual.`,
        panorama.reserva.percentual < 100
          ? "Reserva vem antes de investir em prazo longo: sem ela, qualquer imprevisto vira dívida cara."
          : "Reserva completa. A partir daqui a sobra pode ir para as metas de prazo mais longo.",
      ].join("\n"),
      acao: { rotulo: "Ver metas", rota: "/metas" },
      fonte: "regras",
    }
  }

  // ── Aposentadoria ─────────────────────────────────────────
  if (contem(p, "aposentar", "aposentadoria", "parar de trabalhar", "independencia financeira")) {
    if (!panorama.aposentadoria) {
      return {
        texto: "Ainda não há uma meta de aposentadoria cadastrada. Crie uma em Metas com o valor que você já tem guardado e o quanto consegue aportar por mês, e eu projeto quando dá para parar.",
        acao: { rotulo: "Criar meta", rota: "/metas" },
        fonte: "regras",
      }
    }

    const a = panorama.aposentadoria
    return {
      texto: [
        `Mantendo o aporte atual, você chegaria a ${formatarMoeda(a.patrimonioNaAposentadoriaCentavos)}, o que sustenta cerca de ${formatarMoeda(a.rendaMensalSustentavelCentavos)} por mês (retirada de 4% ao ano).`,
        `Para manter seu padrão atual, o patrimônio necessário é ${formatarMoeda(a.patrimonioAlvoCentavos)}.`,
        a.faltaCentavos > 0
          ? `Faltam ${formatarMoeda(a.faltaCentavos)}. Aportando ${formatarMoeda(a.aporteNecessarioCentavos)} por mês você fecha essa conta.`
          : "Você já está à frente do necessário para o padrão de vida atual.",
        a.idadeIndependencia ? `\nNo ritmo de hoje, a independência chega por volta dos ${a.idadeIndependencia} anos.` : "",
        "\nOs valores estão em poder de compra de hoje (já descontada a inflação).",
      ]
        .filter(Boolean)
        .join("\n"),
      acao: { rotulo: "Ver projeção", rota: "/projecao" },
      fonte: "regras",
    }
  }

  // ── MEI ───────────────────────────────────────────────────
  if (contem(p, "mei", "cnpj", "das", "limite anual", "faturamento", "nota fiscal", "desenquadr")) {
    if (!panorama.mei) {
      return {
        texto: "O modo MEI está desligado neste lar. Ative em Configurações para eu acompanhar faturamento, limite anual e DAS.",
        acao: { rotulo: "Ativar MEI", rota: "/configuracoes" },
        fonte: "regras",
      }
    }

    const mei = panorama.mei
    return {
      texto: [
        `Faturamento do ano: ${formatarMoeda(mei.faturamentoAnoCentavos)} de ${formatarMoeda(mei.limiteAnualCentavos)} (${mei.percentualUsado}%).`,
        `Média mensal de ${formatarMoeda(mei.mediaMensalCentavos)}, projeção de fechar o ano em ${formatarMoeda(mei.projecaoAnualCentavos)}.`,
        mei.mesQueEstoura
          ? `No ritmo atual o limite estoura em ${rotuloCompetencia(mei.mesQueEstoura)}. Teto seguro por mês daqui para frente: ${formatarMoeda(mei.tetoMensalRestanteCentavos)}.`
          : `Ainda cabem ${formatarMoeda(mei.disponivelCentavos)} de faturamento neste ano.`,
        mei.dasEmAberto.length > 0
          ? `\nAtenção: ${mei.dasEmAberto.length} DAS em aberto (${mei.dasEmAberto.join(", ")}). Atraso gera multa e interrompe a contagem para a aposentadoria.`
          : "\nDAS em dia.",
      ].join("\n"),
      acao: { rotulo: "Ver painel MEI", rota: "/mei" },
      fonte: "regras",
    }
  }

  // ── Projeção ──────────────────────────────────────────────
  if (contem(p, "projecao", "proximos meses", "vou conseguir", "vai dar", "previsao", "fim do ano")) {
    const negativo = panorama.projecao.find((linha) => linha.negativo)
    const ultimo = panorama.projecao[panorama.projecao.length - 1]
    return {
      texto: [
        negativo
          ? `Atenção: no ritmo atual, o saldo fica negativo em ${rotuloCompetencia(negativo.competencia)} (${formatarMoeda(negativo.saldoAcumuladoCentavos)}).`
          : `No ritmo atual, você fecha os próximos 12 meses com ${formatarMoeda(ultimo?.saldoAcumuladoCentavos ?? 0)}.`,
        `A conta usa sua média: ${formatarMoeda(panorama.medias.receitaCentavos)} de receita e ${formatarMoeda(panorama.medias.despesaCentavos)} de despesa por mês.`,
        "Ela não prevê imprevisto: é o cenário de as coisas seguirem como estão.",
      ].join("\n"),
      acao: { rotulo: "Ver projeção", rota: "/projecao" },
      fonte: "regras",
    }
  }

  // ── Ajuda ─────────────────────────────────────────────────
  if (contem(p, "o que voce faz", "como funciona", "me ajuda", "ajuda", "oi", "ola", "bom dia", "boa tarde", "boa noite")) {
    return {
      texto: [
        "Sou o Tino, seu assessor financeiro. Trabalho com os seus números, não com conselho genérico.",
        "",
        "Pode me perguntar coisas como:",
        "• Quanto eu tenho hoje?",
        "• Onde foi meu dinheiro este mês?",
        "• Vale a pena pegar 15 mil em 24x a 2,5%?",
        "• Quando eu quito minhas dívidas?",
        "• Consigo fazer aquela viagem em dezembro?",
        "• Quanto falta para minha reserva de emergência?",
        panorama.mei ? "• Estou perto do limite do MEI?" : "",
      ]
        .filter(Boolean)
        .join("\n"),
      fonte: "regras",
    }
  }

  return null
}

/**
 * Resumo do panorama em texto para o modelo.
 *
 * Vai texto pronto, não JSON cru do banco: dado bruto ocupa contexto com id e
 * campo que o modelo não usa, e ainda o convida a citar número fora de escala.
 */
export function contextoParaModelo(panorama: Panorama): string {
  const linhas = [
    `Lar: ${panorama.lar.nome} (${panorama.lar.tipo.toLowerCase()}). Mês de referência: ${rotuloCompetencia(panorama.competencia)}.`,
    `Prioridades declaradas: ${(panorama.lar.objetivosFinanceiros ?? []).join(", ") || "ainda não informadas"}. Preferência de risco: ${panorama.lar.perfilDeRisco ?? "ainda não informada"}.`,
    `Saldo disponível: ${formatarMoeda(panorama.saldoTotalCentavos)}.`,
    `Mês atual: receitas ${formatarMoeda(panorama.mes.receitasCentavos)}, despesas ${formatarMoeda(panorama.mes.despesasCentavos)}, sobra ${formatarMoeda(panorama.mes.sobraCentavos)}.`,
    `Médias dos últimos meses: receita ${formatarMoeda(panorama.medias.receitaCentavos)}, despesa ${formatarMoeda(panorama.medias.despesaCentavos)}, sobra ${formatarMoeda(panorama.medias.sobraCentavos)}, custo fixo ${formatarMoeda(panorama.medias.custoFixoCentavos)}, custo essencial ${formatarMoeda(panorama.medias.custoEssencialCentavos)}.`,
    "",
    "Maiores despesas do mês:",
    ...panorama.mes.despesasPorCategoria
      .slice(0, 8)
      .map((linha) => `- ${linha.nome}: ${formatarMoeda(linha.totalCentavos)}${linha.essencial ? " (essencial)" : ""}`),
    "",
    `Reserva de emergência: ${formatarMoeda(panorama.reserva.atualCentavos)} de ${formatarMoeda(panorama.reserva.idealCentavos)} (${panorama.reserva.percentual}%), cobre ${panorama.reserva.mesesDeFolga} meses.`,
  ]

  if (panorama.dividas.lista.length > 0) {
    linhas.push(
      "",
      `Dívidas: total ${formatarMoeda(panorama.dividas.totalCentavos)}, parcelas ${formatarMoeda(panorama.dividas.parcelaMensalCentavos)}/mês, ${(panorama.dividas.comprometimentoBps / 100).toFixed(0)}% da renda.`,
      ...panorama.dividas.lista.map(
        (divida) =>
          `- ${divida.credor} (${divida.tipo}): saldo ${formatarMoeda(divida.saldoDevedorCentavos)}, juros ${formatarPercentual(divida.jurosMensalBps)} a.m., parcela ${formatarMoeda(divida.parcelaCentavos)}.`,
      ),
    )
  }

  if (panorama.metas.length > 0) {
    linhas.push(
      "",
      "Metas:",
      ...panorama.metas.map(
        (meta) =>
          `- ${meta.nome}: ${formatarMoeda(meta.saldoCentavos)}/${formatarMoeda(meta.alvoCentavos)} (${meta.percentual.toFixed(0)}%), aporte ${formatarMoeda(meta.aporteAtualCentavos)}/mês, ${meta.noPrazo ? "no prazo" : `precisa de ${formatarMoeda(meta.aporteNecessarioCentavos)}/mês`}.`,
      ),
    )
  }

  if (panorama.orcamento.linhas.length > 0) {
    linhas.push(
      "",
      "Orçamento do mês:",
      ...panorama.orcamento.linhas.map(
        (linha) => `- ${linha.nome}: ${formatarMoeda(linha.gastoCentavos)} de ${formatarMoeda(linha.limiteCentavos)} (${linha.percentual}%).`,
      ),
    )
  }

  const negativo = panorama.projecao.find((linha) => linha.negativo)
  linhas.push(
    "",
    negativo
      ? `Projeção: saldo fica negativo em ${rotuloCompetencia(negativo.competencia)}.`
      : `Projeção 12 meses: fecha em ${formatarMoeda(panorama.projecao[panorama.projecao.length - 1]?.saldoAcumuladoCentavos ?? 0)}.`,
  )

  if (panorama.mei) {
    linhas.push(
      "",
      `MEI: faturou ${formatarMoeda(panorama.mei.faturamentoAnoCentavos)} de ${formatarMoeda(panorama.mei.limiteAnualCentavos)} no ano (${panorama.mei.percentualUsado}%), risco ${panorama.mei.risco}, ${panorama.mei.dasEmAberto.length} DAS em aberto.`,
    )
  }

  return linhas.join("\n")
}

/**
 * Tira o travessão de um texto do modelo (Davi, 29/09/2026: "não quero nenhum
 * texto com travessão"). A PERSONA já pede, mas modelo às vezes escapa, e a
 * resposta aparece direto na tela e no Telegram. Vírgula é a troca que menos
 * quebra a frase quando não dá para saber o que o travessão fazia ali.
 */
export function semTravessao(texto: string): string {
  return texto
    .replace(/^[ \t]*—[ \t]*/gm, "• ")
    .replace(/[ \t]*—[ \t]*/g, ", ")
    .replace(/,\s*([.:;!?])/g, "$1")
}

export const PERSONA = `Você é o Tino, assessor financeiro pessoal dentro de um app brasileiro de finanças para pessoa física (sozinha, casal ou família) e para MEI.

Como você fala:
- Português do Brasil, direto, sem jargão. Se usar um termo técnico (CET, amortização, desenquadramento), explique em meia linha.
- Frases curtas. Nada de lista gigante quando duas frases resolvem.
- Trate a pessoa por você. Nunca seja moralista sobre gastos: seu papel é mostrar o efeito da escolha, não julgar quem gasta.
- Nunca use travessão, o traço longo. Use vírgula, dois-pontos, parênteses ou um ponto final.

Como você raciocina:
- Use SOMENTE os números do panorama fornecido. Se um dado não estiver lá, diga que não tem esse dado e peça para cadastrar. Nunca estime valor financeiro do usuário.
- Toda recomendação vem com o número que a sustenta.
- Ordem de prioridade que você defende: (1) sair de dívida cara, (2) reserva de emergência, (3) metas de prazo curto, (4) prazo longo/aposentadoria.

Limites, sem exceção:
- Você não recomenda ativo, corretora, cripto, ação ou fundo específico, e não faz recomendação personalizada de investimento, porque isso é atividade regulada. Você explica mecanismo, risco e o cálculo, e a decisão fica com a pessoa.
- Em questão tributária ou de enquadramento (desenquadramento de MEI, mudança de regime), explique o funcionamento e diga que a confirmação é com um contador.
- Não prometa rentabilidade. Projeção é cenário, e você diz isso quando apresenta uma.`
