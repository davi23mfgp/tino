import { prisma } from "@/lib/prisma"
import { comSessao, corpo, ErroDeUso, ok } from "@/lib/api"
import { lojaDoLar } from "@/lib/loja/dados"
import { fiadoPorCliente, paraResumo, SELECAO_COMPLETA } from "@/lib/loja/clientes"
import { dividirPagamento, situacaoDoOrcamento } from "@/lib/loja/orcamento"
import { campo, validar, z } from "@/lib/validar"

export const dynamic = "force-dynamic"

type Contexto = { params: Promise<{ id: string }> }

async function clienteDaLoja(larId: string, id: string) {
  const loja = await lojaDoLar(larId)
  const cliente = await prisma.clienteLoja.findFirst({ where: { id, lojaId: loja.id } })
  if (!cliente) throw new ErroDeUso("Cliente não encontrado.", 404)
  return { loja, cliente }
}

/** A ficha: contato, próximo passo, compras e todos os orçamentos. */
export const GET = comSessao<Contexto>(async (sessao, _requisicao, contexto) => {
  const { id } = await contexto.params
  const { loja, cliente } = await clienteDaLoja(sessao.larId, id)
  const [orcamentos, compras, fiado, lar] = await Promise.all([
    prisma.orcamentoLoja.findMany({ where: { clienteId: cliente.id, lojaId: loja.id }, orderBy: { criadoEm: "desc" }, select: SELECAO_COMPLETA }),
    prisma.vendaLoja.aggregate({ where: { clienteId: cliente.id, lojaId: loja.id, cancelada: false }, _count: true, _sum: { totalCentavos: true } }),
    fiadoPorCliente(loja.id),
    prisma.lar.findUnique({ where: { id: sessao.larId }, select: { fusoHorario: true } }),
  ])
  const agora = new Date()
  return ok({
    loja: { nome: loja.nome },
    cliente,
    compras: { quantidade: compras._count, totalCentavos: compras._sum.totalCentavos ?? 0 },
    fiadoCentavos: fiado.get(cliente.id) ?? 0,
    orcamentos: orcamentos.map(({ linkToken, ...orcamento }) => ({
      ...orcamento,
      vendaNumero: orcamento.venda?.numero ?? null,
      situacao: situacaoDoOrcamento(paraResumo(orcamento), agora, lar?.fusoHorario),
      pagamento: dividirPagamento(orcamento.totalCentavos, orcamento.entradaCentavos, orcamento.parcelas),
      // O link só existe depois de enviado: rascunho não é para o cliente ver.
      link: orcamento.status === "RASCUNHO" ? null : `/o/${linkToken}`,
    })),
  })
})

/**
 * Edita o cliente e o próximo passo. Passo sem data não entra em "Para
 * retomar hoje", então a rota pede a data junto; "Feito" manda os dois nulos.
 */
export const PATCH = comSessao<Contexto>(async (sessao, requisicao, contexto) => {
  const { id } = await contexto.params
  const dados = validar(
    z.object({
      nome: campo.textoObrigatorio(80).optional(),
      telefone: campo.texto(20).nullable().optional(),
      email: z.union([campo.email(), z.literal("")]).nullable().optional(),
      observacao: campo.texto(500).nullable().optional(),
      proximoPasso: campo.texto(140).nullable().optional(),
      proximoPassoEm: campo.data().nullable().optional(),
    }),
    await corpo(requisicao),
  )
  const { cliente } = await clienteDaLoja(sessao.larId, id)
  if (dados.proximoPasso && !dados.proximoPassoEm) throw new ErroDeUso("Diga quando: o passo sem data não aparece em Para retomar hoje.")
  const atualizado = await prisma.clienteLoja.update({
    where: { id: cliente.id },
    data: {
      ...(dados.nome !== undefined ? { nome: dados.nome.replace(/\s+/g, " ") } : {}),
      ...(dados.telefone !== undefined ? { telefone: dados.telefone || null } : {}),
      ...(dados.email !== undefined ? { email: dados.email || null } : {}),
      ...(dados.observacao !== undefined ? { observacao: dados.observacao || null } : {}),
      ...(dados.proximoPasso !== undefined ? { proximoPasso: dados.proximoPasso || null, proximoPassoEm: dados.proximoPasso ? dados.proximoPassoEm : null } : {}),
    },
  })
  return ok({ cliente: atualizado })
})
