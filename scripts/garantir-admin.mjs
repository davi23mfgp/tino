/**
 * Garante a conta de quem administra o Tino, a cada build (29/09/2026).
 *
 * Pedido do Davi: "o admin deve ser a conta admin.tino@gmail.com". O e-mail e
 * a senha vêm do ambiente da Vercel, nunca do repositório: senha em arquivo
 * versionado fica no histórico do git para sempre, mesmo depois de apagada.
 *
 *   ADMIN_EMAIL   a conta que é admin. Sem ela, este arquivo não faz nada.
 *   ADMIN_SENHA   só na primeira publicação: cria a conta se ela não existir.
 *
 * Por que criar aqui, e não pedir para cadastrar pela tela: o cadastro não
 * confere o e-mail. Se o ADMIN_EMAIL fosse só "promover quem tiver esse
 * e-mail", quem se cadastrasse primeiro com ele — antes do Davi — ganharia o
 * painel que vê a conta de todo mundo. Criando no build, a conta nasce já com
 * a senha de quem tem acesso à Vercel.
 *
 * Por que a senha NUNCA é regravada numa conta que já existe: o build roda a
 * cada publicação. Se regravasse, trocar a senha dentro do app duraria só até
 * o próximo deploy, e a senha da Vercel voltaria sem ninguém perceber. Depois
 * da primeira publicação, apague ADMIN_SENHA da Vercel.
 *
 * Não rebaixa outros admins: tirar o acesso de alguém é decisão do dono, com
 * `node scripts/admin.mjs rebaixar <email>`. Aqui só avisa quantos há.
 *
 * Nunca derruba o build: um erro aqui vira aviso no log, e o app publica.
 */
import bcrypt from "bcryptjs"
import { PrismaClient } from "@prisma/client"

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase()
const senha = process.env.ADMIN_SENHA

if (!email) {
  console.log("ADMIN_EMAIL ausente — conta de admin não conferida.")
} else {
  const prisma = new PrismaClient()
  try {
    await garantir(prisma)
  } catch (falha) {
    console.error("[admin] não consegui conferir a conta de admin:", falha instanceof Error ? falha.message : falha)
  } finally {
    await prisma.$disconnect()
  }
}

async function garantir(prisma) {
  const existente = await prisma.usuario.findUnique({ where: { email }, select: { id: true, admin: true } })

  if (existente) {
    // Cadastro comum não comprova posse do e-mail. Promover uma conta antiga
    // só por corresponder ao ADMIN_EMAIL daria privilégio a quem a criou antes.
    if (!existente.admin) {
      console.error("[admin] A conta configurada existe sem privilégio administrativo. Nenhum acesso foi concedido. Confirme a titularidade e use o procedimento explícito de promoção.")
      return
    }
    console.log(`[admin] ${email} já é admin.`)
    if (senha) console.log("[admin] ADMIN_SENHA ignorada: a conta já existe e a senha dela não é regravada. Apague a variável da Vercel.")
  } else {
    if (!senha) {
      console.error(`[admin] ${email} não existe e falta ADMIN_SENHA para criá-la. Nenhuma conta foi criada.`)
      return
    }
    // As mesmas regras do cadastro (`/api/auth/cadastro`) e o mesmo custo do bcrypt (`hashSenha`).
    if (senha.length < 8 || senha.length > 128) {
      console.error("[admin] ADMIN_SENHA precisa ter de 8 a 128 caracteres. Nenhuma conta foi criada.")
      return
    }
    const senhaHash = await bcrypt.hash(senha, 12)
    await prisma.$transaction(async (tx) => {
      const lar = await tx.lar.create({ data: { nome: "Administração do Tino", tipo: "SOLO" } })
      const membro = await tx.membro.create({ data: { larId: lar.id, nome: "Admin", papel: "TITULAR" } })
      await tx.usuario.create({ data: { email, nome: "Admin", senhaHash, larId: lar.id, membroId: membro.id, admin: true } })
    })
    console.log(`[admin] ${email} criada como admin. Apague ADMIN_SENHA da Vercel e troque a senha no app.`)
  }

  const outros = await prisma.usuario.count({ where: { admin: true, NOT: { email } } })
  if (outros > 0) console.log(`[admin] Há mais ${outros} conta(s) admin. Para tirar: node scripts/admin.mjs rebaixar <email>.`)
}
