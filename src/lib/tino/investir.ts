/**
 * Planejamento de longo prazo.
 *
 * **Isto é calculadora, não recomendação.** O app aplica métodos públicos de
 * terceiros sobre o dinheiro que a pessoa já tem, e mostra a conta. Dizer a
 * alguém onde investir é atividade de consultor de valores mobiliários, que no
 * Brasil exige registro na CVM — e o Tino não tem, nem pretende ter.
 *
 * A diferença está na frase: "o método divide em quatro partes; com os R$ 1.000
 * que sobram no seu mês, daria R$ 250 em cada" é aritmética. "Invista R$ 250 em
 * ações" é recomendação. Todo texto desta área precisa ficar do primeiro lado.
 *
 * Os métodos citados têm autor, e o autor aparece na tela. Nenhum deles é do
 * Tino, e nenhum é garantia de resultado.
 */

import { ratear, ratearPorPeso } from "@/lib/dinheiro"

// ============================================================
// Divisão da renda
// ============================================================

export type NomeDaFatia = "necessidades" | "lazer" | "educacao" | "longoPrazo" | "reserva"

export interface Fatia {
  nome: NomeDaFatia
  rotulo: string
  /// Pontos-base da renda. 6000 = 60%.
  percentualBps: number
  valorCentavos: number
  explicacao: string
}

/**
 * Divisão de referência da renda.
 *
 * Percentuais divulgados pelo Grão (Grupo Primo) em material educativo:
 * 60% necessidades básicas, 10% lazer, 10% educação, 15% longo prazo e 5%
 * reserva de emergência.
 *
 * É referência, não regra: quem mora em capital cara estoura os 60% sem estar
 * errado. Serve para comparar com o gasto real e enxergar a distância, que é
 * o que a tela mostra.
 */
export const DIVISAO_REFERENCIA: { nome: NomeDaFatia; rotulo: string; percentualBps: number; explicacao: string }[] = [
  {
    nome: "necessidades",
    rotulo: "Necessidades básicas",
    percentualBps: 6000,
    explicacao: "Moradia, alimentação e contas fixas.",
  },
  { nome: "lazer", rotulo: "Lazer", percentualBps: 1000, explicacao: "Restaurante, cinema, passeio." },
  { nome: "educacao", rotulo: "Educação", percentualBps: 1000, explicacao: "Curso, livro, formação." },
  {
    nome: "longoPrazo",
    rotulo: "Longo prazo",
    percentualBps: 1500,
    explicacao: "Aposentadoria e projetos de anos, não de meses.",
  },
  {
    nome: "reserva",
    rotulo: "Reserva de emergência",
    percentualBps: 500,
    explicacao: "O colchão que evita recorrer ao cartão quando algo quebra.",
  },
]

/**
 * Aplica a divisão de referência sobre a renda.
 *
 * `ratear` garante que a soma das fatias devolva a renda exata: dividir com
 * arredondamento independente some ou inventa centavos, e numa tela de
 * planejamento isso vira a pergunta "por que não fecha".
 */
export function dividirRenda(rendaCentavos: number): Fatia[] {
  if (rendaCentavos <= 0) {
    return DIVISAO_REFERENCIA.map((base) => ({ ...base, valorCentavos: 0 }))
  }

  // As fatias têm pesos diferentes, então a divisão é por peso e a sobra de
  // arredondamento vai para a maior — que absorve o centavo sem mudar de
  // percentual visível. Sem isso a soma das partes não devolve a renda, e a
  // tela passa a ter de explicar por que não fecha.
  const brutos = DIVISAO_REFERENCIA.map((base) => Math.floor((rendaCentavos * base.percentualBps) / 10_000))
  const sobra = rendaCentavos - brutos.reduce((soma, valor) => soma + valor, 0)

  const maior = brutos.indexOf(Math.max(...brutos))

  return DIVISAO_REFERENCIA.map((base, indice) => ({
    ...base,
    valorCentavos: brutos[indice] + (indice === maior ? sobra : 0),
  }))
}

// ============================================================
// ARCA
// ============================================================

export type LetraDoArca = "A" | "R" | "C" | "A2"

export interface ParteDoArca {
  letra: string
  rotulo: string
  valorCentavos: number
  explicacao: string
}

