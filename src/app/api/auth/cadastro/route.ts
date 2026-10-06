import { prisma } from "@/lib/prisma"
import { criarToken, gravarCookieSessao, hashSenha } from "@/lib/auth"
import { comPublica, corpo, erro, exigir, ok } from "@/lib/api"
import { consumirLimite, ipDaRequisicao, LimiteEstourado, REGRAS } from "@/lib/limite"
import { semearLar } from "@/lib/semear"
import { abrirTeste } from "@/lib/acesso-assinatura"
import { registrarAcesso } from "@/lib/registro-acesso"
import { VERSAO_TERMOS } from "@/lib/termos"
import { validar, z, campo } from "@/lib/validar"
import { cnpjValido } from "@/lib/loja/cadastro-mei"
import { origemPermitida } from "@/lib/origem-segura"
import { COOKIE_ORIGEM, origemDaRequisicao } from "@/lib/origem-cadastro"
import { cookies } from "next/headers"
import type { Prisma } from "@prisma/client"

interface Entrada {
  nome: string
  email: string
  senha: string
  tipoLar?: "SOLO" | "CASAL" | "FAMILIA"
  nomeLar?: string
  modoMei?: boolean
  razaoSocial?: string
  cnpj?: string
  telefoneContato?: string
  atividade?: string
  /// Aceite explícito dos Termos e da Política. Sem ele não há conta: é a
  /// prova do consentimento que a LGPD põe no colo do controlador.
  aceiteTermos?: boolean
}

export const POST = comPublica(async (requisicao: Request) => {
  if (!origemPermitida(requisicao)) return erro("Origem da requisição não permitida.", 403)
  // Criação de conta em massa vinda da mesma máquina: cinco por hora.
  try {
    await consumirLimite(`cadastro:ip:${ipDaRequisicao(requisicao)}`, REGRAS.cadastro)
  } catch (excecao) {
    if (excecao instanceof LimiteEstourado) return erro(excecao.message, 429)
    throw excecao
  }

  const dados = validar(z.object({
    nome: campo.textoObrigatorio(80), email: campo.email(), senha: z.string().min(8).max(128),
    tipoLar: z.enum(["SOLO", "CASAL", "FAMILIA"]).optional(), nomeLar: campo.textoObrigatorio(80).optional(),
    modoMei: z.boolean().optional(), razaoSocial: z.string().max(160).optional(), cnpj: z.string().max(24).optional(), telefoneContato: z.string().max(24).optional(), atividade: z.enum(["COMERCIO", "SERVICOS", "COMERCIO_E_SERVICOS", "INDUSTRIA", "TRANSPORTE_CARGA"]).optional(), aceiteTermos: z.literal(true),
  }), await corpo(requisicao))

  const email = exigir(dados.email, "Informe o e-mail").trim().toLowerCase()
  const nome = exigir(dados.nome, "Informe seu nome").trim()
  const senha = exigir(dados.senha, "Informe uma senha")

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return erro("E-mail inválido.")
  if (senha.length < 8) return erro("A senha precisa ter ao menos 8 caracteres.")
  if (senha.length > 128) return erro("A senha pode ter até 128 caracteres.")
  if (nome.length > 80 || email.length > 254) return erro("Nome ou e-mail longo demais.")
  if (dados.aceiteTermos !== true) return erro("Para criar a conta, aceite os Termos de Uso e a Política de Privacidade.")

  if (dados.modoMei) {
    if (!dados.razaoSocial?.trim()) return erro("Informe a razão social.")
    if (!cnpjValido(dados.cnpj ?? "")) return erro("Confira o CNPJ informado.")
    if (!/^\d{10,11}$/.test(dados.telefoneContato?.replace(/\D/g, "") ?? "")) return erro("Informe um telefone com DDD.")
    if (!dados.atividade) return erro("Escolha a atividade do MEI.")
  }

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

  const origemCadastro = origemDaRequisicao(requisicao) as Prisma.InputJsonValue | null
  const usuario = await prisma.usuario.create({
    data: {
      email,
      nome,
      senhaHash: await hashSenha(senha),
      larId: lar.id,
      membroId: membro.id,
      termosVersao: VERSAO_TERMOS,
      termosAceitosEm: new Date(),
      origemCadastro: origemCadastro ?? undefined,
    },
  })

  // Categorias e contas padrão nascem junto: app de finanças que abre vazio
  // faz o usuário desistir antes do primeiro lançamento.
  await semearLar(lar.id, { modoMei: dados.modoMei ?? false })

  if (dados.modoMei) {
    const cnpj = dados.cnpj!.replace(/\D/g, "")
    const telefoneContato = dados.telefoneContato!.replace(/\D/g, "")
    await prisma.meiPerfil.update({ where: { larId: lar.id }, data: { cnpj, razaoSocial: dados.razaoSocial!.trim(), atividade: dados.atividade as never } })
    await prisma.loja.create({ data: { larId: lar.id, nome: dados.razaoSocial!.trim(), cnpj, telefoneContato } })
  }

  // O teste começa aqui e tem data de fim gravada. Antes a tela dizia "você
  // está no teste de 14 dias" e nada criava a assinatura: não havia data para
  // vencer, e o teste nunca terminava.
  await abrirTeste(usuario.id, dados.modoMei ? "loja" : "pessoal")
  await registrarAcesso(requisicao, usuario.id, "CADASTRO")

  await gravarCookieSessao(
    await criarToken({ usuarioId: usuario.id, email, nome, larId: lar.id, membroId: membro.id, papel: membro.papel, produto: dados.modoMei ? "mei" : "pessoal" }),
  )
  // Já está gravada na conta; o cookie não precisa seguir no navegador.
  ;(await cookies()).delete(COOKIE_ORIGEM)

  return ok({ id: usuario.id, nome, email, larId: lar.id }, 201)
})
