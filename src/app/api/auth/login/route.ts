import { prisma } from "@/lib/prisma"
import { conferirSenha, criarToken, gravarCookieSessao } from "@/lib/auth"
import { corpo, erro, exigir, ok } from "@/lib/api"
import { consumirLimite, ipDaRequisicao, liberarLimite, LimiteEstourado, REGRAS } from "@/lib/limite"
import { registrarAcesso } from "@/lib/registro-acesso"

/// Hash bcrypt custo 12 de um texto qualquer. Conferir contra ele quando o
/// e-mail não existe faz as duas respostas levarem o mesmo tempo — sem isso o
/// atraso do bcrypt denunciaria quais e-mails têm conta.
const HASH_FALSO = "$2a$12$pUjYLGc.bllSI.9n598Yyu0Xojk4m5altsbg.IDJiYscdr4fI9.c6"

export async function POST(requisicao: Request) {
  const dados = await corpo<{ email: string; senha: string }>(requisicao)
  const email = exigir(dados.email, "Informe o e-mail").trim().toLowerCase()
  const senha = exigir(dados.senha, "Informe a senha")

  // Conta a tentativa antes de olhar o banco. Dois limites, e não um: pelo
  // e-mail, para ninguém varrer a senha de uma conta específica; e pelo IP,
  // para uma máquina só não varrer muitas contas de uma vez.
  const porEmail = `login:${email}`
  const porIp = `login:ip:${ipDaRequisicao(requisicao)}`
  try {
    await consumirLimite(porEmail, REGRAS.login)
    await consumirLimite(porIp, REGRAS.login)
  } catch (excecao) {
    if (excecao instanceof LimiteEstourado) return erro(excecao.message, 429)
    throw excecao
  }

  const usuario = await prisma.usuario.findUnique({ where: { email }, include: { membro: true } })

  // Mesma mensagem para e-mail inexistente e senha errada: respostas diferentes
  // permitiriam descobrir quais e-mails têm conta no sistema.
  const invalido = erro("E-mail ou senha incorretos.", 401)
  const senhaConfere = await conferirSenha(senha, usuario?.senhaHash ?? HASH_FALSO)
  if (!usuario || !senhaConfere) return invalido

  // Acertou: o contador não tem por que lembrar das tentativas que deram certo.
  await liberarLimite(porEmail)
  await liberarLimite(porIp)

  await prisma.usuario.update({ where: { id: usuario.id }, data: { ultimoLogin: new Date() } })
  await registrarAcesso(requisicao, usuario.id, "LOGIN")

  await gravarCookieSessao(
    await criarToken({
      usuarioId: usuario.id,
      email: usuario.email,
      nome: usuario.nome,
      larId: usuario.larId,
      membroId: usuario.membroId,
      papel: usuario.membro?.papel ?? "TITULAR",
    }),
  )

  return ok({ id: usuario.id, nome: usuario.nome, email: usuario.email })
}
