/**
 * Divisão de gastos entre duas pessoas.
 *
 * O Tino não decide como um casal divide dinheiro — ele aplica a regra que as
 * duas pessoas combinaram e mostra a conta. As três formas abaixo são as que o
 * Davi listou como as que existem na vida real, e a quarta existe porque casal
 * nenhum cabe em três opções.
 *
 * **A divisão é por categoria.** Mercado pode ser metade a metade e aluguel
 * proporcional à renda no mesmo mês: é assim que as pessoas realmente
 * combinam, e uma regra única para o lar inteiro obrigaria a mentir em alguma
 * linha.
 *
 * **Mesada é limite, não transferência.** É um teto imaginário de gasto
 * individual, para a pessoa saber quando passou do combinado. Nenhum dinheiro
 * muda de conta por causa dela.
 *
 * **O acerto é mensal.** O mês fecha, a conta aparece, e quem ficou devendo
 * paga. Não há saldo rolando entre as duas pessoas.
 */

export type ModalidadeCasal = "METADE" | "PROPORCIONAL" | "MESADA" | "PERSONALIZADA"

export interface PessoaDoCasal {
  id: string
  nome: string
  /// Renda mensal, usada na divisão proporcional.
  rendaCentavos: number
  /// Teto de gasto individual combinado. Zero quando não usam mesada.
  mesadaCentavos: number
  /// Quanto esta pessoa já pagou do gasto comum no mês.
  pagouCentavos: number
  /// Percentual combinado à mão, em pontos-base. Só na modalidade personalizada.
  quotaBps?: number
}

export interface ParteDoCasal {
  id: string
  nome: string
  /// Quanto caberia a esta pessoa pelo combinado.
  deviaCentavos: number
  pagouCentavos: number
  /// Positivo: pagou a mais e tem a receber. Negativo: deve.
  diferencaCentavos: number
}

export interface AcertoDoCasal {
  totalCentavos: number
  partes: ParteDoCasal[]
  /// Quem paga quem, no fim do mês. `null` quando já está quitado.
  acerto: { deId: string; paraId: string; valorCentavos: number } | null
}

/**
 * Como um gasto comum se divide, e quem acerta com quem no fim do mês.
 *
 * `MESADA` divide o comum igual: a mesada não muda a conta do que é do casal,
 * ela só limita o que cada um gasta por fora. Tratá-la como desconto aqui
 * misturaria as duas coisas e faria a pessoa de mesada maior pagar menos do
 * pote comum, que não é o combinado.
 */
export function dividirEntreCasal(
  totalCentavos: number,
  modalidade: ModalidadeCasal,
  pessoas: PessoaDoCasal[],
): AcertoDoCasal {
  const total = Math.max(0, Math.round(totalCentavos))
  const devidos = quotas(total, modalidade, pessoas)

  const partes: ParteDoCasal[] = pessoas.map((pessoa, indice) => ({
    id: pessoa.id,
    nome: pessoa.nome,
    deviaCentavos: devidos[indice],
    pagouCentavos: pessoa.pagouCentavos,
    diferencaCentavos: pessoa.pagouCentavos - devidos[indice],
  }))

  return { totalCentavos: total, partes, acerto: acertoEntre(partes) }
}

function quotas(total: number, modalidade: ModalidadeCasal, pessoas: PessoaDoCasal[]): number[] {
  if (pessoas.length === 0) return []

  if (modalidade === "PROPORCIONAL") {
    const rendaTotal = pessoas.reduce((soma, pessoa) => soma + Math.max(0, pessoa.rendaCentavos), 0)
    // Sem renda cadastrada a proporcional não tem como existir; cair no meio a
    // meio é melhor do que dividir por zero e mostrar NaN para a pessoa.
    if (rendaTotal > 0) return repartir(total, pessoas.map((pessoa) => Math.max(0, pessoa.rendaCentavos)))
  }

  if (modalidade === "PERSONALIZADA") {
    const pesos = pessoas.map((pessoa) => Math.max(0, pessoa.quotaBps ?? 0))
    if (pesos.reduce((soma, peso) => soma + peso, 0) > 0) return repartir(total, pesos)
  }

  return repartir(total, pessoas.map(() => 1))
}

/** Reparte sem perder centavo: o resto vai de um em um, só a quem tem peso. */
function repartir(total: number, pesos: number[]): number[] {
  const soma = pesos.reduce((acumulado, peso) => acumulado + peso, 0)
  if (soma <= 0) return pesos.map(() => 0)

  const bruto = pesos.map((peso) => Math.floor((total * peso) / soma))
  let resto = total - bruto.reduce((acumulado, valor) => acumulado + valor, 0)
  const comPeso = pesos.map((peso, indice) => (peso > 0 ? indice : -1)).filter((indice) => indice >= 0)
  for (let i = 0; resto > 0; i = (i + 1) % comPeso.length) {
    bruto[comPeso[i]] += 1
    resto -= 1
  }
  return bruto
}

/**
 * Um pagamento só fecha o mês entre duas pessoas.
 *
 * Com mais de duas, devolve o maior devedor pagando o maior credor — resolve a
 * maior parte e não inventa uma corrente de transferências que ninguém pediu.
 */
function acertoEntre(partes: ParteDoCasal[]): AcertoDoCasal["acerto"] {
  const devedor = [...partes].sort((a, b) => a.diferencaCentavos - b.diferencaCentavos)[0]
  const credor = [...partes].sort((a, b) => b.diferencaCentavos - a.diferencaCentavos)[0]
  if (!devedor || !credor || devedor.id === credor.id) return null

  const valor = Math.min(-devedor.diferencaCentavos, credor.diferencaCentavos)
  if (valor <= 0) return null
  return { deId: devedor.id, paraId: credor.id, valorCentavos: valor }
}

/** Quanto sobrou da mesada de cada um. Negativo quer dizer que passou. */
export function sobraDaMesada(pessoa: { mesadaCentavos: number }, gastoIndividualCentavos: number): number {
  return pessoa.mesadaCentavos - Math.max(0, gastoIndividualCentavos)
}
