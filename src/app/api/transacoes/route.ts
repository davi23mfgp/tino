import type { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { comSessao, corpo, exigir, ok, ErroDeUso } from "@/lib/api"
import { competenciaDoCartao } from "@/lib/competencia-cartao"
import { competenciaDe, janelaDoMes } from "@/lib/datas"
import { categorizar, type RegraAplicavel } from "@/lib/categorizar"

/**
 * Lista de lançamentos com os filtros da tela de transações.
 * Paginação por cursor: extrato cresce sem parar e offset alto fica lento.
 */
export const GET = comSessao(async (sessao, requisicao) => {
  const url = new URL(requisicao.url)
  const competencia = url.searchParams.get("competencia")
  const contaId = url.searchParams.get("contaId")
  const categoriaId = url.searchParams.get("categoriaId")
  const membroId = url.searchParams.get("membroId")
  const tipo = url.searchParams.get("tipo")
  const busca = url.searchParams.get("busca")
  const semCategoria = url.searchParams.get("semCategoria") === "1"
  // Um dia só, para a faixa de calendário do extrato. Vem depois da janela do
  // mês de propósito: dia escolhido manda, e mês vira só o contexto da faixa.
  const dia = url.searchParams.get("dia")
  const cursor = url.searchParams.get("cursor")
  const limite = Math.min(Number(url.searchParams.get("limite") ?? 50), 200)

  const onde: Prisma.TransacaoWhereInput = { larId: sessao.larId }

  if (competencia) {
    // "xxxx-99" chegava aqui e virava data inválida lá dentro, e a pessoa via
    // "algo deu errado" com 500 — erro de servidor para um parâmetro de URL.
    // As outras rotas já conferiam o formato; esta não.
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(competencia)) {
      throw new ErroDeUso("Competência inválida. Use o formato AAAA-MM.")
    }
    const lar = await prisma.lar.findUniqueOrThrow({ where: { id: sessao.larId }, select: { diaInicioMes: true } })
    const janela = janelaDoMes(competencia, lar.diaInicioMes)
    onde.data = { gte: janela.de, lte: janela.ate }
  }
  if (dia) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) throw new ErroDeUso("Dia inválido.")
    onde.data = { gte: new Date(`${dia}T00:00:00.000Z`), lte: new Date(`${dia}T23:59:59.999Z`) }
  }
  if (contaId) onde.contaId = contaId
  if (categoriaId) onde.categoriaId = categoriaId
  if (membroId) onde.membroId = membroId
  if (tipo) onde.tipo = tipo as Prisma.TransacaoWhereInput["tipo"]
  if (semCategoria) onde.categoriaId = null
  if (busca) onde.descricao = { contains: busca, mode: "insensitive" }

  const transacoes = await prisma.transacao.findMany({
    where: onde,
    include: { categoria: true, conta: true, membro: true },
    orderBy: [{ data: "desc" }, { criadoEm: "desc" }],
    take: limite + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  })

  const temMais = transacoes.length > limite
  const pagina = temMais ? transacoes.slice(0, limite) : transacoes

  const totais = await prisma.transacao.groupBy({
    by: ["tipo"],
    where: onde,
    _sum: { valorCentavos: true },
    _count: { _all: true },
  })

  return ok({
    transacoes: pagina,
    proximoCursor: temMais ? pagina[pagina.length - 1].id : null,
    contagem: { entradas: totais.find(t=>t.tipo==="RECEITA")?._count._all??0, saidas: totais.find(t=>t.tipo==="DESPESA")?._count._all??0 },
    totais: {
      receitasCentavos: totais.find((t) => t.tipo === "RECEITA")?._sum.valorCentavos ?? 0,
      despesasCentavos: totais.find((t) => t.tipo === "DESPESA")?._sum.valorCentavos ?? 0,
    },
  })
})

interface NovaTransacao {
  contaId: string
  data: string
  descricao: string
  valorCentavos: number
  tipo: "RECEITA" | "DESPESA" | "TRANSFERENCIA"
  categoriaId?: string | null
  membroId?: string | null
  pago?: boolean
  observacao?: string
  tags?: string[]
  meiFaturamento?: boolean
  /// Mês da fatura escolhido à mão ("AAAA-MM"), quando a regra do cartão não
  /// dá a resposta certa (compra lançada em data diferente da que o banco viu).
  competenciaFatura?: string
  /// Transferência precisa da conta de destino: sem ela o dinheiro sumiria
  /// de uma conta sem aparecer na outra.
  contaDestinoId?: string
}

