import { prisma } from "@/lib/prisma"

/**
 * Fluxo de caixa ao longo do tempo.
 *
 * A pergunta que isto responde é uma só, dita pelo Davi em 13/09: "baseado no
 * que está entrando e vai entrar, e no que saiu e vai sair, quando é que meu
 * caixa fica assim ao longo do tempo?". Não é o gráfico de receita contra
 * despesa que já existia no início — aquele mostra o mês, não o saldo.
 *
 * Três decisões que valem a pena estar escritas:
 *
 * 1. **Tudo vem de lançamento com data real.** Receita e despesa saem de
 *    `Transacao.data` (paga ou não — não paga com data futura é justamente o
 *    "vai sair"), e a parcela de cartão sai de `ParcelaCompra.vencimento`.
 *    Nada aqui é média espalhada por dia: média mensal dividida por 30 desenha
 *    uma linha bonita que não corresponde a nenhum dia do calendário.
 *
 * 2. **A linha do caixa passa pelo saldo de hoje.** O acumulado não começa em
 *    zero à esquerda do gráfico: o ponto de hoje tem que ser o saldo que a
 *    pessoa vê no topo da tela, senão o gráfico contradiz o resto do app. Para
 *    isso o início da janela é calculado para trás — saldo de hoje menos tudo
 *    que já aconteceu dentro da janela.
 *
 * 3. **Passado e futuro são marcados.** `futuro: true` diz ao gráfico o que é
 *    previsão. Desenhar os dois com o mesmo traço é prometer certeza sobre o
 *    que ainda não aconteceu.
 */

export type Granularidade = "dia" | "mes" | "ano"

export interface PontoFluxo {
  /** Chave estável do período (YYYY-MM-DD, YYYY-MM ou YYYY). */
  chave: string
  rotulo: string
  entrouCentavos: number
  saiuCentavos: number
  /** Saldo acumulado no fim do período. */
  caixaCentavos: number
  futuro: boolean
  /** Último ponto realizado. O gráfico começa a linha pontilhada nele, senão
   *  sobra um buraco entre o que aconteceu e o que está previsto. */
  viradaDoFuturo?: boolean
}

/** Quantos períodos para trás e para frente em cada granularidade. */
const JANELA: Record<Granularidade, { atras: number; frente: number }> = {
  dia: { atras: 15, frente: 15 },
  mes: { atras: 6, frente: 6 },
  // Um ano a frente, nao tres: a projecao do app vai ate 12 meses. Desenhar
  // 2028 e 2029 dava linha reta ate o fim do grafico, que le como "nada vai
  // acontecer" quando o certo e "nao sabemos".
  ano: { atras: 2, frente: 1 },
}

function soData(data: Date) {
  return new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate()))
}

function chaveDe(data: Date, granularidade: Granularidade) {
  const ano = data.getUTCFullYear()
  const mes = String(data.getUTCMonth() + 1).padStart(2, "0")
  const dia = String(data.getUTCDate()).padStart(2, "0")
  if (granularidade === "ano") return String(ano)
  if (granularidade === "mes") return `${ano}-${mes}`
  return `${ano}-${mes}-${dia}`
}

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]

function rotuloDe(chave: string, granularidade: Granularidade) {
  if (granularidade === "ano") return chave
  const [ano, mes, dia] = chave.split("-")
  if (granularidade === "mes") return `${MESES[Number(mes) - 1]}/${ano.slice(2)}`
  return `${dia}/${mes}`
}

/** Períodos da janela, do mais antigo ao mais novo, incluindo o de hoje. */
function periodos(hoje: Date, granularidade: Granularidade) {
  const { atras, frente } = JANELA[granularidade]
  const lista: string[] = []
  for (let passo = -atras; passo <= frente; passo++) {
    const data = new Date(hoje)
    if (granularidade === "dia") data.setUTCDate(data.getUTCDate() + passo)
    if (granularidade === "mes") data.setUTCMonth(data.getUTCMonth() + passo, 1)
    if (granularidade === "ano") data.setUTCFullYear(data.getUTCFullYear() + passo, 0, 1)
    lista.push(chaveDe(data, granularidade))
  }
  return lista
}

interface Movimento {
  data: Date
  entrouCentavos: number
  saiuCentavos: number
}

/** Uma linha da projecao mensal que o app ja calcula (medias + recorrencias + parcelas). */
export interface MesProjetado {
  competencia: string
  receitasCentavos: number
  despesasCentavos: number
  parcelasCentavos: number
}

