import { prisma } from "@/lib/prisma"
import { comSessao, corpo, ok } from "@/lib/api"
import { lojaDoLar } from "@/lib/loja/dados"
import { conciliar, lerArquivoDaMaquininha } from "@/lib/loja/maquininha"
import { pagamentosDoBalcao } from "@/lib/loja/maquininha-dados"
import { validar, z } from "@/lib/validar"

export const dynamic = "force-dynamic"

// Um mês de vendas de uma loja pequena cabe com folga; acima disso é outro arquivo.
const TAMANHO_MAXIMO = 2_000_000

/**
 * Confere a planilha da maquininha com o Balcão (item 4.1). Só lê e compara:
 * devolve o que bateu, o que está só de um lado e as correções propostas,
 * que só gravam pela rota de ajustes, com o toque da pessoa (regra 5).
 */
export const POST = comSessao(async (sessao, requisicao) => {
  const { conteudo } = validar(z.object({ conteudo: z.string().min(1).max(TAMANHO_MAXIMO) }), await corpo(requisicao, { bytes: TAMANHO_MAXIMO + 1_000 }))
  const loja = await lojaDoLar(sessao.larId)
  const lar = await prisma.lar.findUnique({ where: { id: sessao.larId }, select: { fusoHorario: true } })
  const leitura = lerArquivoDaMaquininha(conteudo)
  if (leitura.falta || leitura.vendas.length === 0) {
    return ok({ leitura: { cabecalho: leitura.cabecalho, descartadas: leitura.descartadas, falta: leitura.falta ?? "nenhuma venda aprovada no arquivo" }, conciliacao: null })
  }
  const dias = leitura.vendas.map((venda) => venda.dia).sort()
  const balcao = await pagamentosDoBalcao(loja.id, dias[0], dias[dias.length - 1], lar?.fusoHorario ?? "America/Sao_Paulo")
  return ok({
    leitura: { cabecalho: leitura.cabecalho, descartadas: leitura.descartadas, falta: null, vendas: leitura.vendas.length },
    conciliacao: conciliar(leitura.vendas, balcao),
  })
})
