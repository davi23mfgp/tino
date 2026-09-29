import { prisma } from "@/lib/prisma"
import { comSessao, corpo, ok, ErroDeUso } from "@/lib/api"
import { caixaAberto, lojaDoLar } from "@/lib/loja/dados"
import { resumoDoCaixa } from "@/lib/loja/venda"
import type { FormaPagamento } from "@/lib/loja/venda"

async function montarResumo(caixaId: string, aberturaCentavos: number, sangrias: number[]) {
  const vendas = await prisma.vendaLoja.findMany({
    where: { caixaId, cancelada: false },
    include: { pagamentos: true },
  })

  return resumoDoCaixa({
    aberturaCentavos,
    vendas: vendas.map((venda) => ({
      formas: venda.pagamentos.map((pagamento) => ({
        forma: pagamento.forma as FormaPagamento,
        valorCentavos: pagamento.valorCentavos,
      })),
    })),
    sangriasCentavos: sangrias,
  })
}

export const GET = comSessao(async (sessao) => {
  const loja = await lojaDoLar(sessao.larId)
  const caixa = await caixaAberto(loja.id)
  if (!caixa) return ok({ aberto: false })

  return ok({
    aberto: true,
    caixa,
    resumo: await montarResumo(caixa.id, caixa.aberturaCentavos, caixa.sangrias.map((s) => s.valorCentavos)),
  })
})

/** Abre o caixa do dia, ou registra uma sangria no que já está aberto. */
export const POST = comSessao(async (sessao, requisicao) => {
  const dados = await corpo<{
    acao: "abrir" | "sangria"
    aberturaCentavos?: number
    valorCentavos?: number
    motivo?: string
  }>(requisicao)

  const loja = await lojaDoLar(sessao.larId)
  const aberto = await caixaAberto(loja.id)

  if (dados.acao === "abrir") {
    // Dois caixas abertos ao mesmo tempo tornariam o fechamento indecidível:
    // não dá para saber em qual gaveta o dinheiro da venda entrou.
    if (aberto) throw new ErroDeUso("Já existe um caixa aberto. Feche antes de abrir outro.")
    if (dados.aberturaCentavos !== undefined && (!Number.isInteger(dados.aberturaCentavos) || dados.aberturaCentavos < 0)) throw new ErroDeUso("Confira o troco inicial.")

    const caixa = await prisma.caixa.create({
      data: { lojaId: loja.id, aberturaCentavos: dados.aberturaCentavos ?? 0 },
    })

    return ok({ caixa }, 201)
  }

  if (!aberto) throw new ErroDeUso("Não há caixa aberto para lançar a sangria.")
  const valorCentavos = dados.valorCentavos ?? 0
  if (!Number.isInteger(valorCentavos) || valorCentavos <= 0) throw new ErroDeUso("Informe o valor retirado da gaveta.")

  const sangria = await prisma.sangriaCaixa.create({
    data: { caixaId: aberto.id, valorCentavos, motivo: dados.motivo ?? null },
  })

  return ok({ sangria }, 201)
})

/**
 * Fecha o caixa com o que o dono contou na gaveta.
 *
 * O informado é gravado como veio. A diferença para o esperado é o resultado
 * da conferência — corrigir o informado para bater apagaria exatamente o que
 * essa tela existe para mostrar.
 */
export const PUT = comSessao(async (sessao, requisicao) => {
  const dados = await corpo<{ fechamentoInformadoCentavos: number }>(requisicao)

  // Contado negativo ou quebrado não é contagem de gaveta: seria uma
  // diferença inventada gravada para sempre no fechamento.
  if (!Number.isInteger(dados.fechamentoInformadoCentavos) || dados.fechamentoInformadoCentavos < 0) throw new ErroDeUso("Informe quanto tem na gaveta.")

  const loja = await lojaDoLar(sessao.larId)
  const aberto = await caixaAberto(loja.id)
  if (!aberto) throw new ErroDeUso("Não há caixa aberto.")

  const resumo = await montarResumo(
    aberto.id,
    aberto.aberturaCentavos,
    aberto.sangrias.map((s) => s.valorCentavos),
  )

  const caixa = await prisma.caixa.update({
    where: { id: aberto.id },
    data: {
      fechadoEm: new Date(),
      fechamentoInformadoCentavos: dados.fechamentoInformadoCentavos ?? 0,
    },
  })

  return ok({
    caixa,
    resumo: { ...resumo, informadoCentavos: caixa.fechamentoInformadoCentavos, diferencaCentavos: (caixa.fechamentoInformadoCentavos ?? 0) - resumo.esperadoNaGavetaCentavos },
  })
})
