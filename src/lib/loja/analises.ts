/**
 * As análises da Fase 2, em funções puras: motivos de perda dos orçamentos
 * (2.4), grupos de clientes (2.2) e o Guia do negócio (2.1). Estudos em
 * `docs/pesquisas/2026-10-07-guia-e-analise-de-clientes.md` e
 * `docs/pesquisas/2026-10-07-pix-rodape-motivos-indicacao.md`.
 *
 * Três regras valem para todas:
 * - cada número vem com a referência (o período anterior, ou a regra do
 *   grupo escrita por extenso), senão não diz se é bom ou ruim (regra 4);
 * - amostra pequena não vira conclusão: com menos de 5 casos a tela diz que
 *   ainda é cedo, em vez de apontar "o seu problema é preço" com 2 orçamentos;
 * - dado que falta aparece como falta, nunca como zero (regra 3).
 */

import { MOTIVOS_DE_PERDA, rotuloDoMotivo, type MotivoPerda } from "./orcamento"

const DIA = 86_400_000
export const JANELA_DIAS = 90
/** Abaixo disso, a análise mostra os números mas não aponta conclusão. */
export const AMOSTRA_MINIMA = 5

// ============================================================ 2.4 motivos de perda

export interface OrcamentoPerdido {
  status: string
  perdidoEm: Date | null
  motivoPerda: MotivoPerda | null
  totalCentavos: number
}

export interface LinhaDoMotivo { motivo: MotivoPerda | null; rotulo: string; quantidade: number; valorCentavos: number }

/**
 * Perdas por motivo nos últimos 90 dias, em quantidade e em reais (como o
 * Pipedrive), com os 90 dias de antes como referência. "Sem motivo" aparece
 * como linha própria: esconder seria contar menos perda do que houve.
 */
export function motivosDePerda(orcamentos: OrcamentoPerdido[], agora: Date) {
  const inicio = agora.getTime() - JANELA_DIAS * DIA
  const inicioAnterior = inicio - JANELA_DIAS * DIA
  const perdidos = orcamentos.filter((o) => o.status === "PERDIDO" && o.perdidoEm)
  const atuais = perdidos.filter((o) => o.perdidoEm!.getTime() >= inicio && o.perdidoEm!.getTime() <= agora.getTime())
  const anteriores = perdidos.filter((o) => o.perdidoEm!.getTime() >= inicioAnterior && o.perdidoEm!.getTime() < inicio)

  const linhas: LinhaDoMotivo[] = [...MOTIVOS_DE_PERDA.map((m) => m.valor), null]
    .map((motivo) => {
      const doMotivo = atuais.filter((o) => (o.motivoPerda ?? null) === motivo)
      return { motivo, rotulo: motivo ? rotuloDoMotivo(motivo) : "Sem motivo", quantidade: doMotivo.length, valorCentavos: doMotivo.reduce((soma, o) => soma + o.totalCentavos, 0) }
    })
    .filter((linha) => linha.quantidade > 0)
    .sort((a, b) => b.valorCentavos - a.valorCentavos || b.quantidade - a.quantidade)

  const total = { quantidade: atuais.length, valorCentavos: atuais.reduce((soma, o) => soma + o.totalCentavos, 0) }
  const anterior = { quantidade: anteriores.length, valorCentavos: anteriores.reduce((soma, o) => soma + o.totalCentavos, 0) }
  const comMotivo = linhas.filter((linha) => linha.motivo !== null)
  // Só aponta o principal com amostra e com um motivo claramente na frente
  // (mais de um terço do valor perdido).
  const principal = total.quantidade >= AMOSTRA_MINIMA && comMotivo[0] && comMotivo[0].valorCentavos * 3 > total.valorCentavos ? comMotivo[0] : null
  return { dias: JANELA_DIAS, linhas, total, anterior, principal, cedo: total.quantidade < AMOSTRA_MINIMA }
}

/** O que fazer com o motivo que mais pesa, em uma frase. */
export const DICA_DO_MOTIVO: Record<MotivoPerda, string> = {
  PRECO: "Mostre a diferença do seu serviço no orçamento (garantia, peça boa, prazo), ou ofereça parcelar.",
  PRAZO: "Diga o prazo no orçamento e cumpra; se a peça demora, ofereça uma opção mais rápida.",
  ATENDIMENTO: "Responda mais rápido: orçamento mandado no mesmo dia fecha mais.",
  DESISTIU: "Pergunte por que desistiu: às vezes é dinheiro do mês, e o cliente volta depois.",
  SEM_RESPOSTA: "Pergunte de novo em 2 dias. A tela Clientes já lembra quem retomar.",
  OUTRO: "Escreva o motivo no detalhe: \"outro\" repetido esconde o que está acontecendo.",
}

