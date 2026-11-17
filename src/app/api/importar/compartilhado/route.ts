import { prisma } from "@/lib/prisma"
import { comSessao, ErroDeUso } from "@/lib/api"
import { compartilhadoVencido } from "@/lib/importar/arquivo-compartilhado"

export const dynamic = "force-dynamic"

/**
 * Entrega à tela de importar o arquivo que chegou pelo "Compartilhar" do
 * celular (ver `app/compartilhar/route.ts`) e apaga na hora: é documento de
 * banco, e não há motivo para ficar guardado depois de entregue. Só o próprio
 * usuário busca o seu.
 */
export const GET = comSessao(async (sessao) => {
  const guardado = await prisma.arquivoCompartilhado.findUnique({ where: { usuarioId: sessao.usuarioId } })
  if (guardado) await prisma.arquivoCompartilhado.delete({ where: { usuarioId: sessao.usuarioId } })
  if (!guardado || guardado.larId !== sessao.larId || compartilhadoVencido(guardado.criadoEm, new Date())) {
    throw new ErroDeUso("O arquivo compartilhado não está mais aqui. Compartilhe de novo ou escolha o arquivo.", 404)
  }
  return new Response(new Uint8Array(guardado.conteudo), {
    headers: { "Content-Type": "application/octet-stream", "X-Nome-Do-Arquivo": encodeURIComponent(guardado.nome), "Cache-Control": "no-store" },
  })
})
