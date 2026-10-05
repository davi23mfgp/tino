import { prisma } from "@/lib/prisma"
import { comSessao, corpo, ErroDeUso, ok } from "@/lib/api"
import { lojaDoLar } from "@/lib/loja/dados"
import { conferirItens, conferirValores, SELECAO_COMPLETA } from "@/lib/loja/clientes"
import { ESQUEMA_CONDICOES, ESQUEMA_ITENS, validadeAPartirDeHoje } from "@/lib/loja/orcamento-entrada"
import { validar, z } from "@/lib/validar"

export const dynamic = "force-dynamic"

type Contexto = { params: Promise<{ id: string }> }

/** Um orçamento com itens e cliente: é o que o Balcão carrega para vender. */
export const GET = comSessao<Contexto>(async (sessao, _requisicao, contexto) => {
  const { id } = await contexto.params
  const loja = await lojaDoLar(sessao.larId)
  const orcamento = await prisma.orcamentoLoja.findFirst({ where: { id, lojaId: loja.id }, select: SELECAO_COMPLETA })
  if (!orcamento) throw new ErroDeUso("Orçamento não encontrado.", 404)
  const { linkToken, ...semToken } = orcamento
  return ok({ orcamento: { ...semToken, link: orcamento.status === "RASCUNHO" ? null : `/o/${linkToken}` } })
})

/**
 * Edita itens e condições.
 *
 * Depois de enviado, a versão anterior é guardada antes de mudar: o cliente
 * pode ter aberto o link e combinado em cima do que viu. Aprovado, vendido
 * ou perdido não edita; para mudar, faça outro orçamento.
 */
export const PUT = comSessao<Contexto>(async (sessao, requisicao, contexto) => {
  const { id } = await contexto.params
  const dados = validar(z.object({ itens: ESQUEMA_ITENS, ...ESQUEMA_CONDICOES }), await corpo(requisicao))
  const loja = await lojaDoLar(sessao.larId)
  const atual = await prisma.orcamentoLoja.findFirst({ where: { id, lojaId: loja.id }, select: SELECAO_COMPLETA })
  if (!atual) throw new ErroDeUso("Orçamento não encontrado.", 404)
  if (atual.status !== "RASCUNHO" && atual.status !== "ENVIADO") throw new ErroDeUso("Orçamento aprovado, vendido ou perdido não muda. Faça um novo.", 409)

  const itens = await conferirItens(loja.id, dados.itens)
  const entrada = dados.entradaCentavos === undefined ? atual.entradaCentavos : dados.entradaCentavos
  const descontoCentavos = dados.descontoCentavos ?? atual.descontoCentavos
  const totalCentavos = conferirValores(dados.itens, descontoCentavos, entrada)
  const lar = dados.validadeDias ? await prisma.lar.findUnique({ where: { id: sessao.larId }, select: { fusoHorario: true } }) : null

  const enviado = atual.status === "ENVIADO"
  await prisma.$transaction(async (transacao) => {
    // Só grava se ninguém mudou o status no meio (aprovação pelo link, por
    // exemplo): editar um orçamento que acabou de ser aprovado mudaria o que
    // o cliente aceitou.
    const mudou = await transacao.orcamentoLoja.updateMany({
      where: { id: atual.id, status: atual.status, versao: atual.versao },
      data: {
        totalCentavos,
        descontoCentavos,
        entradaCentavos: entrada && entrada > 0 ? entrada : null,
        parcelas: dados.parcelas ?? atual.parcelas,
        ...(dados.validadeDias ? { validoAte: validadeAPartirDeHoje(dados.validadeDias, lar?.fusoHorario) } : {}),
        ...(dados.observacao !== undefined ? { observacao: dados.observacao || null } : {}),
        ...(enviado ? { versao: { increment: 1 } } : {}),
      },
    })
    if (mudou.count !== 1) throw new ErroDeUso("O orçamento mudou enquanto você editava. Abra de novo.", 409)
    if (enviado) {
      const { cliente: _cliente, venda: _venda, linkToken: _token, ...foto } = atual
      await transacao.versaoOrcamentoLoja.create({ data: { orcamentoId: atual.id, versao: atual.versao, dados: JSON.parse(JSON.stringify(foto)) } })
    }
    await transacao.itemOrcamentoLoja.deleteMany({ where: { orcamentoId: atual.id } })
    await transacao.itemOrcamentoLoja.createMany({ data: itens.map((item) => ({ ...item, orcamentoId: atual.id })) })
  })
  return ok({ orcamento: { id: atual.id, numero: atual.numero, versao: enviado ? atual.versao + 1 : atual.versao } })
})
