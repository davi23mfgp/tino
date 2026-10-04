import { prisma } from "@/lib/prisma"
import { comSessao, corpo, exigir, ok, ErroDeUso } from "@/lib/api"
import { lojaDoLar } from "@/lib/loja/dados"

export const GET = comSessao(async (sessao, requisicao) => {
  const loja = await lojaDoLar(sessao.larId)
  const busca = new URL(requisicao.url).searchParams.get("busca")?.trim()

  const produtos = await prisma.produtoLoja.findMany({
    where: {
      lojaId: loja.id,
      ativo: true,
      ...(busca ? { nome: { contains: busca, mode: "insensitive" as const } } : {}),
    },
    orderBy: { nome: "asc" },
    take: 100,
  })

  return ok({ produtos })
})

/**
 * Cadastra um produto.
 *
 * Nome e preço bastam. Exigir custo, código de barras e categoria antes da
 * primeira venda é o que faz sistema de loja ser abandonado no primeiro sábado
 * cheio — o resto entra depois, com calma.
 */
export const POST = comSessao(async (sessao, requisicao) => {
  const dados = await corpo<{
    nome: string
    precoCentavos: number
    custoCentavos?: number
    codigoBarras?: string
    /// Quantas peças tem hoje: vira a primeira entrada, com o custo informado.
    quantidadeInicial?: number
    estoqueMinimo?: number | null
    sku?: string
    categoriaId?: string | null
    fornecedorId?: string | null
    descricao?: string
    imagemUrl?: string
    marca?: string
    unidade?: string
  }>(requisicao)

  const inteiro = (valor: unknown, campo: string) => {
    if (valor === undefined || valor === null) return undefined
    if (typeof valor !== "number" || !Number.isSafeInteger(valor) || valor < 0 || valor > 2147483647) throw new ErroDeUso(`${campo} inválido.`)
    return valor
  }
  const precoCentavos = inteiro(dados.precoCentavos, "Preço") ?? 0
  const custoCentavos = inteiro(dados.custoCentavos, "Custo") ?? 0
  const quantidadeInicial = inteiro(dados.quantidadeInicial, "Quantidade") ?? 0
  const estoqueMinimo = inteiro(dados.estoqueMinimo, "Aviso de estoque") ?? null
  const nome = exigir(dados.nome, "Informe o nome do produto").trim()
  if (!nome || nome.length > 80) throw new ErroDeUso("Informe um nome de até 80 caracteres.")

  const loja = await lojaDoLar(sessao.larId)
  if (dados.categoriaId && !await prisma.categoriaLoja.findFirst({ where: { id: dados.categoriaId, lojaId: loja.id, arquivada: false } })) throw new ErroDeUso("Categoria não encontrada nesta loja.", 404)
  if (dados.fornecedorId && !await prisma.fornecedorLoja.findFirst({ where: { id: dados.fornecedorId, lojaId: loja.id } })) throw new ErroDeUso("Fornecedor não encontrado nesta loja.", 404)
  if (dados.sku && dados.sku.length > 60) throw new ErroDeUso("SKU deve ter até 60 caracteres.")
  if (dados.sku && await prisma.produtoLoja.findFirst({ where: { lojaId: loja.id, sku: dados.sku.trim() } })) throw new ErroDeUso("Já existe um produto com esse SKU.")
  if (dados.descricao && dados.descricao.length > 500) throw new ErroDeUso("Descrição deve ter até 500 caracteres.")
  if (dados.imagemUrl && (!/^https:\/\//.test(dados.imagemUrl) || dados.imagemUrl.length > 500)) throw new ErroDeUso("Use um endereço HTTPS para a imagem.")
  if (dados.marca && dados.marca.length > 80) throw new ErroDeUso("Marca deve ter até 80 caracteres.")
  if (dados.unidade && dados.unidade.length > 12) throw new ErroDeUso("Unidade deve ter até 12 caracteres.")

  // Produto e primeira entrada juntos: um produto com "tem hoje: 20" que
  // nascesse sem a entrada apareceria com saldo zero, como se tivesse acabado.
  const produto = await prisma.$transaction(async (tx) => {
    const criado = await tx.produtoLoja.create({
      data: {
        lojaId: loja.id,
        nome,
        precoCentavos,
        custoCentavos,
        codigoBarras: dados.codigoBarras?.trim() || null,
        estoqueMinimo,
        sku: dados.sku?.trim() || null,
        categoriaId: dados.categoriaId || null,
        fornecedorId: dados.fornecedorId || null,
        descricao: dados.descricao?.trim() || null,
        imagemUrl: dados.imagemUrl?.trim() || null,
        marca: dados.marca?.trim() || null,
        unidade: dados.unidade?.trim() || "UN",
      },
    })
    if (quantidadeInicial > 0) {
      await tx.movimentoEstoque.create({
        data: { produtoId: criado.id, tipo: "ENTRADA", quantidade: quantidadeInicial, custoUnitarioCentavos: custoCentavos, motivo: "Cadastro do produto" },
      })
    }
    return criado
  })

  return ok({ produto }, 201)
})
