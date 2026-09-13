import { prisma } from "@/lib/prisma"
import { comSessao, corpo, exigir, ok, ErroDeUso } from "@/lib/api"
import { competenciaDe } from "@/lib/datas"
import { compromissosFuturos, criarParcelamento, resumoParcelamentos } from "@/lib/parcelamentos"

export const GET = comSessao(async (sessao, requisicao) => {
  const url = new URL(requisicao.url)
  const incluirFinalizados = url.searchParams.get("finalizados") === "1"

  const parcelamentos = await prisma.parcelamento.findMany({
    where: { larId: sessao.larId },
    include: {
      parcelas: { orderBy: { numero: "asc" } },
      conta: { select: { nome: true, cor: true } },
      categoria: { select: { nome: true, cor: true, icone: true } },
    },
    orderBy: { dataCompra: "desc" },
  })

  const comSaldo = parcelamentos.map((parcelamento) => {
    const abertas = parcelamento.parcelas.filter((parcela) => !parcela.paga)
    return {
      ...parcelamento,
      restanteCentavos: abertas.reduce((soma, parcela) => soma + parcela.valorCentavos, 0),
      pagasCount: parcelamento.parcelas.length - abertas.length,
      finalizado: abertas.length === 0,
    }
  })

  const [resumo, compromissos] = await Promise.all([
    resumoParcelamentos(sessao.larId),
    compromissosFuturos(sessao.larId, 18),
  ])

  return ok({
    parcelamentos: incluirFinalizados ? comSaldo : comSaldo.filter((linha) => !linha.finalizado),
    finalizados: comSaldo.filter((linha) => linha.finalizado).length,
    resumo,
    compromissos,
  })
})

export const POST = comSessao(async (sessao, requisicao) => {
  const dados = await corpo<{
    contaId: string
    descricao: string
    estabelecimento?: string
    categoriaId?: string
    valorTotalCentavos: number
    parcelasTotal: number
    parcelasPagas?: number
    dataCompra?: string
    primeiraCompetencia?: string
    diaVencimento?: number
  }>(requisicao)

  const contaId = exigir(dados.contaId, "Escolha o cartão")
  const conta = await prisma.conta.findFirst({ where: { id: contaId, larId: sessao.larId, tipo:"CARTAO_CREDITO", arquivada:false } })
  if (!conta) throw new Error("Cartão não encontrado.")

  if(!Number.isSafeInteger(dados.valorTotalCentavos)||dados.valorTotalCentavos<=0||dados.valorTotalCentavos>2147483647||!Number.isInteger(dados.parcelasTotal)||dados.parcelasTotal<1||dados.parcelasTotal>120)throw new ErroDeUso("Valor ou parcelas inválidos.")
  if(dados.categoriaId&&!await prisma.categoria.findFirst({where:{id:dados.categoriaId,larId:sessao.larId}}))throw new ErroDeUso("Categoria inválida.")
  if(dados.primeiraCompetencia&&!/^\d{4}-(0[1-9]|1[0-2])$/.test(dados.primeiraCompetencia))throw new ErroDeUso("Mês inválido.")
  const dataCompra = dados.dataCompra ? new Date(dados.dataCompra) : new Date()

  const parcelamento = await criarParcelamento({
    larId: sessao.larId,
    contaId,
    descricao: exigir(dados.descricao, "Descreva a compra").trim(),
    estabelecimento: dados.estabelecimento,
    categoriaId: dados.categoriaId,
    valorTotalCentavos: Math.abs(Number(exigir(dados.valorTotalCentavos, "Informe o valor total"))),
    parcelasTotal: Math.max(1, Number(exigir(dados.parcelasTotal, "Informe o número de parcelas"))),
    parcelasPagas: dados.parcelasPagas ?? 0,
    dataCompra,
    primeiraCompetencia: dados.primeiraCompetencia ?? competenciaDe(dataCompra),
    // O dia da parcela é o vencimento do cartão: é nele que o dinheiro sai.
    diaVencimento: dados.diaVencimento ?? conta.diaVencimento ?? 10,
  })

  return ok(parcelamento, 201)
})
