import { prisma } from "@/lib/prisma"
import { comSessao, ErroDeUso, ok } from "@/lib/api"
import { lojaDoLar } from "@/lib/loja/dados"
import { abrirSenhaDaOrdem } from "@/lib/loja/entrada-aparelho"

export const dynamic = "force-dynamic"

/**
 * A senha do aparelho, só quando alguém da loja toca em "Ver senha". Não vem
 * junto da ficha: a ficha fica aberta na tela do balcão, e a senha não precisa
 * ficar à vista de quem passa.
 */
export const GET = comSessao<{ params: Promise<{ id: string }> }>(async (sessao, _requisicao, contexto) => {
  const { id } = await contexto.params
  const loja = await lojaDoLar(sessao.larId)
  const ordem = await prisma.ordemServicoLoja.findFirst({ where: { id, lojaId: loja.id }, select: { senhaCifrada: true, senhaTipo: true, linkToken: true } })
  if (!ordem) throw new ErroDeUso("Ordem de serviço não encontrada.", 404)
  if (!ordem.senhaCifrada) throw new ErroDeUso("Esta OS não tem senha guardada (ou o aparelho já foi entregue).", 404)
  try {
    return ok({ tipo: ordem.senhaTipo, senha: abrirSenhaDaOrdem(ordem.senhaCifrada, ordem.linkToken) })
  } catch {
    throw new ErroDeUso("Não deu para abrir a senha guardada.", 500)
  }
})
