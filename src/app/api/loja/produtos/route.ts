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
