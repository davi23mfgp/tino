/**
 * Os planos do Tino.
 *
 * Fica num arquivo só para o preço mudar em um lugar. Preço espalhado por
 * landing, tela de assinatura e e-mail de cobrança diverge no primeiro reajuste,
 * e o cliente vê um valor na propaganda e outro na hora de pagar.
 *
 * **Os valores abaixo são de referência e precisam da decisão do Davi.** Estão
 * calibrados pelo que apps de finanças pessoais e sistemas simples de PDV
 * cobram no Brasil, mas preço é decisão de negócio, não de engenharia.
 */

export type CodigoDoPlano = "pessoal" | "loja"

export interface Plano {
  codigo: CodigoDoPlano
  nome: string
  /// Em centavos, por mês. Dinheiro é Int em centavos aqui como no resto.
  mensalCentavos: number
  /// Cobrado de uma vez, por doze meses.
  anualCentavos: number
  chamada: string
  inclui: string[]
  /// O que este plano não faz, dito na cara. Cliente que descobre depois pede
  /// reembolso e conta para os outros.
  naoInclui: string[]
}

/** Dias de teste antes de precisar pagar. */
export const DIAS_DE_TESTE = 14

/** Doze mensalidades com 10% de desconto, arredondadas ao centavo. */
export function precoAnualComDescontoCentavos(mensalCentavos: number): number {
  return Math.round((mensalCentavos * 12 * 90) / 100)
}

export const PLANOS: Plano[] = [
  {
    codigo: "pessoal",
    nome: "Meu dinheiro",
    mensalCentavos: 1990,
    anualCentavos: precoAnualComDescontoCentavos(1990),
    chamada: "Para quem quer saber onde o dinheiro está indo e o que fazer com o que sobra.",
    inclui: [
      "Contas, cartões e faturas em um lugar",
      "Dívidas com ordem de ataque e plano mês a mês",
      "Orçamento por categoria e metas com data",
      "Projeção de caixa de 12 meses",
      "Parecer com DRE, balanço e indicadores",
      "Anotar por texto, por voz, pelo Telegram ou pelo celular",
    ],
    naoInclui: ["Venda no balcão", "Controle de estoque", "Acompanhamento do limite do MEI"],
  },
  {
    codigo: "loja",
    // Era "Meu dinheiro e minha loja" até 06/10/2026 (item 1.7 do plano). O
    // nome falava em loja, e metade das áreas do cadastro é serviço: o
    // técnico de celular e a manicure não se veem numa "loja". O código
    // continua "loja" porque está gravado nas assinaturas.
    nome: "Meu negócio",
    mensalCentavos: 4990,
    anualCentavos: precoAnualComDescontoCentavos(4990),
    chamada: "Para o MEI que vende ou presta serviço e precisa saber quanto sobra de verdade.",
    inclui: [
      "Tudo do plano Meu dinheiro",
      "O Tino da sua área: assistência, beleza, moda, alimentação e mais seis",
      "Clientes, orçamento com link e ordem de serviço com agenda",
      "Venda no balcão com taxa e prazo de cada maquininha",
      "Estoque com custo médio e margem, e fiado com texto de cobrança",
      "Contas a pagar e caixa do negócio separados das de casa",
      "Limite anual do MEI e DAS, sem redigitar faturamento",
    ],
    naoInclui: ["Emissão de nota fiscal", "Integração com maquininha", "Folha de pagamento"],
  },
]

export function plano(codigo: CodigoDoPlano): Plano {
  const encontrado = PLANOS.find((linha) => linha.codigo === codigo)
  if (!encontrado) throw new Error(`Plano desconhecido: ${codigo}`)
  return encontrado
}

/** Quanto o anual economiza, em pontos-base, para a tela não recalcular. */
export function descontoAnualBps(linha: Plano): number {
  const doze = linha.mensalCentavos * 12
  if (doze === 0) return 0
  return Math.round(((doze - linha.anualCentavos) / doze) * 10_000)
}
