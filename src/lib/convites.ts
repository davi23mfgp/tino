import { createHash, randomBytes } from "node:crypto"
import { prisma } from "@/lib/prisma"
import { ErroDeUso } from "@/lib/api"
import type { Sessao } from "@/lib/auth"

export const COOKIE_CONVITE = "convite_pendente"
export const hashDoConvite = (token: string) => createHash("sha256").update(token).digest("hex")
export const tokenDeConviteValido = (token: string) => /^[A-Za-z0-9_-]{43}$/.test(token)

export async function criarConvites(sessao: Sessao, emails: string[], origem: string) {
  if (!["TITULAR", "CONJUGE"].includes(sessao.papel)) throw new ErroDeUso("Só os responsáveis podem convidar pessoas.", 403)
  const lar = await prisma.lar.findUniqueOrThrow({ where: { id: sessao.larId }, select: { nome: true, tipo: true } })
  if (lar.tipo === "SOLO") throw new ErroDeUso("Escolha casal ou família antes de convidar.")
  if (emails.includes(sessao.email.toLowerCase())) throw new ErroDeUso("Você já faz parte deste espaço.")
  const resultados = []
  for (const email of [...new Set(emails)]) {
    const token = randomBytes(32).toString("base64url")
    await prisma.conviteLar.create({ data: { larId: sessao.larId, emissorId: sessao.usuarioId, email, tokenHash: hashDoConvite(token), expiraEm: new Date(Date.now() + 7 * 86400000) } })
    const link = `${origem}/convite/${token}`
    let enviado = false
    // Sem remetente verificado, devolvemos o link real; nunca simulamos envio.
    if (process.env.RESEND_API_KEY && process.env.EMAIL_REMETENTE) {
      try {
        const { Resend } = await import("resend")
        const resposta = await new Resend(process.env.RESEND_API_KEY).emails.send({ from: process.env.EMAIL_REMETENTE, to: email, subject: "Convite para compartilhar seu espaço no Tino", text: `${sessao.nome} convidou você para o espaço ${lar.nome}. Ao aceitar, você terá acesso completo ao espaço. Entre com o e-mail ${email} e aceite o convite: ${link}\nO link vale por sete dias.` })
        enviado = !resposta.error
      } catch { /* O link permite concluir o convite mesmo se o serviço de e-mail falhar. */ }
    }
    resultados.push({ email, link, enviado })
  }
  return resultados
}

export async function aceitarConvite(sessao: Sessao, token: string) {
  if (!tokenDeConviteValido(token)) throw new ErroDeUso("Convite inválido.", 404)
  return prisma.$transaction(async (tx) => {
    const convite = await tx.conviteLar.findUnique({ where: { tokenHash: hashDoConvite(token) } })
    if (!convite || convite.expiraEm <= new Date()) throw new ErroDeUso("Este convite expirou ou não existe.", 404)
    const usuario = await tx.usuario.findUniqueOrThrow({ where: { id: sessao.usuarioId } })
    if (usuario.email.toLowerCase() !== convite.email) throw new ErroDeUso("Entre com o e-mail que recebeu o convite.", 403)
    if (usuario.larId === convite.larId) return { larId: usuario.larId, membroId: usuario.membroId, papel: sessao.papel }
    if (convite.aceitoEm) throw new ErroDeUso("Este convite já foi usado.", 409)
    const anterior = await tx.lar.findUniqueOrThrow({ where: { id: usuario.larId }, include: { _count: { select: { usuarios: true, transacoes: true, dividas: true, parcelamentos: true, faturas: true, lojas: true, recorrencias: true, conexoes: true, capturas: true } } } })
    const contaComDados = await tx.conta.count({ where: { larId: usuario.larId, OR: [{ saldoInicialCentavos: { not: 0 } }, { limiteCentavos: { gt: 0 } }] } })
    const metaComDados = await tx.meta.count({ where: { larId: usuario.larId, OR: [{ alvoCentavos: { gt: 0 } }, { saldoCentavos: { gt: 0 } }] } })
    // Uma conta já usada não pode perder acesso ao próprio histórico ao entrar
    // em outro lar. Só o cadastro novo, ainda vazio, pode ser transferido aqui.
    if (anterior._count.usuarios > 1 || Object.entries(anterior._count).some(([nome, total]) => nome !== "usuarios" && total > 0) || contaComDados || metaComDados) throw new ErroDeUso("Seu espaço já tem dados. Use uma conta nova com o e-mail convidado para entrar neste espaço compartilhado, preservando sua conta individual.", 409)
    const consumido = await tx.conviteLar.updateMany({ where: { id: convite.id, aceitoEm: null, expiraEm: { gt: new Date() } }, data: { aceitoEm: new Date() } })
    if (consumido.count !== 1) throw new ErroDeUso("Este convite já foi usado.", 409)
    const membro = await tx.membro.create({ data: { larId: convite.larId, nome: usuario.nome, papel: "CONJUGE" } })
    const atualizado = await tx.usuario.updateMany({ where: { id: usuario.id, larId: usuario.larId }, data: { larId: convite.larId, membroId: membro.id, sessoesValidasDesde: new Date(Math.floor(Date.now() / 1000) * 1000 - 1000) } })
    if (atualizado.count !== 1) throw new ErroDeUso("Sua conta mudou. Entre novamente.", 409)
    return { larId: convite.larId, membroId: membro.id, papel: membro.papel }
  })
}
