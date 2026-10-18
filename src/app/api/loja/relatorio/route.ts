import { comSessao, ErroDeUso, ok } from "@/lib/api"
import { dadosDoRelatorio } from "@/lib/loja/relatorio-mei-dados"

export const dynamic = "force-dynamic"

/** O mês para fechar (passo 41): vendas, status da nota, DAS e o relatório do Anexo X, tudo do banco. */
export const GET = comSessao(async (sessao, requisicao) => {
  const mes = new URL(requisicao.url).searchParams.get("mes") ?? ""
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) throw new ErroDeUso("Informe o mês, assim: 2026-09.")
  const dados = await dadosDoRelatorio(sessao.larId, mes)
  if (!dados) throw new ErroDeUso("Esta conta ainda não tem o Tino negócio.")
  return ok(dados)
})
