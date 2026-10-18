import { prisma } from "@/lib/prisma"
import { comPublica, corpo, erro, ok } from "@/lib/api"
import { hashSenha, revogarSessoes } from "@/lib/auth"
import { consumirLimite, ipDaRequisicao, LimiteEstourado, liberarLimite, REGRAS } from "@/lib/limite"
import { origemPermitida } from "@/lib/origem-segura"
import { hashDoToken, podePedirRedefinicao, redefinicaoValida } from "@/lib/redefinir-senha"
import { validar, z } from "@/lib/validar"

/** Grava a senha nova a partir do link. Link vencido, usado ou de admin recebe a mesma recusa. */
export const POST = comPublica(async (requisicao: Request) => {
  if (!origemPermitida(requisicao)) return erro("Origem da requisição não permitida.", 403)
  try {
    await consumirLimite(`redefinir:ip:${ipDaRequisicao(requisicao)}`, REGRAS.login)
  } catch (excecao) {
    if (excecao instanceof LimiteEstourado) return erro(excecao.message, 429)
    throw excecao
  }
  const dados = validar(z.object({ token: z.string().min(20).max(100), senha: z.string().min(8, "Use pelo menos 8 caracteres.").max(128) }), await corpo(requisicao))
  const vencido = erro("Este link expirou ou já foi usado. Peça outro na tela de entrar.", 400)

  const usuario = await prisma.usuario.findUnique({
    where: { redefinicaoSenhaHash: hashDoToken(dados.token!) },
    select: { id: true, email: true, admin: true, redefinicaoSenhaHash: true, redefinicaoSenhaExpiraEm: true },
  })
  if (!usuario || !podePedirRedefinicao(usuario) || !redefinicaoValida(usuario, new Date())) return vencido

  // Condicional pelo hash: dois cliques no mesmo link não trocam a senha duas vezes.
  const trocou = await prisma.usuario.updateMany({
    where: { id: usuario.id, redefinicaoSenhaHash: usuario.redefinicaoSenhaHash },
    data: { senhaHash: await hashSenha(dados.senha!), redefinicaoSenhaHash: null, redefinicaoSenhaExpiraEm: null },
  })
  if (trocou.count === 0) return vencido
  await revogarSessoes(usuario.id)
  await liberarLimite(`login:${usuario.email}`)
  return ok({ trocada: true })
})
