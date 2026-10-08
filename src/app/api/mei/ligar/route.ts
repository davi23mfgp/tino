/**
 * Liga o Tino negócio numa conta que só tinha o pessoal (passo 40, opção B com A).
 *
 * Só cria: se a conta já tem perfil MEI a rota recusa, em vez de sobrescrever o
 * CNPJ de um negócio que já existe. O histórico da casa não é tocado: o Tino não
 * move nada para o negócio sozinho (regra 5).
 */

import { comSessao, corpo, ErroDeUso, ok } from "@/lib/api"
import { prisma } from "@/lib/prisma"
import { lerCnpj, lerDesde } from "@/lib/loja/ligar-negocio"

export const POST = comSessao(async (sessao, requisicao) => {
  const dados = await corpo<{ cnpj?: string; desde?: string }>(requisicao)
  const cnpj = lerCnpj(dados.cnpj ?? "")
  if (!cnpj.ok) throw new ErroDeUso(cnpj.erro)
  const desde = lerDesde(dados.desde ?? "")
  if (!desde.ok) throw new ErroDeUso(desde.erro)

  const existente = await prisma.meiPerfil.findUnique({ where: { larId: sessao.larId }, select: { id: true } })
  if (existente) throw new ErroDeUso("Esta conta já tem o Tino negócio. Entre pelo login do Tino MEI.")

  await prisma.meiPerfil.create({ data: { larId: sessao.larId, cnpj: cnpj.valor, dataAbertura: desde.valor } })
  return ok({ ligado: true })
})
