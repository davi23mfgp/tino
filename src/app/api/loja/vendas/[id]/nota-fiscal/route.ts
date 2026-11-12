import { prisma } from "@/lib/prisma"
import { comSessao, ok, ErroDeUso } from "@/lib/api"
import { lojaDoLar } from "@/lib/loja/dados"
import { REGRAS, consumirLimite } from "@/lib/limite"
import { emitirNotaDaVenda, PendenciaDeEmissao } from "@/lib/nota-fiscal"

type Contexto = { params: Promise<{ id: string }> }

/** Nota fiscal da venda, se já houver tentativa de emissão. */
export const GET = comSessao<Contexto>(async (sessao, _requisicao, contexto) => {
  const { id } = await contexto.params
  const loja = await lojaDoLar(sessao.larId)

  const venda = await prisma.vendaLoja.findFirst({ where: { id, lojaId: loja.id } })
  if (!venda) throw new ErroDeUso("Venda não encontrada.", 404)

  const nota = await prisma.notaFiscalVenda.findUnique({ where: { vendaId: id } })
  return ok({ nota })
})

/**
 * Emite (ou reemite) a nota da venda.
 *
 * Pendência de cadastro (sem CNPJ, sem NCM) vira 422 com a lista do que falta
 * — a tela mostra ponto a ponto, não um "não deu" genérico. Rejeição do
 * provedor não é erro HTTP: a nota grava `REJEITADA` e a resposta continua
 * 200, porque a chamada em si funcionou.
 */
export const POST = comSessao<Contexto>(async (sessao, _requisicao, contexto) => {
  const { id } = await contexto.params
  const loja = await lojaDoLar(sessao.larId)

  const venda = await prisma.vendaLoja.findFirst({ where: { id, lojaId: loja.id } })
  if (!venda) throw new ErroDeUso("Venda não encontrada.", 404)

  // Nota já emitida não sai de novo: cada chamada ia ao provedor pago e
  // trocava chave e número da nota anterior (auditoria, Lote 5). Reemitir
  // vale só para a rejeitada.
  const atual = await prisma.notaFiscalVenda.findUnique({ where: { vendaId: id }, select: { status: true } })
  if (atual?.status === "EMITIDA") throw new ErroDeUso("A nota desta venda já foi emitida.", 409)
  await consumirLimite(`nota:${sessao.larId}`, REGRAS.caro)

  try {
    const nota = await emitirNotaDaVenda({ larId: sessao.larId, vendaId: id })
    return ok({ nota })
  } catch (falha) {
    if (falha instanceof PendenciaDeEmissao) {
      throw new ErroDeUso(falha.pendencias.join(" "), 422)
    }
    throw falha
  }
})
