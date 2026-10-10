import { prisma } from "@/lib/prisma"
import { comSessao, ErroDeUso } from "@/lib/api"
import { dadosDoRelatorio } from "@/lib/loja/relatorio-mei-dados"
import { csvDasVendas, htmlDoRelatorio, leiameDoPacote, nomeDaNotaNoPacote } from "@/lib/loja/relatorio-arquivos"
import { montarZip } from "@/lib/zip"

export const dynamic = "force-dynamic"

/**
 * O pacote do contador (passo 41): relatório, planilha e as notas anexadas num
 * arquivo só, para a pessoa baixar e mandar. Não envia nada sozinho: mandar
 * por e-mail é o passo seguinte, e é a pessoa quem escolhe para quem.
 */
export const GET = comSessao(async (sessao, requisicao) => {
  const mes = new URL(requisicao.url).searchParams.get("mes") ?? ""
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) throw new ErroDeUso("Informe o mês, assim: 2026-09.")
  const dados = await dadosDoRelatorio(sessao.larId, mes)
  if (!dados) throw new ErroDeUso("Esta conta ainda não tem o Tino negócio.")
  const codificar = (texto: string) => new TextEncoder().encode(texto)
  const anexos = await prisma.notaAnexada.findMany({ where: { vendaId: { in: dados.vendas.filter((venda) => venda.anexo).map((venda) => venda.id) }, venda: { loja: { larId: sessao.larId } } }, select: { vendaId: true, nome: true, conteudo: true } })
  const numeroDaVenda = new Map(dados.vendas.map((venda) => [venda.id, venda.numero]))
  const arquivos = [
    { nome: `relatorio-${mes}.html`, conteudo: codificar(htmlDoRelatorio(dados)) },
    { nome: `vendas-${mes}.csv`, conteudo: codificar(csvDasVendas(dados)) },
    ...anexos.map((anexo) => ({ nome: nomeDaNotaNoPacote({ numero: numeroDaVenda.get(anexo.vendaId) ?? 0 }, anexo.nome), conteudo: new Uint8Array(anexo.conteudo) })),
    { nome: "LEIAME.txt", conteudo: codificar(leiameDoPacote(dados)) },
  ]
  return new Response(new Blob([montarZip(arquivos) as BlobPart]), {
    headers: { "Content-Type": "application/zip", "Content-Disposition": `attachment; filename="pacote-contador-${mes}.zip"`, "X-Content-Type-Options": "nosniff", "Cache-Control": "private, no-store" },
  })
})
