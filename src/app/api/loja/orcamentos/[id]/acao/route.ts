import { prisma } from "@/lib/prisma"
import { comSessao, corpo, ErroDeUso, ok } from "@/lib/api"
import { lojaDoLar } from "@/lib/loja/dados"
import { paraResumo, SELECAO_RESUMO } from "@/lib/loja/clientes"
import { situacaoDoOrcamento } from "@/lib/loja/orcamento"
import { validadeAPartirDeHoje } from "@/lib/loja/orcamento-entrada"
import { campo, validar, z } from "@/lib/validar"

export const dynamic = "force-dynamic"

type Contexto = { params: Promise<{ id: string }> }

/**
 * Enviar (ou reenviar) e dar por perdido. O "sim" vem do cliente, pelo
 * link; o sim por telefone vira venda direto no Balcão.
 *
 * Cada mudança é condicionada ao status lido: se o cliente aprovou pelo link
 * no mesmo minuto em que o dono marcava "perdido", só uma das duas vale.
 */
export const POST = comSessao<Contexto>(async (sessao, requisicao, contexto) => {
  const { id } = await contexto.params
  const dados = validar(
    z.discriminatedUnion("acao", [
      z.object({ acao: z.literal("enviar") }),
      z.object({
        acao: z.literal("perder"),
        motivo: z.enum(["PRECO", "PRAZO", "ATENDIMENTO", "DESISTIU", "SEM_RESPOSTA", "OUTRO"]),
        detalhe: campo.texto(300).optional(),
      }),
    ]),
    await corpo(requisicao),
  )
  const loja = await lojaDoLar(sessao.larId)
  const orcamento = await prisma.orcamentoLoja.findFirst({ where: { id, lojaId: loja.id }, select: { ...SELECAO_RESUMO, linkToken: true } })
  if (!orcamento) throw new ErroDeUso("Orçamento não encontrado.", 404)
  const agora = new Date()
  const lar = await prisma.lar.findUnique({ where: { id: sessao.larId }, select: { fusoHorario: true } })
  const situacao = situacaoDoOrcamento(paraResumo(orcamento), agora, lar?.fusoHorario)

  const mudar = async (de: string[], data: Parameters<typeof prisma.orcamentoLoja.updateMany>[0]["data"]) => {
    const feito = await prisma.orcamentoLoja.updateMany({ where: { id: orcamento.id, status: { in: de as never } }, data })
    if (feito.count !== 1) throw new ErroDeUso("O orçamento mudou agora há pouco. Abra de novo.", 409)
  }

  if (dados.acao === "enviar") {
    if (orcamento.status !== "RASCUNHO" && orcamento.status !== "ENVIADO") throw new ErroDeUso("Este orçamento já foi decidido.", 409)
    // Reenviar um vencido sem renovar mandaria um link que diz "venceu".
    const renovado = situacao === "vencido"
    await mudar(["RASCUNHO", "ENVIADO"], {
      status: "ENVIADO",
      // O envio conta na taxa de fechamento pelo primeiro dia; reenviar não
      // é uma oferta nova.
      ...(orcamento.enviadoEm ? {} : { enviadoEm: agora }),
      ...(renovado ? { validoAte: validadeAPartirDeHoje(7, lar?.fusoHorario, agora) } : {}),
    })
    return ok({ link: `/o/${orcamento.linkToken}`, renovado })
  }

  if (!["RASCUNHO", "ENVIADO", "APROVADO"].includes(orcamento.status)) throw new ErroDeUso("Este orçamento já foi vendido ou perdido.", 409)
  if (dados.motivo === "OUTRO" && !dados.detalhe) throw new ErroDeUso("Conte o motivo em poucas palavras.")
  await mudar(["RASCUNHO", "ENVIADO", "APROVADO"], { status: "PERDIDO", perdidoEm: agora, motivoPerda: dados.motivo, motivoPerdaDetalhe: dados.detalhe || null })
  return ok({ status: "PERDIDO" })
})
