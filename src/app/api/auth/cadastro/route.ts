import { prisma } from "@/lib/prisma"
import { criarToken, gravarCookieSessao, hashSenha } from "@/lib/auth"
import { corpo, erro, exigir, ok } from "@/lib/api"
import { consumirLimite, ipDaRequisicao, LimiteEstourado, REGRAS } from "@/lib/limite"
import { semearLar } from "@/lib/semear"
import { abrirTeste } from "@/lib/acesso-assinatura"
import { registrarAcesso } from "@/lib/registro-acesso"
import { VERSAO_TERMOS } from "@/lib/termos"

interface Entrada {
  nome: string
  email: string
  senha: string
  tipoLar?: "SOLO" | "CASAL" | "FAMILIA"
  nomeLar?: string
  modoMei?: boolean
  /// Aceite explícito dos Termos e da Política. Sem ele não há conta: é a
  /// prova do consentimento que a LGPD põe no colo do controlador.
  aceiteTermos?: boolean
}

export async function POST(requisicao: Request) {
  // Criação de conta em massa vinda da mesma máquina: cinco por hora.
  try {
    await consumirLimite(`cadastro:ip:${ipDaRequisicao(requisicao)}`, REGRAS.cadastro)
  } catch (excecao) {
    if (excecao instanceof LimiteEstourado) return erro(excecao.message, 429)
    throw excecao
  }

  const dados = await corpo<Entrada>(requisicao)

  const email = exigir(dados.email, "Informe o e-mail").trim().toLowerCase()
  const nome = exigir(dados.nome, "Informe seu nome").trim()
  const senha = exigir(dados.senha, "Informe uma senha")

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return erro("E-mail inválido.")
  if (senha.length < 8) return erro("A senha precisa ter ao menos 8 caracteres.")
  if (senha.length > 128) return erro("A senha pode ter até 128 caracteres.")
  if (nome.length > 80 || email.length > 254) return erro("Nome ou e-mail longo demais.")
  if (dados.aceiteTermos !== true) return erro("Para criar a conta, aceite os Termos de Uso e a Política de Privacidade.")

  const jaExiste = await prisma.usuario.findUnique({ where: { email }, select: { id: true } })
  if (jaExiste) return erro("Já existe uma conta com esse e-mail.", 409)

  const lar = await prisma.lar.create({
    data: {
      nome: dados.nomeLar?.trim() || `Finanças de ${nome.split(" ")[0]}`,
      tipo: dados.tipoLar ?? "SOLO",
    },
  })

  const membro = await prisma.membro.create({
    data: { larId: lar.id, nome, papel: "TITULAR" },
  })

  const usuario = await prisma.usuario.create({
    data: {
      email,
      nome,
      senhaHash: await hashSenha(senha),
      larId: lar.id,
      membroId: membro.id,
      termosVersao: VERSAO_TERMOS,
      termosAceitosEm: new Date(),
    },
  })

  // Categorias e contas padrão nascem junto: app de finanças que abre vazio
  // faz o usuário desistir antes do primeiro lançamento.
  await semearLar(lar.id, { modoMei: dados.modoMei ?? false })

  // O teste começa aqui e tem data de fim gravada. Antes a tela dizia "você
  // está no teste de 14 dias" e nada criava a assinatura: não havia data para
  // vencer, e o teste nunca terminava.
  await abrirTeste(usuario.id)
  await registrarAcesso(requisicao, usuario.id, "CADASTRO")

  await gravarCookieSessao(
    await criarToken({ usuarioId: usuario.id, email, nome, larId: lar.id, membroId: membro.id, papel: membro.papel }),
  )

  return ok({ id: usuario.id, nome, email, larId: lar.id }, 201)
}