/**
 * ARCA, método divulgado por Thiago Nigro.
 *
 * Quatro classes em partes iguais — Ações, Real estate (fundos imobiliários),
 * Caixa (renda fixa e liquidez) e Ativos internacionais — reequilibradas pelo
 * aporte: em vez de vender o que subiu, aporta-se no que ficou para trás.
 *
 * O Tino não escolhe ativo, não indica corretora e não opina sobre o método.
 * Divide o valor por quatro e mostra a conta.
 */
export const PARTES_DO_ARCA: { letra: string; rotulo: string; explicacao: string }[] = [
  { letra: "A", rotulo: "Ações", explicacao: "Empresas listadas em bolsa." },
  { letra: "R", rotulo: "Real estate", explicacao: "Fundos imobiliários." },
  { letra: "C", rotulo: "Caixa", explicacao: "Renda fixa e o que tem liquidez." },
  { letra: "A", rotulo: "Ativos internacionais", explicacao: "O que é cotado fora do país." },
]

export function dividirPorArca(valorCentavos: number): ParteDoArca[] {
  const partes = ratear(Math.max(0, valorCentavos), PARTES_DO_ARCA.length)
  return PARTES_DO_ARCA.map((base, indice) => ({ ...base, valorCentavos: partes[indice] }))
}


// ------------------------------------------------------------
// ARCA com o que a pessoa já tem
// ------------------------------------------------------------

/**
 * As classes que o app reconhece numa carteira.
 *
 * `RENDA_FIXA` e `CAIXA` são a mesma letra do método (o C), mas não a mesma
 * coisa para quem investe: um CDB de dois anos e o dinheiro na conta rendendo
 * 100% do CDI cumprem o mesmo papel na divisão e papéis diferentes na vida.
 * Ficam separadas na carteira e somam juntas no C.
 */
export type ClasseDeAtivo = "ACOES" | "FII" | "RENDA_FIXA" | "CAIXA" | "INTERNACIONAL" | "CRIPTO" | "OUTROS"

export const CLASSES: { classe: ClasseDeAtivo; rotulo: string; letra: string | null; explicacao: string }[] = [
  { classe: "ACOES", rotulo: "Ações", letra: "A", explicacao: "Empresas listadas em bolsa, no Brasil." },
  { classe: "FII", rotulo: "Fundos imobiliários", letra: "R", explicacao: "Real estate: tijolo e papel." },
  { classe: "RENDA_FIXA", rotulo: "Renda fixa", letra: "C", explicacao: "Tesouro, CDB, LCI, LCA, debênture." },
  { classe: "CAIXA", rotulo: "Caixa", letra: "C", explicacao: "O que resgata hoje sem perder valor." },
  { classe: "INTERNACIONAL", rotulo: "Ativos internacionais", letra: "A", explicacao: "O que é cotado fora do país." },
  { classe: "CRIPTO", rotulo: "Cripto", letra: null, explicacao: "Fora do método; aparece para a conta fechar." },
  { classe: "OUTROS", rotulo: "Outros", letra: null, explicacao: "O que não se encaixa nas linhas acima." },
]

/** As quatro letras do método, e quais classes da carteira entram em cada uma. */
export const LETRAS_DO_ARCA: { letra: string; rotulo: string; classes: ClasseDeAtivo[]; alvoBps: number }[] = [
  { letra: "A", rotulo: "Ações", classes: ["ACOES"], alvoBps: 2500 },
  { letra: "R", rotulo: "Real estate", classes: ["FII"], alvoBps: 2500 },
  { letra: "C", rotulo: "Caixa e renda fixa", classes: ["RENDA_FIXA", "CAIXA"], alvoBps: 2500 },
  { letra: "A", rotulo: "Ativos internacionais", classes: ["INTERNACIONAL"], alvoBps: 2500 },
]

export interface PosicaoDaLetra {
  letra: string
  rotulo: string
  classes: ClasseDeAtivo[]
  atualCentavos: number
  /// Quanto essa letra representa hoje, em pontos-base do total considerado.
  atualBps: number
  alvoBps: number
  /// Quanto falta (positivo) ou sobra (negativo) para bater o alvo hoje.
  diferencaCentavos: number
}

/**
 * Onde a carteira está em relação ao método.
 *
 * Cripto e "outros" ficam FORA da conta do ARCA: o método tem quatro classes e
 * não diz o que fazer com o resto. Somá-los ao total faria as quatro letras
 * parecerem defasadas por causa de um ativo que o método nem considera. Eles
 * continuam visíveis na carteira, contados à parte.
 */
