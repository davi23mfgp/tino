import { prisma } from "@/lib/prisma"
import { comSessao, corpo, ok, ErroDeUso } from "@/lib/api"
import { lojaDoLar } from "@/lib/loja/dados"
import { ncmValido } from "@/lib/loja/ncm"
import tabelaNcm from "@/lib/loja/ncm-dados.json"

type Contexto = { params: Promise<{ id: string }> }

/// Inteiro não negativo dentro do Int do banco, ou erro com o nome do campo.
function inteiro(valor: unknown, campo: string): number {
  if (typeof valor !== "number" || !Number.isSafeInteger(valor) || valor < 0 || valor > 2147483647) {
    throw new ErroDeUso(`${campo} inválido.`)
  }
  return valor
}

/**
 * Edita o produto: nome, preço, com quantas peças avisar e NCM.
 *
 * Só muda o campo que veio. Antes só existia o NCM, e mandar o corpo sem ele
 * apagava o NCM gravado — com mais campos, isso apagaria a nota fiscal de quem
 * só corrigiu o preço.
 *
 * O NCM confere contra a tabela oficial de verdade, não só o formato — 8
 * dígitos quaisquer passavam antes, e um código que não existe faz a nota ser
 * rejeitada só na hora de emitir, quando já custou a tentativa.
 *
 * Custo não se edita aqui: ele vem das entradas (custo médio). Mudar o custo
 * na mão mudaria a margem das vendas passadas sem nenhuma mercadoria ter
 * mudado de preço.
 */
export const PATCH = comSessao<Contexto>(async (sessao, requisicao, contexto) => {
  const { id } = await contexto.params
  const dados = await corpo<{ ncm?: string | null; nome?: unknown; precoCentavos?: unknown; estoqueMinimo?: unknown; sku?: string | null; categoriaId?: string | null; fornecedorId?: string | null; descricao?: string | null; imagemUrl?: string | null; marca?: string | null; unidade?: string | null }>(requisicao)

  const loja = await lojaDoLar(sessao.larId)
  const produto = await prisma.produtoLoja.findFirst({ where: { id, lojaId: loja.id } })
  if (!produto) throw new ErroDeUso("Produto não encontrado nesta loja.", 404)

  const mudancas: { ncm?: string | null; nome?: string; precoCentavos?: number; estoqueMinimo?: number | null; sku?: string | null; categoriaId?: string | null; fornecedorId?: string | null; descricao?: string | null; imagemUrl?: string | null; marca?: string | null; unidade?: string | null } = {}
  if ("ncm" in dados) {
    const ncm = dados.ncm?.replace(/\D/g, "") || null
    if (ncm && !ncmValido(tabelaNcm, ncm)) throw new ErroDeUso("Esse NCM não existe na tabela oficial.")
    mudancas.ncm = ncm
  }
  if ("nome" in dados) {
    if (typeof dados.nome !== "string" || !dados.nome.trim() || dados.nome.length > 80) throw new ErroDeUso("Informe um nome de até 80 caracteres.")
    mudancas.nome = dados.nome.trim()
  }
  if ("precoCentavos" in dados) mudancas.precoCentavos = inteiro(dados.precoCentavos, "Preço")
  if ("estoqueMinimo" in dados) mudancas.estoqueMinimo = dados.estoqueMinimo === null ? null : inteiro(dados.estoqueMinimo, "Aviso de estoque")
  if ("sku" in dados) {
    if (dados.sku && (typeof dados.sku !== "string" || dados.sku.length > 60)) throw new ErroDeUso("SKU deve ter até 60 caracteres.")
    if (dados.sku && await prisma.produtoLoja.findFirst({ where: { lojaId: loja.id, sku: dados.sku.trim(), id: { not: id } } })) throw new ErroDeUso("Já existe um produto com esse SKU.")
    mudancas.sku = dados.sku?.trim() || null
  }
  if ("categoriaId" in dados) {
    if (dados.categoriaId && !await prisma.categoriaLoja.findFirst({ where: { id: dados.categoriaId, lojaId: loja.id, arquivada: false } })) throw new ErroDeUso("Categoria não encontrada nesta loja.", 404)
    mudancas.categoriaId = dados.categoriaId || null
  }
  if ("fornecedorId" in dados) {
    if (dados.fornecedorId && !await prisma.fornecedorLoja.findFirst({ where: { id: dados.fornecedorId, lojaId: loja.id } })) throw new ErroDeUso("Fornecedor não encontrado nesta loja.", 404)
    mudancas.fornecedorId = dados.fornecedorId || null
  }
  for (const chave of ["descricao", "imagemUrl", "marca", "unidade"] as const) {
    if (chave in dados) {
      const valor = dados[chave]
      const limite = chave === "imagemUrl" || chave === "descricao" ? 500 : 80
      if (valor !== null && valor !== undefined && (typeof valor !== "string" || valor.length > limite)) throw new ErroDeUso(`${chave} inválido.`)
      if (chave === "imagemUrl" && valor && !/^https:\/\//.test(valor)) throw new ErroDeUso("Use um endereço HTTPS para a imagem.")
      mudancas[chave] = valor?.trim() || null
    }
  }

  return ok(await prisma.produtoLoja.update({ where: { id }, data: mudancas }))
})
