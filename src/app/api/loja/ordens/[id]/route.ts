import QRCode from "qrcode"

import { prisma } from "@/lib/prisma"
import { comSessao, corpo, ErroDeUso, ok } from "@/lib/api"
import { lojaDoLar } from "@/lib/loja/dados"
import { lerChecklist } from "@/lib/loja/agenda"
import { garantiaDoConserto, lerAcessorios, lerEstado } from "@/lib/loja/assistencia"
import { esquemaDoAparelho, gravacaoDoAparelho } from "@/lib/loja/entrada-aparelho"
import type { TipoDeAparelho } from "@/lib/loja/modelos"
import { SELECAO_ORDEM } from "@/lib/loja/ordens"
import { origemDoLink } from "@/lib/redefinir-senha"
import { campo, validar, z } from "@/lib/validar"

export const dynamic = "force-dynamic"

type Contexto = { params: Promise<{ id: string }> }

async function daLoja(larId: string, id: string) {
  const loja = await lojaDoLar(larId)
  const ordem = await prisma.ordemServicoLoja.findFirst({ where: { id, lojaId: loja.id }, select: { ...SELECAO_ORDEM, senhaCifrada: true } })
  if (!ordem) throw new ErroDeUso("Ordem de serviço não encontrada.", 404)
  return { loja, ordem }
}

/**
 * A ficha da OS. O link vai inteiro: só o dono chega aqui. O QR já vai
 * pronto, em SVG, para a ficha e para o comprovante impresso: o cliente
 * aponta a câmera no balcão e leva o acompanhamento no celular.
 */
export const GET = comSessao<Contexto>(async (sessao, requisicao, contexto) => {
  const { id } = await contexto.params
  const { loja, ordem } = await daLoja(sessao.larId, id)
  const { linkToken, senhaCifrada, ...resto } = ordem
  const link = `/s/${linkToken}`
  // O endereço do QR não sai do cabeçalho Host em produção (ver origemDoLink):
  // QR impresso dura meses na gaveta do cliente e tem de apontar para o Tino.
  const absoluto = `${origemDoLink(process.env, new URL(requisicao.url).origin)}${link}`
  const qr = await QRCode.toString(absoluto, { type: "svg", margin: 1, errorCorrectionLevel: "M" })
  const tipo = (ordem.aparelhoTipo ?? "celular") as TipoDeAparelho
  return ok({
    loja: { nome: loja.nome, telefone: loja.telefoneContato, area: loja.area, subarea: loja.subarea },
    ordem: {
      ...resto,
      checklist: lerChecklist(ordem.checklist),
      acessorios: lerAcessorios(ordem.acessorios),
      estadoEntrada: lerEstado(ordem.estadoEntrada, tipo),
      temSenha: Boolean(senhaCifrada),
      garantia: garantiaDoConserto(ordem.etapasEm as Record<string, string> | null, new Date()),
      link,
      linkAbsoluto: absoluto,
      qr,
    },
  })
})

/**
 * Muda a etapa, a checklist ou os dados da OS. A data de cada etapa é
 * gravada na primeira vez que a OS entra nela: voltar de "pronto" para
 * "fazendo" não apaga quando ficou pronta da primeira vez.
 *
 * Na entrega a senha do aparelho é apagada, e não volta se a OS voltar de
 * etapa: depois de entregue, a loja não tem motivo para guardar a senha.
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
      aparelho: esquemaDoAparelho.optional(),
    }),
    await corpo(requisicao),
  )
  const { ordem } = await daLoja(sessao.larId, id)
  const etapasEm = { ...((ordem.etapasEm as Record<string, string> | null) ?? {}) }
  if (dados.etapa && !etapasEm[dados.etapa]) etapasEm[dados.etapa] = new Date().toISOString()
  const aparelho = dados.aparelho ? gravacaoDoAparelho(dados.aparelho, ordem.linkToken) : {}
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
      ...aparelho,
      ...(dados.etapa === "ENTREGUE" ? { senhaCifrada: null } : {}),
    },
    select: { id: true, etapa: true },
  })
  return ok({ ordem: atualizada })
})