// ============================================================ 2.2 grupos de clientes

export interface CompraDoCliente { em: Date; totalCentavos: number; fiado: boolean }
export interface ClienteParaAnalise { id: string; nome: string; telefone: string | null; compras: CompraDoCliente[] }

/** As regras de cada grupo, escritas como a tela mostra. As de frequentes e sumidos vêm do Square. */
export const REGRAS_DOS_GRUPOS = {
  compramMais: "Quem soma 80% do que você vendeu nos últimos 90 dias.",
  frequentes: "Compraram 3 vezes ou mais nos últimos 6 meses.",
  sumidos: "Compravam sempre (3 vezes ou mais em 6 meses) e não compram há 6 semanas.",
  soFiado: "Compraram 2 vezes ou mais nos últimos 6 meses, e todas no fiado.",
} as const

const SEIS_MESES = 182
const SEIS_SEMANAS = 42

export function gruposDeClientes(clientes: ClienteParaAnalise[], agora: Date) {
  const t = agora.getTime()
  const desde = (dias: number) => t - dias * DIA

  const em90 = clientes
    .map((c) => ({ c, valor: c.compras.filter((v) => v.em.getTime() >= desde(JANELA_DIAS)).reduce((s, v) => s + v.totalCentavos, 0) }))
    .filter((linha) => linha.valor > 0)
    .sort((a, b) => b.valor - a.valor)
  const totalEm90 = em90.reduce((s, linha) => s + linha.valor, 0)
  const compramMais: { cliente: ClienteParaAnalise; valorCentavos: number; parteBps: number }[] = []
  let acumulado = 0
  for (const linha of em90) {
    if (acumulado * 10 >= totalEm90 * 8) break
    acumulado += linha.valor
    compramMais.push({ cliente: linha.c, valorCentavos: linha.valor, parteBps: Math.round((linha.valor * 10_000) / totalEm90) })
  }

  const frequentes = clientes.filter((c) => c.compras.filter((v) => v.em.getTime() >= desde(SEIS_MESES)).length >= 3)

  const sumidos = clientes
    .filter((c) => {
      const antes = c.compras.filter((v) => v.em.getTime() < desde(SEIS_SEMANAS) && v.em.getTime() >= desde(SEIS_SEMANAS + SEIS_MESES))
      const recentes = c.compras.filter((v) => v.em.getTime() >= desde(SEIS_SEMANAS))
      return antes.length >= 3 && recentes.length === 0
    })
    .map((c) => ({ cliente: c, ultimaEm: new Date(Math.max(...c.compras.map((v) => v.em.getTime()))) }))
    .sort((a, b) => a.ultimaEm.getTime() - b.ultimaEm.getTime())

  const soFiado = clientes.filter((c) => {
    const recentes = c.compras.filter((v) => v.em.getTime() >= desde(SEIS_MESES))
    return recentes.length >= 2 && recentes.every((v) => v.fiado)
  })

  return {
    totalEm90Centavos: totalEm90,
    clientesComCompra: em90.length,
    compramMais, frequentes, sumidos, soFiado,
    // Com poucos clientes comprando, "80% do faturamento" é uma ou duas pessoas e não diz nada.
    cedo: em90.length < AMOSTRA_MINIMA,
  }
}

// ============================================================ 2.1 Guia do negócio

/** O que o Guia lê do negócio. `null` quer dizer "o Tino não tem como saber", não zero. */
export interface FotoDoNegocio {
  produtos: number
  produtosSemCusto: number
  vendasNoCartao90d: number
  maquininhasComTaxa: number
  fiadoAtrasadoCentavos: number
  fiadoAtrasadoClientes: number
  dasAtrasados: number | null
  clientesSumidos: number
  orcamentosSemResposta: number
  chavePix: boolean
  telefoneDaLoja: boolean
}

export interface PassoDoGuia {
  chave: string
  pergunta: string
  /** true feito, false falta fazer. */
  feito: boolean
  resposta: string
  porque: string
  rota: string
  acao: string
}

/**
 * O Guia do negócio: o que falta, em passos, cada um com o porquê e o botão
 * que leva a fazer (estudo: Shopify). A ordem segue onde o MEI quebra
 * segundo o Sebrae: primeiro o que segura o caixa (custo, taxa, fiado, DAS),
 * depois o que traz venda (sumidos, orçamentos parados, Pix, telefone).
 * Passo sem dado para conferir não entra: entra quando houver o que conferir.
 */
