import { prisma } from "@/lib/prisma"
import { comSessao, corpo, ErroDeUso, ok } from "@/lib/api"
import { lojaDoLar } from "@/lib/loja/dados"
import { lerChecklist } from "@/lib/loja/agenda"
import { SELECAO_ORDEM } from "@/lib/loja/ordens"
import { campo, validar, z } from "@/lib/validar"

export const dynamic = "force-dynamic"

type Contexto = { params: Promise<{ id: string }> }

async function daLoja(larId: string, id: string) {
  const loja = await lojaDoLar(larId)
  const ordem = await prisma.ordemServicoLoja.findFirst({ where: { id, lojaId: loja.id }, select: SELECAO_ORDEM })
  if (!ordem) throw new ErroDeUso("Ordem de serviço não encontrada.", 404)
  return { loja, ordem }
}

/** A ficha da OS. O link vai inteiro: só o dono chega aqui. */
export const GET = comSessao<Contexto>(async (sessao, _requisicao, contexto) => {
  const { id } = await contexto.params
  const { loja, ordem } = await daLoja(sessao.larId, id)
  const { linkToken, ...resto } = ordem
  return ok({ loja: { nome: loja.nome }, ordem: { ...resto, checklist: lerChecklist(ordem.checklist), link: `/s/${linkToken}` } })
})

/**
 * Muda a etapa, a checklist ou os dados da OS. A data de cada etapa é
 * gravada na primeira vez que a OS entra nela: voltar de "pronto" para
 * "fazendo" não apaga quando ficou pronta da primeira vez.
 */
export const PATCH = comSessao<Contexto>(async (sessao, requisicao, contexto) => {
  const { id } = await contexto.params
  const dados = validar(
    z.object({
      etapa: z.enum(["RECEBIDO", "FAZENDO", "ESPERANDO_PECA", "PRONTO", "ENTREGUE"]).optional(),
      checklist: z.array(z.object({ texto: campo.textoObrigatorio(120), feito: z.boolean() })).max(30).optional(),
      objeto: campo.textoObrigatorio(120).optional(),
      servico: campo.textoObrigatorio(160).optional(),
      naEntrada: campo.texto(500).nullable().optional(),
      prazoEm: campo.data().nullable().optional(),
      valorCentavos: campo.centavos().nullable().optional(),
    }),
    await corpo(requisicao),
  )
  const { ordem } = await daLoja(sessao.larId, id)
  const etapasEm = { ...((ordem.etapasEm as Record<string, string> | null) ?? {}) }
  if (dados.etapa && !etapasEm[dados.etapa]) etapasEm[dados.etapa] = new Date().toISOString()
  const atualizada = await prisma.ordemServicoLoja.update({
    where: { id: ordem.id },
    data: {
      ...(dados.etapa ? { etapa: dados.etapa, etapasEm } : {}),
      ...(dados.checklist ? { checklist: dados.checklist } : {}),
      ...(dados.objeto !== undefined ? { objeto: dados.objeto } : {}),
      ...(dados.servico !== undefined ? { servico: dados.servico } : {}),
      ...(dados.naEntrada !== undefined ? { naEntrada: dados.naEntrada || null } : {}),
      ...(dados.prazoEm !== undefined ? { prazoEm: dados.prazoEm } : {}),
      ...(dados.valorCentavos !== undefined ? { valorCentavos: dados.valorCentavos } : {}),
    },
    select: { id: true, etapa: true },
  })
  return ok({ ordem: atualizada })
})