export const POST = comSessao(async (sessao, requisicao) => {
  const dados = await corpo<NovaTransacao>(requisicao)

  const contaId = exigir(dados.contaId, "Escolha a conta")
  const descricao = exigir(dados.descricao, "Descreva o lançamento").trim()
  const valorCentavos = Math.abs(Number(exigir(dados.valorCentavos, "Informe o valor")))
  if (!Number.isSafeInteger(valorCentavos) || valorCentavos === 0 || valorCentavos > 2147483647) throw new ErroDeUso("Valor inválido.")

  const data = new Date(exigir(dados.data, "Informe a data"))
  if (Number.isNaN(data.getTime())) throw new ErroDeUso("Data inválida.")

  const conta = await prisma.conta.findFirst({ where: { id: contaId, larId: sessao.larId } })
  if (!conta) throw new ErroDeUso("Conta não encontrada.", 404)

  // O mês de fatura escolhido à mão só faz sentido em cartão de crédito, e só
  // no formato que o resto do app entende — aceitar qualquer texto aqui é
  // deixar uma compra sumir de todas as telas de fatura.
  if (dados.competenciaFatura) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(dados.competenciaFatura)) throw new ErroDeUso("Mês de fatura inválido.")
    if (conta.tipo !== "CARTAO_CREDITO") throw new ErroDeUso("Só compra em cartão de crédito tem mês de fatura.")
  }

  if(dados.categoriaId && !await prisma.categoria.findFirst({where:{id:dados.categoriaId,larId:sessao.larId}})) throw new ErroDeUso("Categoria inválida.")
  if(dados.membroId && !await prisma.membro.findFirst({where:{id:dados.membroId,larId:sessao.larId}})) throw new ErroDeUso("Membro inválido.")

  // Sem categoria informada, o Tino sugere pelas regras do lar — o usuário
  // não deveria ter de escolher categoria em todo lançamento manual.
  let categoriaId = dados.categoriaId ?? null
  if (!categoriaId && dados.tipo !== "TRANSFERENCIA") {
    const [regras, categorias] = await Promise.all([
      prisma.regraCategorizacao.findMany({ where: { larId: sessao.larId, ativa: true } }),
      prisma.categoria.findMany({ where: { larId: sessao.larId }, select: { id: true, nome: true } }),
    ])
    const sugestao = categorizar(
      descricao,
      regras as unknown as RegraAplicavel[],
      new Map(categorias.map((categoria) => [categoria.nome, categoria.id])),
    )
    categoriaId = sugestao.categoriaId ?? null
  }

  if (dados.tipo === "TRANSFERENCIA") {
    const contaDestinoId = exigir(dados.contaDestinoId, "Escolha a conta de destino")
    if (contaDestinoId === contaId) throw new ErroDeUso("A conta de destino precisa ser diferente da origem.")

    const destino = await prisma.conta.findFirst({ where: { id: contaDestinoId, larId: sessao.larId } })
    if (!destino) throw new ErroDeUso("Conta de destino não encontrada.", 404)

    // As duas pontas nascem juntas e ligadas: assim editar ou apagar uma delas
    // sempre encontra a outra, e o saldo das duas contas fecha.
    const criadas = await prisma.$transaction(async (tx) => {
      const saida = await tx.transacao.create({
        data: {
          larId: sessao.larId,
          contaId,
          data,
          descricao,
          valorCentavos,
          tipo: "TRANSFERENCIA",
          competencia: competenciaDe(data),
          membroId: dados.membroId ?? null,
          observacao: dados.observacao,
        },
      })
      const entrada = await tx.transacao.create({
        data: {
          larId: sessao.larId,
          contaId: contaDestinoId,
          data,
          descricao,
          valorCentavos,
          tipo: "TRANSFERENCIA",
          competencia: competenciaDe(data),
          membroId: dados.membroId ?? null,
          observacao: dados.observacao,
          transferenciaParId: saida.id,
        },
      })
      return { saida, entrada }
    })

    return ok(criadas, 201)
  }

  const transacao = await prisma.transacao.create({
    data: {
      larId: sessao.larId,
      contaId,
      categoriaId,
      membroId: dados.membroId ?? sessao.membroId,
      data,
      descricao,
      descricaoOriginal: descricao,
      valorCentavos,
      tipo: dados.tipo,
      pago: dados.pago ?? true,
      competencia: competenciaDe(data),
      // A contábil diz quando gastou; a de fatura, quando paga. Ver
      // `lib/competencia-cartao.ts`.
      competenciaFatura: dados.competenciaFatura ?? competenciaDoCartao(data, conta),
      observacao: dados.observacao,
      tags: dados.tags ?? [],
      meiFaturamento: dados.meiFaturamento ?? false,
    },
    include: { categoria: true, conta: true },
  })

  return ok(transacao, 201)
})
