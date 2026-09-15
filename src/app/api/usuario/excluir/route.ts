import { comSessao, corpo, ErroDeUso, ok } from "@/lib/api"
import { conferirSenha, limparCookieSessao } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

/**
 * Apagar a conta e tudo que vem com ela.
 *
 * Direito do titular, LGPD art. 18, inciso VI: eliminação dos dados. Não é
 * "desativar", não é "esconder da tela" — é apagar, e é por isso que esta rota
 * apaga o **lar** inteiro quando a pessoa é a última de lá: lançamento, conta,
 * dívida e conversa pendurados num lar sem gente são exatamente o dado pessoal
 * que deveria ter sumido.
 *
 * Pede a senha de novo. A sessão prova que o navegador está logado, não que
 * quem está na frente dele é o dono — e um celular destravado na mesa não pode
 * apagar a vida financeira de ninguém com dois toques.
 *
 * **O que sobrevive, e por quê:** as cobranças já emitidas ficam com o gateway
 * de pagamento (Stripe, Mercado Pago), que tem obrigação fiscal própria e não
 * responde ao Tino. A LGPD prevê isso no art. 16, inciso I — guarda para
 * cumprimento de obrigação legal. Quem quiser apagar lá precisa falar com eles.
 */
export const POST = comSessao(async (sessao, requisicao) => {
  const dados = await corpo<{ senha?: string; confirmacao?: string }>(requisicao)

  if (dados.confirmacao?.trim().toUpperCase() !== "APAGAR") {
    throw new ErroDeUso('Escreva APAGAR para confirmar.')
  }

  const usuario = await prisma.usuario.findUnique({ where: { id: sessao.usuarioId } })
  if (!usuario) throw new ErroDeUso("Conta não encontrada.", 404)

  if (!dados.senha || !(await conferirSenha(dados.senha, usuario.senhaHash))) {
    throw new ErroDeUso("Senha incorreta.", 401)
  }

  const outros = await prisma.usuario.count({ where: { larId: usuario.larId, id: { not: usuario.id } } })

  if (outros === 0) {
    // Última pessoa do lar: o lar vai junto, e as cascatas do banco levam
    // lançamento, conta, cartão, dívida, meta, captura, conversa e o resto.
    await prisma.lar.delete({ where: { id: usuario.larId } })
  } else {
    // Ainda há gente no lar (casal, família): some a pessoa, ficam os dados
    // compartilhados. Apagar o lar aqui apagaria o dinheiro de quem ficou.
    await prisma.usuario.delete({ where: { id: usuario.id } })
  }

  await limparCookieSessao()

  return ok({ apagado: true, larApagado: outros === 0 })
})
