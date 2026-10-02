import { prisma } from "@/lib/prisma"
import { comSessao, corpo, ErroDeUso, ok } from "@/lib/api"
import { lojaDoLar } from "@/lib/loja/dados"
import { cnpjValido } from "@/lib/loja/cadastro-mei"

const ATIVIDADES = new Set(["COMERCIO", "INDUSTRIA", "SERVICOS", "COMERCIO_E_SERVICOS", "TRANSPORTE_CARGA"])

export const GET = comSessao(async (sessao) => {
  const [loja, perfil] = await Promise.all([lojaDoLar(sessao.larId), prisma.meiPerfil.findUnique({ where: { larId: sessao.larId } })])
  if (!perfil) throw new ErroDeUso("Esta conta não tem perfil MEI.", 404)
  return ok({ loja: { nome: loja.nome, cnpj: loja.cnpj, inscricaoEstadual: loja.inscricaoEstadual, inscricaoEstadualIsenta: loja.inscricaoEstadualIsenta, telefoneContato: loja.telefoneContato }, perfil: { cnpj: perfil.cnpj, razaoSocial: perfil.razaoSocial, atividade: perfil.atividade, dadosConfirmadosEm: perfil.dadosConfirmadosEm } })
})

export const PUT = comSessao(async (sessao, requisicao) => {
  if (sessao.papel === "FUNCIONARIO_LOJA") throw new ErroDeUso("Só o titular confirma os dados da empresa.", 403)
  const dados = await corpo<{ nome: string; razaoSocial: string; cnpj: string; telefoneContato: string; inscricaoEstadual: string; inscricaoEstadualIsenta: boolean; atividade: string }>(requisicao)
  const nome = dados.nome?.trim()
  const razaoSocial = dados.razaoSocial?.trim()
  const cnpj = dados.cnpj?.replace(/\D/g, "")
  const telefone = dados.telefoneContato?.replace(/\D/g, "")
  const inscricao = dados.inscricaoEstadual?.replace(/\W/g, "").toUpperCase()
  if (!nome || nome.length > 100) throw new ErroDeUso("Informe o nome do negócio (até 100 caracteres).")
  if (!razaoSocial || razaoSocial.length > 160) throw new ErroDeUso("Informe a razão social (até 160 caracteres).")
  if (!cnpjValido(cnpj ?? "")) throw new ErroDeUso("Confira o CNPJ informado.")
  if (!telefone || telefone.length < 10 || telefone.length > 11) throw new ErroDeUso("Informe um telefone com DDD.")
  if (typeof dados.inscricaoEstadualIsenta !== "boolean") throw new ErroDeUso("Informe se a inscrição estadual é isenta.")
  if (!dados.inscricaoEstadualIsenta && (!inscricao || inscricao.length < 3 || inscricao.length > 20)) throw new ErroDeUso("Informe a inscrição estadual ou marque isento.")
  if (!ATIVIDADES.has(dados.atividade)) throw new ErroDeUso("Escolha a atividade do MEI.")
  const loja = await lojaDoLar(sessao.larId)
  const perfil = await prisma.meiPerfil.findUnique({ where: { larId: sessao.larId }, select: { id: true } })
  if (!perfil) throw new ErroDeUso("Esta conta não tem perfil MEI.", 404)
  await prisma.$transaction([
    prisma.loja.update({ where: { id: loja.id }, data: { nome, cnpj, telefoneContato: telefone, inscricaoEstadual: dados.inscricaoEstadualIsenta ? null : inscricao, inscricaoEstadualIsenta: dados.inscricaoEstadualIsenta } }),
    prisma.meiPerfil.update({ where: { id: perfil.id }, data: { cnpj, razaoSocial, atividade: dados.atividade as never, dadosConfirmadosEm: new Date() } }),
  ])
  return ok({ salvo: true })
})
