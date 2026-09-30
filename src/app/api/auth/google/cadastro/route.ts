import { randomBytes } from "node:crypto"
import { Prisma } from "@prisma/client"
import { cookies } from "next/headers"

import { abrirTeste } from "@/lib/acesso-assinatura"
import { corpo, erro, ok } from "@/lib/api"
import { origemPermitida } from "@/lib/origem-segura"
import { criarToken, gravarCookieSessao, hashSenha } from "@/lib/auth"
import { COOKIE_CADASTRO_GOOGLE, lerCadastroGoogle } from "@/lib/google-login"
import { consumirLimite, ipDaRequisicao, LimiteEstourado, REGRAS } from "@/lib/limite"
import { prisma } from "@/lib/prisma"
import { registrarAcesso } from "@/lib/registro-acesso"
import { semearLar } from "@/lib/semear"
import { VERSAO_TERMOS } from "@/lib/termos"

export async function POST(requisicao: Request) {
  if (!origemPermitida(requisicao)) return erro("Origem da requisição não permitida.", 403)
  try {
    await consumirLimite(`cadastro:ip:${ipDaRequisicao(requisicao)}`, REGRAS.cadastro)
  } catch (excecao) {
    if (excecao instanceof LimiteEstourado) return erro(excecao.message, 429)
    throw excecao
  }

  const jar = await cookies()
  const identidade = await lerCadastroGoogle(jar.get(COOKIE_CADASTRO_GOOGLE)?.value)
  if (!identidade) return erro("Sua confirmação com Google expirou. Tente novamente.", 401)

  let dados: { nome?: unknown; tipoLar?: unknown; modoMei?: unknown; aceiteTermos?: unknown }
  try { dados = await corpo(requisicao); if (!dados || typeof dados !== "object") return erro("Dados inválidos.") } catch { return erro("Dados inválidos.") }
  const nome = typeof dados.nome === "string" ? dados.nome.trim() : ""
  if (!nome || nome.length > 80) return erro("Informe seu nome (até 80 caracteres).")
  if (identidade.email.length > 254) return erro("E-mail longo demais.")
  if (dados.tipoLar !== "SOLO" && dados.tipoLar !== "CASAL" && dados.tipoLar !== "FAMILIA") return erro("Escolha como organiza o dinheiro em casa.")
  if (typeof dados.modoMei !== "boolean") return erro("Escolha o tipo de conta.")
  if (dados.aceiteTermos !== true) return erro("Para criar a conta, aceite os Termos de Uso e a Política de Privacidade.")

  const existente = await prisma.usuario.findFirst({
    where: { OR: [{ email: identidade.email }, { googleId: identidade.googleId }] }, select: { id: true },
  })
  if (existente) return erro("Já existe uma conta com esse Google. Entre pelo login.", 409)

  try {
    // A senha aleatória impede login por senha até que o usuário defina uma.
    const senhaHash = await hashSenha(randomBytes(32).toString("base64url"))
    const { lar, membro, usuario } = await prisma.$transaction(async (tx) => {
      const lar = await tx.lar.create({ data: { nome: `Finanças de ${nome.split(" ")[0]}`, tipo: dados.tipoLar as "SOLO" | "CASAL" | "FAMILIA" } })
      const membro = await tx.membro.create({ data: { larId: lar.id, nome, papel: "TITULAR" } })
      const usuario = await tx.usuario.create({ data: {
        email: identidade.email, nome, googleId: identidade.googleId, senhaHash,
        larId: lar.id, membroId: membro.id, termosVersao: VERSAO_TERMOS, termosAceitosEm: new Date(),
      } })
      return { lar, membro, usuario }
    })

    await semearLar(lar.id, { modoMei: dados.modoMei })
    await abrirTeste(usuario.id)
    await registrarAcesso(requisicao, usuario.id, "CADASTRO")
    await gravarCookieSessao(await criarToken({
      usuarioId: usuario.id, email: usuario.email, nome, larId: lar.id, membroId: membro.id, papel: membro.papel,
    }))
    jar.delete(COOKIE_CADASTRO_GOOGLE)
    return ok({ id: usuario.id, nome, email: usuario.email, larId: lar.id }, 201)
  } catch (excecao) {
    if (excecao instanceof Prisma.PrismaClientKnownRequestError && excecao.code === "P2002") {
      return erro("Já existe uma conta com esse Google. Entre pelo login.", 409)
    }
    throw excecao
  }
}