export function posicaoDoArca(carteira: { classe: ClasseDeAtivo; valorCentavos: number }[]): {
  letras: PosicaoDaLetra[]
  totalCentavos: number
  foraDoMetodoCentavos: number
} {
  const porClasse = new Map<ClasseDeAtivo, number>()
  for (const item of carteira) {
    porClasse.set(item.classe, (porClasse.get(item.classe) ?? 0) + Math.max(0, item.valorCentavos))
  }

  const letras = LETRAS_DO_ARCA.map((letra) => ({
    ...letra,
    atualCentavos: letra.classes.reduce((soma, classe) => soma + (porClasse.get(classe) ?? 0), 0),
  }))
  const totalCentavos = letras.reduce((soma, letra) => soma + letra.atualCentavos, 0)
  const foraDoMetodoCentavos = (porClasse.get("CRIPTO") ?? 0) + (porClasse.get("OUTROS") ?? 0)

  return {
    totalCentavos,
    foraDoMetodoCentavos,
    letras: letras.map((letra) => ({
      ...letra,
      atualBps: totalCentavos > 0 ? Math.round((letra.atualCentavos / totalCentavos) * 10_000) : 0,
      diferencaCentavos: Math.round((totalCentavos * letra.alvoBps) / 10_000) - letra.atualCentavos,
    })),
  }
}

export interface AporteSugerido {
  letra: string
  rotulo: string
  valorCentavos: number
  /// Por que esta letra recebeu isto — texto de conferência, não conselho.
  porque: string
}

/**
 * Como o aporte reequilibra a carteira.
 *
 * É o coração do método: em vez de vender o que subiu, aporta-se no que ficou
 * para trás. A conta é a mesma de encher vasos comunicantes — o dinheiro vai
 * primeiro para as letras mais atrasadas em relação ao alvo, até onde ele dá;
 * o que sobrar depois de todas alcançarem o alvo é dividido no percentual do
 * método.
 *
 * Carteira vazia cai no caso simples: quatro partes iguais.
 *
 * Continua sendo aritmética. O app não diz qual ativo comprar dentro da letra,
 * e não afirma que o método é bom — ele é de terceiro e está identificado.
 */
export function aporteQueReequilibra(
  aporteCentavos: number,
  carteira: { classe: ClasseDeAtivo; valorCentavos: number }[],
): AporteSugerido[] {
  const aporte = Math.max(0, Math.round(aporteCentavos))
  const { letras, totalCentavos } = posicaoDoArca(carteira)
  if (aporte === 0) return letras.map((letra) => ({ letra: letra.letra, rotulo: letra.rotulo, valorCentavos: 0, porque: "Sem aporte." }))

  const totalDepois = totalCentavos + aporte
  // Quanto falta a cada letra para alcançar o alvo já contando o dinheiro novo.
  const faltas = letras.map((letra) => Math.max(0, Math.round((totalDepois * letra.alvoBps) / 10_000) - letra.atualCentavos))
  const faltaTotal = faltas.reduce((soma, falta) => soma + falta, 0)

  let valores: number[]
  let motivo: (indice: number) => string

  if (faltaTotal <= 0) {
    valores = ratear(aporte, letras.length)
    motivo = () => "A carteira já está no alvo: divide igual."
  } else if (faltaTotal <= aporte) {
    // Todas alcançam o alvo e ainda sobra: a sobra vai no percentual do método.
    const sobra = aporte - faltaTotal
    const extra = ratearPorPeso(sobra, letras.map((letra) => letra.alvoBps))
    valores = faltas.map((falta, indice) => falta + extra[indice])
    motivo = (indice) => (faltas[indice] > 0 ? "Estava abaixo do alvo; o aporte fecha a diferença." : "Já estava no alvo; recebe só a parte da sobra.")
  } else {
    // O aporte não cobre tudo: vai proporcional ao tamanho de cada atraso.
    valores = ratearPorPeso(aporte, faltas)
    motivo = (indice) => (faltas[indice] > 0 ? "É a que está mais atrás do alvo." : "Já está no alvo ou acima: não recebe agora.")
  }

  return letras.map((letra, indice) => ({
    letra: letra.letra,
    rotulo: letra.rotulo,
    valorCentavos: valores[indice],
    porque: motivo(indice),
  }))
}

