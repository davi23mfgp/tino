import { prisma } from "@/lib/prisma"
import { comSessao, ok } from "@/lib/api"
import { chaveDaDescricao } from "@/lib/marcas"
import { logoDaDescoberta } from "@/lib/marcas-ia"

export const dynamic = "force-dynamic"

/**
 * As lojas que a IA identificou nas compras deste lar (camada 4 dos logos).
 *
 * Devolve só as chaves que aparecem nas compras do lar no último ano: a
 * tabela é compartilhada entre lares, e mandar a tabela inteira para o
 * navegador mostraria o que se compra nas outras casas.
 */
export const GET = comSessao(async (sessao) => {
  const desde = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
  const descricoes = await prisma.transacao.findMany({
    where: { larId: sessao.larId, tipo: "DESPESA", data: { gte: desde } },
    select: { descricao: true, descricaoOriginal: true },
    distinct: ["descricao", "descricaoOriginal"],
  })
  const chaves = new Set<string>()
  for (const linha of descricoes) {
    chaves.add(chaveDaDescricao(linha.descricao))
    if (linha.descricaoOriginal) chaves.add(chaveDaDescricao(linha.descricaoOriginal))
  }
  chaves.delete("")
  if (!chaves.size) return ok([])

  const achadas = await prisma.marcaDescoberta.findMany({
    where: { chave: { in: [...chaves] }, situacao: { in: ["IDENTIFICADA", "SUGERIDA"] } },
    select: { chave: true, situacao: true, marcaNome: true, site: true },
  })
  return ok(achadas.map((linha) => ({ ...linha, logoUrl: logoDaDescoberta(linha.marcaNome, linha.site) })))
})
