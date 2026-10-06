import { cookies } from "next/headers"

import { prisma } from "@/lib/prisma"
import { comSessao, corpo, ErroDeUso, ok } from "@/lib/api"
import { COOKIE_NEGOCIO, lojaDoLar } from "@/lib/loja/dados"
import { rotuloDaArea } from "@/lib/loja/areas"
import { campo, validar, z } from "@/lib/validar"

/**
 * Os negócios da conta, para a troca no topo (opção A do passo 38).
 *
 * `mesmoCnpj` liga o aviso de que os negócios somam no mesmo limite: o MEI tem
 * um CNPJ só, e a pessoa que abre "Capinhas" ao lado da assistência pode achar
 * que ganhou um segundo limite de R$ 81 mil.
 */
export const GET = comSessao(async (sessao) => {
  const ativa = await lojaDoLar(sessao.larId)
  const [lojas, perfil] = await Promise.all([
    prisma.loja.findMany({ where: { larId: sessao.larId }, orderBy: { criadoEm: "asc" }, select: { id: true, nome: true, area: true, subarea: true } }),
    prisma.meiPerfil.findUnique({ where: { larId: sessao.larId }, select: { id: true } }),
  ])
  return ok({
    ativoId: ativa.id,
    mesmoCnpj: Boolean(perfil) && lojas.length > 1,
    negocios: lojas.map((loja) => ({ ...loja, rotulo: rotuloDaArea(loja.area, loja.subarea) })),
  })
})

/** Abre um negócio novo e já entra nele; a área é escolhida em seguida, em /loja/comecar. */
export const POST = comSessao(async (sessao, requisicao) => {
  const { nome } = validar(z.object({ nome: campo.textoObrigatorio(60) }), await corpo(requisicao))
  const total = await prisma.loja.count({ where: { larId: sessao.larId } })
  // Teto de bom senso: quem precisa de mais de dez negócios na mesma conta
  // já é caso de sistema de gestão de rede, não de MEI.
  if (total >= 10) throw new ErroDeUso("Esta conta já tem dez negócios.")
  const loja = await prisma.loja.create({ data: { larId: sessao.larId, nome: nome.trim() } })
  ;(await cookies()).set(COOKIE_NEGOCIO, loja.id, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 })
  return ok({ id: loja.id }, 201)
})
