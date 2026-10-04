import { prisma } from "@/lib/prisma"
import { comSessao, corpo, ok, ErroDeUso } from "@/lib/api"
import { lojaDoLar } from "@/lib/loja/dados"
import { campo, validar, z } from "@/lib/validar"

const imagem = z.string().trim().url().max(500).refine((url) => /^https:\/\//i.test(url), "use HTTPS").nullable().optional()
const idOpcional = campo.id().nullable().optional()

async function categoriaDaLoja(lojaId: string, id: string | null | undefined) {
  if (!id) return null
  const categoria = await prisma.categoriaLoja.findFirst({ where: { id, lojaId, arquivada: false } })
  if (!categoria) throw new ErroDeUso("Categoria não encontrada nesta loja.", 404)
  return categoria
}

/** O catálogo é único: balcão, orçamento e serviço leem as mesmas fichas. */
export const GET = comSessao(async (sessao) => {
  const loja = await lojaDoLar(sessao.larId)
  const [categorias, fornecedores, servicos, produtos] = await Promise.all([
    prisma.categoriaLoja.findMany({ where: { lojaId: loja.id }, include: { _count: { select: { produtos: true, servicos: true } } }, orderBy: { nome: "asc" } }),
    prisma.fornecedorLoja.findMany({ where: { lojaId: loja.id }, include: { _count: { select: { produtos: true } } }, orderBy: { nome: "asc" } }),
    prisma.servicoLoja.findMany({ where: { lojaId: loja.id }, include: { categoria: { select: { nome: true } } }, orderBy: { nome: "asc" } }),
    prisma.produtoLoja.findMany({ where: { lojaId: loja.id, ativo: true }, select: { id: true, nome: true, sku: true, categoriaId: true, fornecedorId: true, precoCentavos: true }, orderBy: { nome: "asc" }, take: 500 }),
  ])
  return ok({ categorias, fornecedores, servicos, produtos })
})

const cadastro = z.discriminatedUnion("tipo", [
  z.object({ tipo: z.literal("categoria"), nome: campo.textoObrigatorio(80), imagemUrl: imagem }),
  z.object({ tipo: z.literal("fornecedor"), nome: campo.textoObrigatorio(120), telefone: campo.texto(20).optional(), email: campo.email().optional(), documento: campo.texto(20).optional() }),
  z.object({ tipo: z.literal("servico"), nome: campo.textoObrigatorio(120), descricao: campo.texto(500).optional(), precoCentavos: campo.centavos(), custoEstimadoCentavos: campo.centavos().nullable().optional(), duracaoMinutos: campo.inteiro(1, 1440).nullable().optional(), categoriaId: idOpcional, imagemUrl: imagem }),
])

export const POST = comSessao(async (sessao, requisicao) => {
  const dados = validar(cadastro, await corpo(requisicao))
  const loja = await lojaDoLar(sessao.larId)
  if (dados.tipo === "categoria") {
    const existente = await prisma.categoriaLoja.findFirst({ where: { lojaId: loja.id, nome: { equals: dados.nome, mode: "insensitive" } } })
    if (existente) throw new ErroDeUso("Já existe uma categoria com esse nome.")
    return ok({ categoria: await prisma.categoriaLoja.create({ data: { lojaId: loja.id, nome: dados.nome, imagemUrl: dados.imagemUrl ?? null } }) }, 201)
  }
  if (dados.tipo === "fornecedor") {
    const existente = await prisma.fornecedorLoja.findFirst({ where: { lojaId: loja.id, nome: { equals: dados.nome, mode: "insensitive" } } })
    if (existente) throw new ErroDeUso("Já existe um fornecedor com esse nome.")
    return ok({ fornecedor: await prisma.fornecedorLoja.create({ data: { lojaId: loja.id, nome: dados.nome, telefone: dados.telefone || null, email: dados.email || null, documento: dados.documento || null } }) }, 201)
  }
  await categoriaDaLoja(loja.id, dados.categoriaId)
  return ok({ servico: await prisma.servicoLoja.create({ data: { lojaId: loja.id, nome: dados.nome, descricao: dados.descricao || null, precoCentavos: dados.precoCentavos, custoEstimadoCentavos: dados.custoEstimadoCentavos ?? null, duracaoMinutos: dados.duracaoMinutos ?? null, categoriaId: dados.categoriaId ?? null, imagemUrl: dados.imagemUrl ?? null } }) }, 201)
})

const alteracao = z.discriminatedUnion("tipo", [
  z.object({ tipo: z.literal("categoria"), id: campo.id(), nome: campo.textoObrigatorio(80).optional(), imagemUrl: imagem, arquivada: z.boolean().optional() }),
  z.object({ tipo: z.literal("fornecedor"), id: campo.id(), nome: campo.textoObrigatorio(120).optional(), telefone: campo.texto(20).nullable().optional(), email: campo.email().nullable().optional(), documento: campo.texto(20).nullable().optional() }),
  z.object({ tipo: z.literal("servico"), id: campo.id(), nome: campo.textoObrigatorio(120).optional(), descricao: campo.texto(500).nullable().optional(), precoCentavos: campo.centavos().optional(), custoEstimadoCentavos: campo.centavos().nullable().optional(), duracaoMinutos: campo.inteiro(1, 1440).nullable().optional(), categoriaId: idOpcional, imagemUrl: imagem, ativo: z.boolean().optional() }),
])

export const PATCH = comSessao(async (sessao, requisicao) => {
  const dados = validar(alteracao, await corpo(requisicao))
  const loja = await lojaDoLar(sessao.larId)
  if (dados.tipo === "categoria") {
    const anterior = await prisma.categoriaLoja.findFirst({ where: { id: dados.id, lojaId: loja.id } })
    if (!anterior) throw new ErroDeUso("Categoria não encontrada nesta loja.", 404)
    if (dados.nome && dados.nome.toLowerCase() !== anterior.nome.toLowerCase()) {
      const repetida = await prisma.categoriaLoja.findFirst({ where: { lojaId: loja.id, nome: { equals: dados.nome, mode: "insensitive" } } })
      if (repetida) throw new ErroDeUso("Já existe uma categoria com esse nome.")
    }
    return ok({ categoria: await prisma.categoriaLoja.update({ where: { id: dados.id }, data: { nome: dados.nome, imagemUrl: dados.imagemUrl, arquivada: dados.arquivada } }) })
  }
  if (dados.tipo === "fornecedor") {
    const anterior = await prisma.fornecedorLoja.findFirst({ where: { id: dados.id, lojaId: loja.id } })
    if (!anterior) throw new ErroDeUso("Fornecedor não encontrado nesta loja.", 404)
    if (dados.nome && dados.nome.toLowerCase() !== anterior.nome.toLowerCase()) {
      const repetido = await prisma.fornecedorLoja.findFirst({ where: { lojaId: loja.id, nome: { equals: dados.nome, mode: "insensitive" } } })
      if (repetido) throw new ErroDeUso("Já existe um fornecedor com esse nome.")
    }
    return ok({ fornecedor: await prisma.fornecedorLoja.update({ where: { id: dados.id }, data: { nome: dados.nome, telefone: dados.telefone, email: dados.email, documento: dados.documento } }) })
  }
  const anterior = await prisma.servicoLoja.findFirst({ where: { id: dados.id, lojaId: loja.id } })
  if (!anterior) throw new ErroDeUso("Serviço não encontrado nesta loja.", 404)
  if (dados.categoriaId) await categoriaDaLoja(loja.id, dados.categoriaId)
  return ok({ servico: await prisma.servicoLoja.update({ where: { id: dados.id }, data: { nome: dados.nome, descricao: dados.descricao, precoCentavos: dados.precoCentavos, custoEstimadoCentavos: dados.custoEstimadoCentavos, duracaoMinutos: dados.duracaoMinutos, categoriaId: dados.categoriaId, imagemUrl: dados.imagemUrl, ativo: dados.ativo } }) })
})
