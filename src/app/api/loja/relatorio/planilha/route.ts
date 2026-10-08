import { comSessao, ErroDeUso } from "@/lib/api"
import { dadosDoRelatorio } from "@/lib/loja/relatorio-mei-dados"

export const dynamic = "force-dynamic"

const ROTULO = { com: "com nota", sem: "sem nota", naoMarcado: "não marcado" } as const

/** Texto de planilha: aspas dobradas e nada de fórmula (=, +, -, @) no começo de célula. */
const celula = (valor: string) => `"${(/^[=+\-@\t\r]/.test(valor) ? `'${valor}` : valor).replaceAll('"', '""')}"`
const reais = (centavos: number) => (centavos / 100).toFixed(2).replace(".", ",")

/**
 * As vendas do mês com o status da nota e o número da nota emitida, para o
 * contador abrir no Excel (ponto e vírgula e BOM, que é o que o Excel
 * brasileiro espera).
 */
export const GET = comSessao(async (sessao, requisicao) => {
  const mes = new URL(requisicao.url).searchParams.get("mes") ?? ""
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) throw new ErroDeUso("Informe o mês, assim: 2026-09.")
  const dados = await dadosDoRelatorio(sessao.larId, mes)
  if (!dados) throw new ErroDeUso("Esta conta ainda não tem o Tino negócio.")
  const linhas = [
    ["Venda", "Data", "Cliente", "Valor (R$)", "Nota", "Número da nota"].map(celula).join(";"),
    ...dados.vendas.map((venda) => [String(venda.numero), venda.dia.split("-").reverse().join("/"), venda.cliente ?? "", reais(venda.totalCentavos), ROTULO[venda.status], venda.notaNumero ? String(venda.notaNumero) : ""].map(celula).join(";")),
  ]
  return new Response(`﻿${linhas.join("\r\n")}\r\n`, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="vendas-${mes}.csv"`, "Cache-Control": "no-store" },
  })
})
