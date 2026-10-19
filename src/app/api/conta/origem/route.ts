import { prisma } from "@/lib/prisma"
import { comSessao, corpo, ok } from "@/lib/api"
import { campo, validar, z } from "@/lib/validar"
import { RESPOSTAS_ORIGEM } from "@/lib/origem-cadastro"

export const dynamic = "force-dynamic"

/**
 * "Como você conheceu o Tino?" (passo 42, opção A). A resposta fica junto da
 * origem automática, em `declarada`, sem apagar o que veio no link: os dois
 * discordam às vezes (clicou no anúncio, mas foi o contador que mandou), e é
 * a diferença que mostra qual canal empurra e qual só recebe o clique.
 */
export const PUT = comSessao(async (sessao, requisicao) => {
  const dados = validar(
    z.object({ resposta: z.enum(RESPOSTAS_ORIGEM.map((item) => item.id) as [string, ...string[]]), quem: campo.texto(80).nullable().optional() }),
    await corpo(requisicao),
  )
  const usuario = await prisma.usuario.findUnique({ where: { id: sessao.usuarioId }, select: { origemCadastro: true } })
  const atual = (usuario?.origemCadastro ?? {}) as Record<string, unknown>
  await prisma.usuario.update({
    where: { id: sessao.usuarioId },
    data: { origemCadastro: { ...atual, declarada: { resposta: dados.resposta, quem: dados.quem?.trim() || null, em: new Date().toISOString() } } },
  })
  return ok({ salvo: true })
})
