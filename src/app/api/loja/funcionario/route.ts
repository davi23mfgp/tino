import { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { comSessao, corpo, ok, ErroDeUso, exigir } from "@/lib/api"
import { hashSenha } from "@/lib/auth"

/**
 * Login de quem atende o balcão, separado do dono.
 *
 * Só existe um jeito de entrar aqui: o dono cria a senha na hora, na tela de
 * Configurações. Convite por e-mail seria mais "certinho", mas funcionário de
 * loja troca de gente com frequência — o dono quer criar o acesso e já
 * entregar usuário e senha para quem vai usar, não esperar clique de convite.
 */

function exigirDono(papel: string) {
  if (papel === "FUNCIONARIO_LOJA") throw new ErroDeUso("Este login não gerencia quem tem acesso à loja.", 403)
}

export const GET = comSessao(async (sessao) => {
  exigirDono(sessao.papel)

  const funcionarios = await prisma.usuario.findMany({
    where: { larId: sessao.larId, membro: { papel: "FUNCIONARIO_LOJA" } },
    select: { id: true, nome: true, email: true, ultimoLogin: true },
    orderBy: { criadoEm: "asc" },
  })

  return ok({ funcionarios })
})

export const POST = comSessao(async (sessao, requisicao) => {
  exigirDono(sessao.papel)

  const dados = await corpo<{ nome: string; email: string; senha: string }>(requisicao)
  const nome = exigir(dados.nome, "Informe o nome de quem vai usar.").trim()
  const email = exigir(dados.email, "Informe um e-mail.").trim().toLowerCase()
  const senha = exigir(dados.senha, "Defina uma senha.")
  if (senha.length < 8) throw new ErroDeUso("A senha precisa ter ao menos 8 caracteres.")

  const jaExiste = await prisma.usuario.findUnique({ where: { email }, select: { id: true } })
  if (jaExiste) throw new ErroDeUso("Já existe uma conta com esse e-mail.", 409)

  // Membro e usuário juntos: se o segundo falhava (e-mail tomado no mesmo
  // instante), sobrava um membro "funcionário" sem login. E o e-mail repetido
  // que escapa da conferência acima vira 409 com a mesma frase, não erro 500.
  const senhaHash = await hashSenha(senha)
  let usuario: { id: string; nome: string; email: string }
  try {
    usuario = await prisma.$transaction(async (transacao) => {
      const membro = await transacao.membro.create({ data: { larId: sessao.larId, nome, papel: "FUNCIONARIO_LOJA" } })
      return transacao.usuario.create({
        data: { email, nome, senhaHash, larId: sessao.larId, membroId: membro.id },
        select: { id: true, nome: true, email: true },
      })
    })
  } catch (excecao) {
    if (excecao instanceof Prisma.PrismaClientKnownRequestError && excecao.code === "P2002") throw new ErroDeUso("Já existe uma conta com esse e-mail.", 409)
    throw excecao
  }

  return ok({ id: usuario.id, nome: usuario.nome, email: usuario.email }, 201)
})