// ============================================================
// Efeito do corte
// ============================================================

export interface MesDoCorte {
  mes: number
  semCorteCentavos: number
  comCorteCentavos: number
}

export interface EfeitoDoCorte {
  cortePorMesCentavos: number
  serie: MesDoCorte[]
  /// Diferença no último mês.
  diferencaCentavos: number
  /// Em quantos meses o corte tira o caixa do vermelho. null se já está no azul,
  /// ou se o corte não é suficiente dentro do período projetado.
  mesQueSaiDoVermelho: number | null
  /// Mês em que o caixa fica negativo sem o corte. null se não fica.
  mesQueFicaNegativoSemCorte: number | null
}

/**
 * O que o corte faz com o caixa, mês a mês.
 *
 * Só juros sobre o saldo positivo — o dinheiro que sobra rende, o que falta não
 * é financiado a zero. Se o saldo fica negativo, aplica-se o juro do cheque
 * especial, senão a projeção sugeriria que ficar no vermelho é de graça.
 */
export function efeitoDoCorte(entrada: {
  saldoInicialCentavos: number
  receitaMensalCentavos: number
  despesaMensalCentavos: number
  cortePorMesCentavos: number
  meses?: number
  /// Rendimento do saldo positivo, ao mês, em pontos-base.
  rendimentoMensalBps?: number
  /// Juro cobrado quando o saldo fica negativo, ao mês, em pontos-base.
  jurosNegativoMensalBps?: number
}): EfeitoDoCorte {
  const meses = entrada.meses ?? 24
  const rende = (entrada.rendimentoMensalBps ?? 0) / 10_000
  const custa = (entrada.jurosNegativoMensalBps ?? 800) / 10_000
  const corte = Math.max(0, entrada.cortePorMesCentavos)

  const serie: MesDoCorte[] = []
  let sem = entrada.saldoInicialCentavos
  let com = entrada.saldoInicialCentavos

  let mesQueSaiDoVermelho: number | null = null
  let mesQueFicaNegativoSemCorte: number | null = null

  const render = (saldo: number) =>
    saldo >= 0 ? Math.round(saldo * (1 + rende)) : Math.round(saldo * (1 + custa))

  for (let mes = 1; mes <= meses; mes += 1) {
    sem = render(sem) + entrada.receitaMensalCentavos - entrada.despesaMensalCentavos
    com = render(com) + entrada.receitaMensalCentavos - (entrada.despesaMensalCentavos - corte)

    if (mesQueFicaNegativoSemCorte === null && sem < 0) mesQueFicaNegativoSemCorte = mes
    if (mesQueSaiDoVermelho === null && sem < 0 && com >= 0) mesQueSaiDoVermelho = mes

    serie.push({ mes, semCorteCentavos: sem, comCorteCentavos: com })
  }

  return {
    cortePorMesCentavos: corte,
    serie,
    diferencaCentavos: com - sem,
    mesQueSaiDoVermelho,
    mesQueFicaNegativoSemCorte,
  }
}

/**
 * O mesmo corte, se virasse aporte.
 *
 * Responde "cortar R$ 200 por mês dá quanto em 20 anos" com juro composto sobre
 * rendimento **real**, já líquido de inflação. Projetar com rendimento nominal
 * infla o número e promete um patrimônio que não compra o que parece comprar.
 */
export function corteViraPatrimonio(entrada: {
  cortePorMesCentavos: number
  anos: number
  rendimentoRealAnualBps: number
}): { aportadoCentavos: number; patrimonioCentavos: number; jurosCentavos: number } {
  const meses = Math.max(0, Math.round(entrada.anos * 12))
  const taxaMensal = Math.pow(1 + entrada.rendimentoRealAnualBps / 10_000, 1 / 12) - 1

  let patrimonio = 0
  for (let mes = 0; mes < meses; mes += 1) {
    patrimonio = Math.round(patrimonio * (1 + taxaMensal)) + entrada.cortePorMesCentavos
  }

  const aportado = entrada.cortePorMesCentavos * meses

  return {
    aportadoCentavos: aportado,
    patrimonioCentavos: patrimonio,
    jurosCentavos: patrimonio - aportado,
  }
}
