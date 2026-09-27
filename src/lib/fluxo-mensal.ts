import { competenciaMaisMeses } from "@/lib/datas"

/**
 * Fluxo de caixa mês a mês, do jeito que a pessoa faz a conta de cabeça
 * (Davi, 27/09): "tenho R$ 5 mil na conta, ainda entra o salário de R$ 4 mil,
 * saem R$ 6 mil de cartão, contas fixas e gasto do dia a dia — sobram R$ 3
 * mil". Cada mês começa com o que o anterior terminou.
 *
 * Diferenças para a projeção antiga, que respondia outra pergunta:
 *
 * - O mês corrente entra, só com o que ainda falta acontecer nele. A antiga
 *   começava no mês seguinte e o salário que ainda ia cair sumia.
 * - O cartão sai no mês em que a fatura VENCE, com o valor dela: o que já foi
 *   comprado mais as parcelas daquela fatura. A média do cartão só completa a
 *   fatura que ainda está aberta e nunca a reduz.
 * - Cada linha tem uma chave, e a pessoa pode tirar qualquer uma do fluxo — a
 *   Poupança que ela não quer contar como dinheiro do mês, uma entrada que não
 *   é garantida.
 *
 * Tudo aqui é conta pura sobre números já levantados; quem busca no banco é
 * `montarDadosDoFluxo`. Assim a regra tem teste sem banco.
 */

export interface ContaDoFluxo { id: string; nome: string; saldoCentavos: number }
export interface RecorrenciaDoFluxo {
  id: string
  descricao: string
  tipo: "RECEITA" | "DESPESA"
  valorCentavos: number
  periodicidade: string
  /// "AAAA-MM-DD" da próxima ocorrência ainda não lançada.
  proximaData: string
}
export interface EntradaDetectada {
  /// A descrição normalizada: é a identidade da entrada, já que ela não tem
  /// cadastro próprio.
  chave: string
  descricao: string
  valorCentavos: number
  dia: number
  jaRecebidaNoMes: boolean
}
export interface FaturaDoFluxo {
  cartaoId: string
  cartao: string
  competencia: string
  /// "AAAA-MM-DD". Sem dia cadastrado no cartão, é o último dia do mês e
  /// `semVencimento` avisa — a fatura entra no mês, mas sem dia inventado.
  venceEm: string
  semVencimento?: boolean
  fechada: boolean
  comprasConhecidasCentavos: number
  parcelasCentavos: number
  /// Média mensal de compras à vista do cartão, para completar a fatura aberta.
  mediaComprasCentavos: number
}
export interface DadosDoFluxo {
  hoje: string
  meses: number
  fora: string[]
  contas: ContaDoFluxo[]
  recorrencias: RecorrenciaDoFluxo[]
  entradasDetectadas: EntradaDetectada[]
  outrasEntradasMediaCentavos: number
  outrasEntradasNoMesCentavos: number
  gastoVariavelMedioCentavos: number
  gastoVariavelNoMesCentavos: number
  faturas: FaturaDoFluxo[]
  /// Parcela de cada dívida em aberto e o dia em que vence.
  dividas: { centavos: number; dia: number }[]
  dividasPagasNoMesCentavos: number
}

export interface ItemDoFluxo {
  chave: string
  rotulo: string
  detalhe: string
  tipo: "ENTRADA" | "SAIDA"
  centavos: number
  /// Veio de média, não de valor conhecido. A tela diz isso ao lado.
  estimado: boolean
  fora: boolean
}
export interface MesDoFluxo {
  competencia: string
  comecaCentavos: number
  entraCentavos: number
  saiCentavos: number
  terminaCentavos: number
  itens: ItemDoFluxo[]
}

const PASSO: Record<string, number> = { MENSAL: 1, BIMESTRAL: 2, TRIMESTRAL: 3, SEMESTRAL: 6, ANUAL: 12 }
const competenciaDe = (iso: string) => iso.slice(0, 7)
const dia = (iso: string) => Number(iso.slice(8, 10))
const diasNoMesDe = (iso: string) => new Date(Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)), 0)).getUTCDate()

/** Meses entre duas competências "AAAA-MM" (b − a). */
function mesesEntre(a: string, b: string) {
  return (Number(b.slice(0, 4)) - Number(a.slice(0, 4))) * 12 + Number(b.slice(5, 7)) - Number(a.slice(5, 7))
}

/**
 * A recorrência cai neste mês pelo calendário dela? Conta a partir da
 * próxima ocorrência, de passo em passo, e nunca antes do mês corrente.
 */
function ocorreEm(recorrencia: RecorrenciaDoFluxo, competencia: string) {
  const distancia = mesesEntre(competenciaDe(recorrencia.proximaData), competencia)
  return distancia >= 0 && distancia % (PASSO[recorrencia.periodicidade] ?? 1) === 0
}

/**
 * Ocorrência de um mês que já passou e não foi lançada: está atrasada e ainda
 * vai sair. Entra no mês corrente, além da ocorrência normal dele.
 */
const atrasada = (recorrencia: RecorrenciaDoFluxo, atual: string) => competenciaDe(recorrencia.proximaData) < atual

