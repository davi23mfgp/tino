import { prisma } from "@/lib/prisma"
import { GrupoCategoria } from "@prisma/client"
import { comSessao, corpo, ok } from "@/lib/api"
import { campo, doLar, validar, z } from "@/lib/validar"

export const GET = comSessao(async (sessao) =>
  ok(
    await prisma.categoria.findMany({
      where: { larId: sessao.larId },
      orderBy: [{ grupo: "asc" }, { ordem: "asc" }, { nome: "asc" }],
      include: { filhas: true },
    }),
  ),
)

export const POST = comSessao(async (sessao, requisicao) => {
  const dados = validar(
    z.object({
      nome: campo.textoObrigatorio(60),
      grupo: z.enum(GrupoCategoria).default("OUTROS"),
      tipo: z.enum(["RECEITA", "DESPESA"]).default("DESPESA"),
      essencial: z.boolean().default(false),
      cor: campo.texto(30).default("blue"),
      icone: campo.texto(40).default("circle"),
      paiId: campo.id().nullish(),
    }),
    await corpo(requisicao),
  )
  await doLar(sessao.larId, { categoria: dados.paiId })

  const categoria = await prisma.categoria.create({
    data: {
      larId: sessao.larId,
      nome: dados.nome,
      grupo: dados.grupo,
      tipo: dados.tipo,
      essencial: dados.essencial,
      cor: dados.cor,
      icone: dados.icone,
      paiId: dados.paiId ?? null,
    },
  })

  return ok(categoria, 201)
})
