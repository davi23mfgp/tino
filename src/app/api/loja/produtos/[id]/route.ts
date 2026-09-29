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
  const dados = await corpo<{ ncm?: string | null; nome?: unknown; precoCentavos?: unknown; estoqueMinimo?: unknown }>(requisicao)

  const loja = await lojaDoLar(sessao.larId)
  const produto = await prisma.produtoLoja.findFirst({ where: { id, lojaId: loja.id } })
  if (!produto) throw new ErroDeUso("Produto não encontrado nesta loja.", 404)

  const mudancas: { ncm?: string | null; nome?: string; precoCentavos?: number; estoqueMinimo?: number | null } = {}
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

  return ok(await prisma.produtoLoja.update({ where: { id }, data: mudancas }))
})
