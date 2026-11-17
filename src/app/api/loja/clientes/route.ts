import { prisma } from "@/lib/prisma"
import { comSessao, corpo, ok } from "@/lib/api"
import { lojaDoLar } from "@/lib/loja/dados"
import { clientesComOrcamentos, fiadoPorCliente, paraResumo, trazerDeVolta } from "@/lib/loja/clientes"
import { emAberto, paraRetomarHoje, resumoDoCliente, taxaDeFechamento } from "@/lib/loja/orcamento"
import { campo, validar, z } from "@/lib/validar"

export const dynamic = "force-dynamic"

/**
 * A tela Clientes inteira numa chamada: o que retomar hoje, o que está em
 * aberto, a taxa de fechamento e a lista. Os números saem de
 * `@/lib/loja/orcamento`, os mesmos que o teste confere.
 */
export const GET = comSessao(async (sessao) => {
  const loja = await lojaDoLar(sessao.larId)
  const [clientes, fiado, lar] = await Promise.all([
    clientesComOrcamentos(loja.id),
    fiadoPorCliente(loja.id),
    prisma.lar.findUnique({ where: { id: sessao.larId }, select: { fusoHorario: true } }),
  ])
  const fuso = lar?.fusoHorario
  const agora = new Date()
  const comResumo = clientes.map((cliente) => ({ ...cliente, orcamentos: cliente.orcamentos.map(paraResumo) }))
  const todos = comResumo.flatMap((cliente) => cliente.orcamentos)

  return ok({
    loja: { nome: loja.nome },
    retomar: paraRetomarHoje(comResumo, agora, fuso),
    emAberto: emAberto(todos, agora, fuso),
    fechamento: taxaDeFechamento(todos, agora),
    clientes: comResumo.map((cliente) => ({
      id: cliente.id,
      nome: cliente.nome,
      telefone: cliente.telefone,
      numeros: cliente.orcamentos.map((orcamento) => orcamento.numero),
      ...resumoDoCliente(cliente, fiado.get(cliente.id) ?? 0, agora, fuso),
    })),
  })
})

const ESQUEMA_CLIENTE = z.object({
  nome: campo.textoObrigatorio(80),
  telefone: campo.texto(20).optional(),
  email: z.union([campo.email(), z.literal("")]).optional(),
  observacao: campo.texto(500).optional(),
})

/**
 * Cadastra um cliente. O mesmo nome devolve o cadastro que já existe, como a
 * venda fiado faz: a Dona Cida não pode virar duas.
 */
export const POST = comSessao(async (sessao, requisicao) => {
  const dados = validar(ESQUEMA_CLIENTE, await corpo(requisicao))
  const loja = await lojaDoLar(sessao.larId)
  const nome = dados.nome.replace(/\s+/g, " ")
  // Trava pelo nome dentro da loja: dois toques em "Salvar" (ou o balcão e o
  // celular juntos) liam os dois "não existe" e criavam a Dona Cida duas vezes.
  // Não há chave única no banco porque já existem cadastros repetidos de antes,
  // e a trava resolve sem migrar dado de ninguém.
  const resultado = await prisma.$transaction(async (transacao) => {
    await transacao.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${"cliente:" + loja.id + ":" + nome.toLowerCase()}))::text`
    const existente = await transacao.clienteLoja.findFirst({
      where: { lojaId: loja.id, nome: { equals: nome, mode: "insensitive" } },
      orderBy: { criadoEm: "asc" },
    })
    if (existente) return { cliente: existente, existente: true }
    const cliente = await transacao.clienteLoja.create({
      data: { lojaId: loja.id, nome, telefone: dados.telefone || null, email: dados.email || null, observacao: dados.observacao || null },
    })
    return { cliente, existente: false }
  })
  if (resultado.existente) {
    await trazerDeVolta(resultado.cliente)
    return ok(resultado)
  }
  return ok(resultado, 201)
})
