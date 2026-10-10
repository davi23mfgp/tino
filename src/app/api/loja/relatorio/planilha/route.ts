import { comSessao, ErroDeUso } from "@/lib/api"
import { dadosDoRelatorio } from "@/lib/loja/relatorio-mei-dados"
import { csvDasVendas } from "@/lib/loja/relatorio-arquivos"

export const dynamic = "force-dynamic"

/** As vendas do mês com o status da nota, para o contador abrir no Excel. */
export const GET = comSessao(async (sessao, requisicao) => {
  const mes = new URL(requisicao.url).searchParams.get("mes") ?? ""
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) throw new ErroDeUso("Informe o mês, assim: 2026-09.")
  const dados = await dadosDoRelatorio(sessao.larId, mes)
  if (!dados) throw new ErroDeUso("Esta conta ainda não tem o Tino negócio.")
  return new Response(csvDasVendas(dados), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="vendas-${mes}.csv"`, "Cache-Control": "no-store" },
  })
})