export async function montarFluxoDeCaixa(
  larId: string,
  saldoAtualCentavos: number,
  projecao: MesProjetado[] = [],
) {
  const hoje = soData(new Date())

  // Uma consulta só cobre as três granularidades: a janela mais larga é a de
  // anos. Buscar três vezes o mesmo intervalo custaria três viagens ao banco
  // para montar a mesma tela.
  const inicio = new Date(Date.UTC(hoje.getUTCFullYear() - JANELA.ano.atras, 0, 1))
  const fim = new Date(Date.UTC(hoje.getUTCFullYear() + JANELA.ano.frente, 11, 31))

  const [transacoes, parcelas] = await Promise.all([
    prisma.transacao.findMany({
      where: { larId, tipo: { in: ["RECEITA", "DESPESA"] }, data: { gte: inicio, lte: fim } },
      select: { data: true, tipo: true, valorCentavos: true },
    }),
    // Parcela de cartão não é transação: ela só vira lançamento quando a
    // fatura é paga. Ignorá-la aqui esconderia justamente a saída já
    // contratada, que é o que faz o caixa furar mais adiante.
    prisma.parcelaCompra.findMany({
      where: { paga: false, vencimento: { gte: inicio, lte: fim }, parcelamento: { ativo: true, larId } },
      select: { vencimento: true, valorCentavos: true },
    }),
  ])

  const movimentos: Movimento[] = [
    ...transacoes.map((linha) => ({
      data: soData(linha.data),
      entrouCentavos: linha.tipo === "RECEITA" ? linha.valorCentavos : 0,
      saiuCentavos: linha.tipo === "DESPESA" ? linha.valorCentavos : 0,
    })),
    ...parcelas.map((linha) => ({
      data: soData(linha.vencimento),
      entrouCentavos: 0,
      saiuCentavos: linha.valorCentavos,
    })),
  ]

  const series = {} as Record<Granularidade, PontoFluxo[]>

  for (const granularidade of ["dia", "mes", "ano"] as Granularidade[]) {
    const chaves = periodos(hoje, granularidade)
    const chaveDeHoje = chaveDe(hoje, granularidade)
    const dentro = new Map(chaves.map((chave) => [chave, { entrouCentavos: 0, saiuCentavos: 0 }]))

    for (const movimento of movimentos) {
      const chave = chaveDe(movimento.data, granularidade)
      const acumulador = dentro.get(chave)
      if (!acumulador) continue
      // Mes e ano no futuro nao somam lancamento datado: quem manda ali e a
      // projecao mensal, logo abaixo. Somar os dois contaria a mesma parcela
      // duas vezes -- uma pelo vencimento, outra dentro de `parcelasCentavos`.
      if (granularidade !== "dia" && projecao.length && chave > chaveDeHoje) continue
      acumulador.entrouCentavos += movimento.entrouCentavos
      acumulador.saiuCentavos += movimento.saiuCentavos
    }

    // Futuro de mes e ano vem da MESMA projecao que alimenta "fecha o ano em"
    // e o aviso de caixa negativo. Sem isso a tela mostrava dois numeros
    // diferentes para a mesma pergunta: a projecao contava media e
    // recorrencia, e o grafico so o que ja tinha data marcada.
    if (granularidade !== "dia") {
      for (const mes of projecao) {
        const chave = granularidade === "ano" ? mes.competencia.slice(0, 4) : mes.competencia
        const acumulador = dentro.get(chave)
        if (!acumulador || chave <= chaveDeHoje) continue
        acumulador.entrouCentavos += mes.receitasCentavos
        acumulador.saiuCentavos += mes.despesasCentavos + mes.parcelasCentavos
      }
    }

    // Saldo no começo da janela: o de hoje, desfazendo o que já aconteceu
    // dentro dela. Assim o ponto de hoje bate com o saldo que a pessoa lê no
    // topo do painel, em vez de uma curva que só coincide por acaso.
    let caixa = saldoAtualCentavos
    for (const chave of chaves) {
      if (chave > chaveDeHoje) break
      const periodo = dentro.get(chave)!
      caixa -= periodo.entrouCentavos - periodo.saiuCentavos
    }

    series[granularidade] = chaves.map((chave) => {
      const periodo = dentro.get(chave)!
      caixa += periodo.entrouCentavos - periodo.saiuCentavos
      return {
        chave,
        rotulo: rotuloDe(chave, granularidade),
        entrouCentavos: periodo.entrouCentavos,
        saiuCentavos: periodo.saiuCentavos,
        caixaCentavos: caixa,
        futuro: chave > chaveDeHoje,
      }
    })
  }

  for (const granularidade of ["dia", "mes", "ano"] as Granularidade[]) {
    const serie = series[granularidade]
    const ultimoRealizado = serie.reduce((indice, ponto, atual) => (ponto.futuro ? indice : atual), -1)
    if (ultimoRealizado >= 0) serie[ultimoRealizado].viradaDoFuturo = true
  }

  return series
}

export type SeriesFluxo = Awaited<ReturnType<typeof montarFluxoDeCaixa>>