export function guiaDoNegocio(foto: FotoDoNegocio): PassoDoGuia[] {
  const passos: PassoDoGuia[] = []
  if (foto.produtos > 0) {
    passos.push({
      chave: "custo", pergunta: "Todos os produtos têm custo?", feito: foto.produtosSemCusto === 0,
      resposta: foto.produtosSemCusto === 0 ? `Sim, os ${foto.produtos} têm.` : `${foto.produtosSemCusto} de ${foto.produtos} ainda sem custo.`,
      porque: "Sem o custo, o Tino não sabe quanto sobra de cada venda, e preço errado só aparece quando o caixa aperta.",
      rota: "/loja/estoque", acao: "Pôr o custo",
    })
  }
  if (foto.vendasNoCartao90d > 0) {
    passos.push({
      chave: "taxa", pergunta: "A taxa da sua maquininha está cadastrada?", feito: foto.maquininhasComTaxa > 0,
      resposta: foto.maquininhasComTaxa > 0 ? "Sim." : `Não, e você vendeu ${foto.vendasNoCartao90d} vezes no cartão em 90 dias.`,
      porque: "A taxa sai de cada venda no cartão. Sem ela, o Tino mostra que sobrou mais do que sobrou.",
      rota: "/loja/dados", acao: "Cadastrar a taxa",
    })
  }
  passos.push({
    chave: "fiado", pergunta: "Tem fiado atrasado há mais de 30 dias?", feito: foto.fiadoAtrasadoCentavos === 0,
    resposta: foto.fiadoAtrasadoCentavos === 0 ? "Não." : `${foto.fiadoAtrasadoClientes} ${foto.fiadoAtrasadoClientes === 1 ? "cliente deve" : "clientes devem"} há mais de 30 dias.`,
    porque: "Fiado parado é capital de giro que não volta; o Sebrae aponta falta de capital de giro entre as causas que mais fecham MEI.",
    rota: "/loja/fiado", acao: "Cobrar",
  })
  if (foto.dasAtrasados !== null) {
    passos.push({
      chave: "das", pergunta: "O DAS está em dia?", feito: foto.dasAtrasados === 0,
      resposta: foto.dasAtrasados === 0 ? "Sim." : `${foto.dasAtrasados} ${foto.dasAtrasados === 1 ? "mês atrasado" : "meses atrasados"}.`,
      porque: "DAS atrasado tem multa e juros, o mês sem pagar não conta para o INSS, e o MEI com débito pode ser excluído do Simples Nacional.",
      rota: "/mei", acao: "Ver o DAS",
    })
  }
  passos.push({
    chave: "sumidos", pergunta: "Algum cliente frequente sumiu?", feito: foto.clientesSumidos === 0,
    resposta: foto.clientesSumidos === 0 ? "Não." : `${foto.clientesSumidos} ${foto.clientesSumidos === 1 ? "cliente que comprava sempre não volta" : "clientes que compravam sempre não voltam"} há 6 semanas.`,
    porque: "Trazer de volta quem já comprou custa menos que achar cliente novo. Uma mensagem às vezes basta.",
    rota: "/loja/clientes", acao: "Mandar mensagem",
  })
  passos.push({
    chave: "orcamentos", pergunta: "Tem orçamento esperando resposta?", feito: foto.orcamentosSemResposta === 0,
    resposta: foto.orcamentosSemResposta === 0 ? "Não." : `${foto.orcamentosSemResposta} enviados há mais de 2 dias, sem resposta.`,
    porque: "Orçamento sem retorno vira venda perdida por esquecimento, não por preço.",
    rota: "/loja/clientes", acao: "Retomar",
  })
  passos.push({
    chave: "pix", pergunta: "Sua chave Pix está no Tino?", feito: foto.chavePix,
    resposta: foto.chavePix ? "Sim." : "Ainda não.",
    porque: "Com a chave, o orçamento, a OS e o fiado já vão com o Pix pronto para o cliente pagar.",
    rota: "/loja/dados", acao: "Cadastrar a chave",
  })
  passos.push({
    chave: "telefone", pergunta: "O telefone da loja está no Tino?", feito: foto.telefoneDaLoja,
    resposta: foto.telefoneDaLoja ? "Sim." : "Ainda não.",
    porque: "É o botão \"Falar com a loja\" nos links que o cliente recebe.",
    rota: "/loja/dados", acao: "Cadastrar",
  })
  // O que falta fazer vem antes, na ordem acima; o que já está feito desce.
  return [...passos.filter((p) => !p.feito), ...passos.filter((p) => p.feito)]
}