export function montarFluxoMensal(dados: DadosDoFluxo): MesDoFluxo[] {
  const fora = new Set(dados.fora)
  const atual = competenciaDe(dados.hoje)
  const meses: MesDoFluxo[] = []
  let caixa = dados.contas.reduce((soma, conta) => (fora.has(`conta:${conta.id}`) ? soma : soma + conta.saldoCentavos), 0)

  for (let indice = 0; indice < dados.meses; indice += 1) {
    const competencia = competenciaMaisMeses(atual, indice)
    const corrente = indice === 0
    const itens: ItemDoFluxo[] = []
    const incluir = (item: Omit<ItemDoFluxo, "fora">) => { if (item.centavos > 0) itens.push({ ...item, fora: fora.has(item.chave) }) }
    const recorrenciasDoMes = (tipo: RecorrenciaDoFluxo["tipo"], lado: ItemDoFluxo["tipo"]) => {
      for (const recorrencia of dados.recorrencias.filter((linha) => linha.tipo === tipo)) {
        if (corrente && atrasada(recorrencia, atual)) {
          incluir({ chave: `recorrencia:${recorrencia.id}`, rotulo: recorrencia.descricao, detalhe: `atrasada desde ${dia(recorrencia.proximaData)}/${recorrencia.proximaData.slice(5, 7)}`, tipo: lado, centavos: recorrencia.valorCentavos, estimado: false })
        }
        if (ocorreEm(recorrencia, competencia)) {
          const dataDoMes = `${competencia}-${recorrencia.proximaData.slice(8, 10)}`
          incluir({ chave: `recorrencia:${recorrencia.id}`, rotulo: recorrencia.descricao, detalhe: corrente && dataDoMes < dados.hoje ? "venceu, falta lançar" : `dia ${dia(recorrencia.proximaData)}`, tipo: lado, centavos: recorrencia.valorCentavos, estimado: false })
        }
      }
    }

    // ── Entradas ──────────────────────────────────────────
    recorrenciasDoMes("RECEITA", "ENTRADA")
    for (const entrada of dados.entradasDetectadas) {
      if (corrente && entrada.jaRecebidaNoMes) continue
      incluir({ chave: `detectada:${entrada.chave}`, rotulo: entrada.descricao, detalhe: "todo mês no seu histórico", tipo: "ENTRADA", centavos: entrada.valorCentavos, estimado: true })
    }
    // Entrada solta (freela, reembolso) não tem dia: no mês corrente, conta só
    // a fração do mês que falta, e nunca mais que o que a média ainda espera.
    // A média inteira nos últimos três dias do mês era dinheiro de mentira.
    const restoDoMes = (diasNoMesDe(dados.hoje) - dia(dados.hoje) + 1) / diasNoMesDe(dados.hoje)
    const outrasNoMes = Math.min(Math.max(0, dados.outrasEntradasMediaCentavos - dados.outrasEntradasNoMesCentavos), Math.round((dados.outrasEntradasMediaCentavos * restoDoMes) / 100) * 100)
    incluir({ chave: "outras-entradas", rotulo: "Outras entradas", detalhe: "pela média", tipo: "ENTRADA", centavos: corrente ? outrasNoMes : dados.outrasEntradasMediaCentavos, estimado: true })

    // ── Saídas ────────────────────────────────────────────
    for (const fatura of dados.faturas.filter((linha) => competenciaDe(linha.venceEm) === competencia && linha.venceEm >= dados.hoje)) {
      const compras = fatura.fechada ? fatura.comprasConhecidasCentavos : Math.max(fatura.comprasConhecidasCentavos, fatura.mediaComprasCentavos)
      incluir({ chave: `cartao:${fatura.cartaoId}`, rotulo: `Fatura ${fatura.cartao}`, detalhe: fatura.semVencimento ? "sem vencimento cadastrado" : `vence dia ${dia(fatura.venceEm)}`, tipo: "SAIDA", centavos: compras + fatura.parcelasCentavos, estimado: compras > fatura.comprasConhecidasCentavos })
    }
    recorrenciasDoMes("DESPESA", "SAIDA")
    // No mês corrente, só a parcela que ainda vai vencer. A que venceu antes
    // de hoje, se foi paga fora do app, não deixou rastro: contá-la de novo
    // cobraria a mesma parcela duas vezes.
    const parcelasDoMes = dados.dividas.filter((divida) => !corrente || divida.dia >= dia(dados.hoje)).reduce((soma, divida) => soma + divida.centavos, 0)
    incluir({ chave: "dividas", rotulo: "Parcelas de dívidas", detalhe: "valor contratado", tipo: "SAIDA", centavos: corrente ? Math.max(0, parcelasDoMes - dados.dividasPagasNoMesCentavos) : parcelasDoMes, estimado: false })
    incluir({ chave: "gasto-variavel", rotulo: "Gasto fora do cartão", detalhe: "pela média", tipo: "SAIDA", centavos: corrente ? Math.max(0, dados.gastoVariavelMedioCentavos - dados.gastoVariavelNoMesCentavos) : dados.gastoVariavelMedioCentavos, estimado: true })

    const conta = (tipo: ItemDoFluxo["tipo"]) => itens.filter((item) => item.tipo === tipo && !item.fora).reduce((soma, item) => soma + item.centavos, 0)
    const entra = conta("ENTRADA")
    const sai = conta("SAIDA")
    meses.push({ competencia, comecaCentavos: caixa, entraCentavos: entra, saiCentavos: sai, terminaCentavos: caixa + entra - sai, itens })
    caixa += entra - sai
  }
  return meses
}
