import { sessaoDaPagina } from "@/lib/pagina"
import { montarDadosDoFluxo } from "@/lib/fluxo-mensal-dados"
import { FluxoDoMes } from "@/components/fluxo-do-mes"

export const dynamic = "force-dynamic"

/**
 * Fluxo de caixa (Davi, 27/09). Toda a conta está em `lib/fluxo-mensal.ts`; a
 * tela recalcula no navegador quando a pessoa tira ou devolve uma linha.
 */
export default async function Projecao() {
  const sessao = await sessaoDaPagina()
  // "Hoje" no fuso de quem usa: às 22h do dia 30 em São Paulo já é dia 31 em
  // UTC, e o mês corrente perderia um dia de contas.
  const hoje = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" })
  const { contasDoFluxo, ...dados } = await montarDadosDoFluxo(sessao.larId, hoje)
  return <FluxoDoMes dados={dados} contas={contasDoFluxo} />
}
