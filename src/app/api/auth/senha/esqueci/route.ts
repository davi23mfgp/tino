import { after } from "next/server"
import { prisma } from "@/lib/prisma"
import { comPublica, corpo, erro, ok } from "@/lib/api"
import { consumirLimite, ipDaRequisicao, LimiteEstourado, REGRAS } from "@/lib/limite"
import { origemPermitida } from "@/lib/origem-segura"
import { emailConfigurado, gerarTokenDeRedefinicao, origemDoLink, podePedirRedefinicao, VALIDADE_MINUTOS } from "@/lib/redefinir-senha"
import { campo, validar, z } from "@/lib/validar"

/**
 * Pede o link de nova senha. A resposta é a mesma com e sem conta (ver
 * `src/lib/redefinir-senha.ts`); só `emailDisponivel` muda, e ele depende da
 * configuração do Tino, não do e-mail digitado.
 *
 * Procurar a conta, gravar o link e mandar o e-mail ficam para depois da
 * resposta (`after`). Antes, quem tinha conta esperava o envio e quem não
 * tinha recebia a resposta na hora: medindo o tempo, dava para saber quem é
 * cliente do Tino, o mesmo defeito que o login já tinha corrigido.
 */
export const POST = comPublica(async (requisicao: Request) => {
  if (!origemPermitida(requisicao)) return erro("Origem da requisição não permitida.", 403)
  const { email: digitado } = validar(z.object({ email: campo.email() }), await corpo(requisicao))
  const email = (digitado ?? "").trim().toLowerCase()
  if (!email) return erro("Informe o e-mail.")

  const configurado = emailConfigurado(process.env)
  if (!configurado) return ok({ emailDisponivel: false })

  try {
    await consumirLimite(`redefinir:${email}`, REGRAS.redefinir)
    await consumirLimite(`redefinir:ip:${ipDaRequisicao(requisicao)}`, REGRAS.redefinir)
  } catch (excecao) {
    if (excecao instanceof LimiteEstourado) return erro(excecao.message, 429)
    throw excecao
  }

  const origem = origemDoLink(process.env, new URL(requisicao.url).origin)
  after(async () => {
    const usuario = await prisma.usuario.findUnique({ where: { email }, select: { id: true, admin: true, nome: true } })
    if (usuario && podePedirRedefinicao(usuario)) {
      const { token, hash } = gerarTokenDeRedefinicao()
      await prisma.usuario.update({
        where: { id: usuario.id },
        data: { redefinicaoSenhaHash: hash, redefinicaoSenhaExpiraEm: new Date(Date.now() + VALIDADE_MINUTOS * 60_000) },
      })
      const link = `${origem}/redefinir-senha?token=${token}`
      try {
        const { Resend } = await import("resend")
        await new Resend(process.env.RESEND_API_KEY).emails.send({
          from: process.env.EMAIL_REMETENTE!,
          to: email,
          subject: "Criar uma senha nova no Tino",
          text: `Olá, ${usuario.nome.split(" ")[0]}.\n\nPara criar uma senha nova no Tino, abra este link:\n${link}\n\nO link vale por ${VALIDADE_MINUTOS} minutos e funciona uma vez só. Se não foi você que pediu, pode ignorar este e-mail: a sua senha continua a mesma.`,
        })
      } catch {
        // Falha do provedor não muda a resposta: a mensagem igual para todos é
        // o que impede a tela de contar quem tem conta. O log diz o que houve.
        console.error("[tino] falha ao enviar o e-mail de nova senha")
      }
    }
  })
  return ok({ emailDisponivel: true })
})
