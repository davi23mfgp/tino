import { prisma } from "@/lib/prisma"
import { conferirSenha, criarToken, gravarCookieSessao } from "@/lib/auth"
import { comPublica, corpo, erro, exigir, ok } from "@/lib/api"
import { consumirLimite, ipDaRequisicao, liberarLimite, LimiteEstourado, REGRAS } from "@/lib/limite"
import { registrarAcesso } from "@/lib/registro-acesso"
import { criarDesafioMfa } from "@/lib/mfa"
import { entradaPermitida, SEM_MEI } from "@/lib/acesso"
import { origemPermitida } from "@/lib/origem-segura"
import { validar, z, campo } from "@/lib/validar"

/// Hash bcrypt custo 12 de um texto qualquer. Conferir contra ele quando o
/// e-mail não existe faz as duas respostas levarem o mesmo tempo — sem isso o
/// atraso do bcrypt denunciaria quais e-mails têm conta.
const HASH_FALSO = "$2a$12$pUjYLGc.bllSI.9n598Yyu0Xojk4m5altsbg.IDJiYscdr4fI9.c6"

export const POST = comPublica(async (requisicao: Request) => {
  if (!origemPermitida(requisicao)) return erro("Origem da requisição não permitida.", 403)
  const dados = validar(z.object({ email: campo.email(), senha: z.string().min(1).max(128), manterConectado: z.boolean().optional(), produto: z.enum(["pessoal", "mei"]).optional(), porta: z.enum(["admin"]).optional() }), await corpo(requisicao))
  const porta = dados.porta ?? "comum"
  // Cliente antigo sem o campo entrava pelo login pessoal: o MEI sempre mandou.
  // A entrada do admin abre a sessão no pessoal: o painel não é da loja.
  const produto = porta === "admin" ? "pessoal" : dados.produto ?? "pessoal"
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

  const usuario = await prisma.usuario.findUnique({ where: { email }, include: { membro: true, lar: { select: { meiPerfil: { select: { id: true } } } } } })

  // Mesma mensagem para e-mail inexistente e senha errada: respostas diferentes
  // permitiriam descobrir quais e-mails têm conta no sistema.
  const invalido = erro("E-mail ou senha incorretos.", 401)
  const senhaConfere = await conferirSenha(senha, usuario?.senhaHash ?? HASH_FALSO)
  if (!usuario || !senhaConfere) return invalido
  // Mesma recusa da senha errada, para não revelar quais contas são de admin.
  if (!entradaPermitida(porta, usuario.admin)) return invalido

  // Só depois da senha: antes disso a resposta diria quais e-mails têm MEI.
  if (produto === "mei" && !usuario.lar.meiPerfil) return erro(SEM_MEI, 409)

  if (usuario.mfaSegredo) {
    await criarDesafioMfa(usuario.id, dados.manterConectado !== false, produto)
    return ok({ precisaMfa: true })
  }

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
      mfaVersao: usuario.mfaVersao,
      produto,
    }),
    dados.manterConectado !== false,
  )

  // Quem ligou o modo simples entra direto nos seis blocos (passo 50, opção A).
  return ok({ id: usuario.id, nome: usuario.nome, email: usuario.email, ...(produto === "mei" && usuario.modoSimples ? { inicio: "/loja/simples" } : {}) })
})
