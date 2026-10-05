import { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { comSessao, corpo, ErroDeUso, ok } from "@/lib/api"
import { lojaDoLar } from "@/lib/loja/dados"
import { conferirItens, conferirValores, novoToken, proximoNumeroDeOrcamento } from "@/lib/loja/clientes"
import { ESQUEMA_CONDICOES, ESQUEMA_ITENS, validadeAPartirDeHoje } from "@/lib/loja/orcamento-entrada"
import { campo, validar, z } from "@/lib/validar"

export const dynamic = "force-dynamic"

/** O catálogo que o editor de orçamento oferece: produto e serviço ativos. */
export const GET = comSessao(async (sessao) => {
  const loja = await lojaDoLar(sessao.larId)
  const [produtos, servicos] = await Promise.all([
    prisma.produtoLoja.findMany({ where: { lojaId: loja.id, ativo: true }, orderBy: { nome: "asc" }, take: 300, select: { id: true, nome: true, precoCentavos: true } }),
    prisma.servicoLoja.findMany({ where: { lojaId: loja.id, ativo: true }, orderBy: { nome: "asc" }, take: 300, select: { id: true, nome: true, precoCentavos: true } }),
  ])
  return ok({ produtos, servicos })
})

/**
 * Cria o orçamento em rascunho. Cliente novo pode vir só com nome e
 * telefone: pedir cadastro antes do preço é perder o cliente no balcão.
 */
export const POST = comSessao(async (sessao, requisicao) => {
  const dados = validar(
    z.object({
      clienteId: campo.id().optional(),
      clienteNome: campo.texto(80).optional(),
      clienteTelefone: campo.texto(20).optional(),
      itens: ESQUEMA_ITENS,
      ...ESQUEMA_CONDICOES,
    }),
    await corpo(requisicao),
  )
  const loja = await lojaDoLar(sessao.larId)
  const lar = await prisma.lar.findUnique({ where: { id: sessao.larId }, select: { fusoHorario: true } })

  let clienteId = dados.clienteId
  if (clienteId) {
    if (!(await prisma.clienteLoja.findFirst({ where: { id: clienteId, lojaId: loja.id }, select: { id: true } }))) throw new ErroDeUso("Cliente não encontrado.", 404)
  } else {
    const nome = dados.clienteNome?.trim().replace(/\s+/g, " ")
    if (!nome) throw new ErroDeUso("Diga para quem é o orçamento.")
    const existente = await prisma.clienteLoja.findFirst({ where: { lojaId: loja.id, nome: { equals: nome, mode: "insensitive" } }, orderBy: { criadoEm: "asc" } })
    clienteId = existente
      ? existente.id
      : (await prisma.clienteLoja.create({ data: { lojaId: loja.id, nome, telefone: dados.clienteTelefone || null } })).id
  }

  const itens = await conferirItens(loja.id, dados.itens)
  const entrada = dados.entradaCentavos ?? null
  const totalCentavos = conferirValores(dados.itens, dados.descontoCentavos ?? 0, entrada)

  // Dois orçamentos criados no mesmo instante podem pegar o mesmo número; o
  // índice único recusa o segundo, e a nova tentativa pega o seguinte.
  for (let tentativa = 0; tentativa < 3; tentativa += 1) {
    try {
      const orcamento = await prisma.$transaction(async (transacao) =>
        transacao.orcamentoLoja.create({
          data: {
            lojaId: loja.id,
            clienteId: clienteId!,
            numero: await proximoNumeroDeOrcamento(transacao, loja.id),
            totalCentavos,
            descontoCentavos: dados.descontoCentavos ?? 0,
            entradaCentavos: entrada && entrada > 0 ? entrada : null,
            parcelas: dados.parcelas ?? 1,
            validoAte: validadeAPartirDeHoje(dados.validadeDias ?? 7, lar?.fusoHorario),
            observacao: dados.observacao || null,
            linkToken: novoToken(),
            itens: { create: itens },
          },
          select: { id: true, numero: true, clienteId: true },
        }),
      )
      return ok({ orcamento }, 201)
    } catch (excecao) {
      if (!(excecao instanceof Prisma.PrismaClientKnownRequestError && excecao.code === "P2002") || tentativa === 2) throw excecao
    }
  }
  throw new ErroDeUso("Não consegui numerar o orçamento. Tente de novo.")
})
