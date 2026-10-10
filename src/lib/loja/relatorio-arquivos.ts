import { formatarMoeda } from "@/lib/dinheiro"
import { rotuloCompetencia } from "@/lib/datas"
import { formatarCnpj } from "@/lib/loja/ligar-negocio"
import type { StatusDaNota } from "@/lib/loja/relatorio-mei"
import type { dadosDoRelatorio } from "@/lib/loja/relatorio-mei-dados"

/**
 * Os arquivos do pacote do contador (passo 41): a planilha das vendas, a folha
 * do relatório (HTML que abre em qualquer navegador e imprime em PDF) e o
 * LEIAME. Funções puras sobre os dados do mês, para a tela, a planilha e o
 * pacote contarem a mesma história.
 */

type Dados = NonNullable<Awaited<ReturnType<typeof dadosDoRelatorio>>>

const ROTULO: Record<StatusDaNota, string> = { com: "com nota", sem: "sem nota", pendente: "pendente de nota" }

/** Texto de planilha: aspas dobradas e nada de fórmula (=, +, -, @) no começo de célula. */
const celula = (valor: string) => `"${(/^[=+\-@\t\r]/.test(valor) ? `'${valor}` : valor).replaceAll('"', '""')}"`
const reais = (centavos: number) => (centavos / 100).toFixed(2).replace(".", ",")
const dataBr = (dia: string) => dia.split("-").reverse().join("/")

/** Escapa para HTML: nome de cliente e de arquivo vêm de gente, e o contador abre isto no navegador dele. */
export const escaparHtml = (texto: string) => texto.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;")

/** Nome do arquivo da nota dentro do pacote: ligado à venda, para não haver dois com o mesmo nome. */
export const nomeDaNotaNoPacote = (venda: { numero: number }, nome: string) => `notas/venda-${venda.numero}-${nome}`

/** Ponto e vírgula e BOM: é o que o Excel brasileiro espera. */
export function csvDasVendas(dados: Dados): string {
  const linhas = [
    ["Venda", "Data", "Cliente", "Valor (R$)", "Nota", "Número da nota", "Nota anexada"].map(celula).join(";"),
    ...dados.vendas.map((venda) => [String(venda.numero), dataBr(venda.dia), venda.cliente ?? "", reais(venda.totalCentavos), ROTULO[venda.status], venda.notaNumero ? String(venda.notaNumero) : "", venda.anexo ? nomeDaNotaNoPacote(venda, venda.anexo.nome) : ""].map(celula).join(";")),
  ]
  return `﻿${linhas.join("\r\n")}\r\n`
}

export function htmlDoRelatorio(dados: Dados): string {
  const nome = rotuloCompetencia(dados.competencia)
  const { relatorio } = dados
  const linha = (rotulo: string, l: { comCentavos: number; semCentavos: number; pendenteCentavos: number }) =>
    `<tr><td>${escaparHtml(rotulo)}</td><td class="n">${reais(l.semCentavos)}</td><td class="n">${reais(l.comCentavos)}</td><td class="n">${reais(l.pendenteCentavos)}</td></tr>`
  const vendas = dados.vendas.map((venda) => `<tr><td>${venda.numero}</td><td>${dataBr(venda.dia)}</td><td>${escaparHtml(venda.cliente ?? "")}</td><td class="n">${reais(venda.totalCentavos)}</td><td>${ROTULO[venda.status]}</td><td>${venda.anexo ? escaparHtml(nomeDaNotaNoPacote(venda, venda.anexo.nome)) : venda.notaNumero ? `nota ${venda.notaNumero} (emitida no Tino)` : ""}</td></tr>`).join("")
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">
<title>Relatório Mensal das Receitas Brutas, ${escaparHtml(nome)}</title>
<style>body{font:14px/1.45 system-ui,sans-serif;max-width:780px;margin:32px auto;padding:0 16px;color:#111}h1{font-size:20px;margin:0}table{border-collapse:collapse;width:100%;margin:14px 0}th,td{padding:6px 8px;border-bottom:1px solid #ccc;text-align:left}th{font-size:12px;color:#444}.n{text-align:right;font-variant-numeric:tabular-nums}.total td{font-weight:700;border-top:2px solid #111}small{color:#444}@media print{body{margin:0}}</style></head><body>
<h1>Relatório Mensal das Receitas Brutas</h1>
<p>${escaparHtml(dados.empresa.razaoSocial ?? "MEI")}${dados.empresa.cnpj ? `, CNPJ ${escaparHtml(formatarCnpj(dados.empresa.cnpj))}` : ""}<br>Mês: ${escaparHtml(nome)}</p>
<table><thead><tr><th>Receita (R$)</th><th class="n">sem nota</th><th class="n">com nota</th><th class="n">pendente</th></tr></thead><tbody>
${linha("Revenda de mercadorias (comércio)", relatorio.comercio)}${linha("Venda de produtos que você fabrica (indústria)", relatorio.industria)}${linha("Prestação de serviços", relatorio.servicos)}
<tr class="total"><td>Total do mês</td><td></td><td></td><td class="n">${reais(relatorio.totalCentavos)}</td></tr></tbody></table>
${relatorio.pendenteCentavos > 0 ? `<p><strong>R$ ${reais(relatorio.pendenteCentavos)} ainda pendente:</strong> são vendas em que ninguém anexou a nota nem confirmou que não teve.</p>` : ""}
${dados.usouLancamento ? "<p>Este mês foi lançado à parte, sem separar as vendas: o valor vale o lançamento e fica pendente.</p>" : ""}
<h2 style="font-size:15px">Vendas do mês</h2>
<table><thead><tr><th>Venda</th><th>Data</th><th>Cliente</th><th class="n">Valor (R$)</th><th>Nota</th><th>Arquivo</th></tr></thead><tbody>${vendas}</tbody></table>
<p><small>Modelo do Anexo X da Resolução CGSN 140/2018. Prazo: ${dados.prazo}. Não se entrega a ninguém: guarde por 5 anos, junto das notas de compra e de venda. Indústria o Tino não separa: se você fabrica o que vende, informe ao contador. Regra lida em fontes secundárias em 08/10/2026 (os sites da Receita não abriram); confira no texto oficial.</small></p>
</body></html>
`
}

export function leiameDoPacote(dados: Dados): string {
  const nome = rotuloCompetencia(dados.competencia)
  return [
    `Pacote do contador, ${nome}`,
    "",
    `relatorio-${dados.competencia}.html - a folha do Relatório Mensal das Receitas Brutas. Abra no navegador e imprima ou salve em PDF.`,
    `vendas-${dados.competencia}.csv - as vendas do mês, com o status da nota (abre no Excel).`,
    "notas/ - a cópia da nota de cada venda com nota anexada.",
    "",
    `Vendas: ${dados.vendas.length}. Com nota: ${dados.comNota}. Sem nota: ${dados.semNota}. Pendentes: ${dados.pendentes}.`,
    dados.pendentes > 0 ? "Pendente é a venda em que ninguém anexou a nota nem confirmou que não teve nota." : "",
    "",
    "Gerado pelo Tino. Notas de compra não estão aqui: o Tino ainda não as guarda.",
  ].filter((linha, i, todas) => linha !== "" || todas[i - 1] !== "").join("\n") + "\n"
}
