import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import estilos from "../analise/avancadas.module.css"
import { ArrowDownRight, ArrowUpRight } from "lucide-react"

import { sessaoDaPagina } from "@/lib/pagina"
import { competenciaAtual, rotuloCompetencia } from "@/lib/datas"
import { formatarMoeda, formatarPercentual } from "@/lib/dinheiro"
import { montarPlanoDoLar } from "@/lib/tino/plano-do-lar"
import { cn } from "@/lib/utils"
import { Cartao, Metrica, Vazio } from "@/components/ui/painel"

export const dynamic = "force-dynamic"

export default async function Plano() {
  const sessao = await sessaoDaPagina()
  const competencia = competenciaAtual()

  const { alvos, plano, capacidadeMensalCentavos } = await montarPlanoDoLar(sessao.larId, competencia)

  const primeiroPagamento = plano.passos[0]?.pagamentos[0]
  const totalDivida = alvos.reduce((soma, alvo) => soma + alvo.saldoCentavos, 0)

  return (
    <div className={cn(estilos.pagina, "space-y-4")}>
      <Cartao titulo="Plano de pagamento">
        {alvos.length === 0 ? (
          <Vazio
            titulo="Nenhuma dívida aberta"
            texto="Não há dívidas abertas para organizar."
          />
        ) : (
          <>
            <div className="rounded-[20px] bg-papel-2 p-4 sm:p-5">
              <p className="text-[calc(11px*var(--escala-letra))] font-semibold uppercase tracking-[0.14em] text-muted-fg">Comece neste mês</p>
              <h1 className="mt-2 text-xl font-semibold tracking-tight">
                {primeiroPagamento ? "Seu primeiro pagamento" : "Abra espaço no orçamento"}
              </h1>
              {primeiroPagamento && <><p className="mt-2 text-sm">{primeiroPagamento.nome}</p><p className="valor-inteiro mt-3 text-[calc(30px*var(--escala-letra))] font-bold tracking-tight">{formatarMoeda(primeiroPagamento.valorCentavos)}</p></>}
              <p className="mt-2 text-sm text-muted-fg">
                {primeiroPagamento ? "Confira todos os pagamentos previstos no roteiro." : "Revise gastos antes de assumir novos pagamentos."}
              </p>
              <Button asChild className="mt-4"><Link href={primeiroPagamento ? "#roteiro" : "/orcamento"}>{primeiroPagamento ? "Ver pagamentos do mês" : "Revisar orçamento"}</Link></Button>
            </div>
            <Accordion type="single" collapsible className="mt-2">
              <AccordionItem value="criterios">
                <AccordionTrigger>Como o plano foi calculado</AccordionTrigger>
                <AccordionContent><p className="text-sm leading-relaxed">{plano.primeiroPasso}</p></AccordionContent>
              </AccordionItem>
            </Accordion>

            <div className="mt-4 grade-valores">
              <Metrica rotulo="Dívida total" valor={formatarMoeda(totalDivida)} tom="negativo" />
              <Metrica
                rotulo="Livre em"
                valor={plano.mesesAteLimpar ? `${plano.mesesAteLimpar} meses` : "não fecha"}
                tom={plano.mesesAteLimpar ? "positivo" : "atencao"}
              />
              <Metrica rotulo="Juros no caminho" valor={formatarMoeda(plano.totalJurosCentavos)} tom="atencao" />
              <Metrica
                rotulo="Sobra estimada/mês"
                valor={formatarMoeda(capacidadeMensalCentavos)}
                tom={capacidadeMensalCentavos > 0 ? "positivo" : "negativo"}
              />
            </div>

            {plano.avisos.map((aviso) => (
              <p key={aviso} className="mt-4 rounded-2xl border border-atencao/40 bg-atencao/10 p-3 text-sm text-atencao">
                {aviso}
              </p>
            ))}
          </>
        )}
      </Cartao>

      {alvos.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Cartao titulo="Qual pagar primeiro">
            <ol className="space-y-3">
              {plano.ordem.map((alvo, indice) => (
                <li key={alvo.id} className="flex items-start justify-between gap-3 text-sm">
                  <span className="flex items-start gap-2">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-papel-2 text-[calc(11px*var(--escala-letra))]">
                      {indice + 1}
                    </span>
                    <span>
                      {alvo.nome}
                      <span className="block text-[calc(12px*var(--escala-letra))] text-muted-fg">
                        {alvo.jurosMensalBps > 0
                          ? `${formatarPercentual(alvo.jurosMensalBps)} ao mês`
                          : "sem juros enquanto for paga integral"}
                      </span>
                    </span>
                  </span>
                  <span className="whitespace-nowrap"><span className="valor-inteiro">{formatarMoeda(alvo.saldoCentavos)}</span></span>
                </li>
              ))}
            </ol>
          </Cartao>

          <Cartao titulo="Roteiro mês a mês"><div id="roteiro" className="scroll-mt-28" />
            <Accordion type="single" collapsible defaultValue={plano.passos[0]?.competencia}>
              {plano.passos.map((passo) => (
                <AccordionItem key={passo.competencia} value={passo.competencia}>
                  <AccordionTrigger className="text-left"><span className="linha-financeira w-full text-sm">
                    <span className="font-medium">{rotuloCompetencia(passo.competencia)}</span>
                    <span
                      className={cn(
                        "inline-flex items-center gap-0.5",
                        passo.sobraCentavos < 0 ? "text-negativo" : "text-positivo",
                      )}
                    >
                      {passo.sobraCentavos < 0 ? (
                        <ArrowDownRight aria-hidden className="size-3.5 shrink-0" strokeWidth={2.5} />
                      ) : (
                        <ArrowUpRight aria-hidden className="size-3.5 shrink-0" strokeWidth={2.5} />
                      )}
                      sobra <span className="valor-inteiro">{formatarMoeda(passo.sobraCentavos)}</span>
                    </span>
                  </span></AccordionTrigger><AccordionContent><p className="mt-1 text-[calc(12px*var(--escala-letra))] text-muted-fg">
                    parcelas já contratadas: <span className="valor-inteiro">{formatarMoeda(passo.parcelasFixasCentavos)}</span> · juros do mês:{" "}
                    <span className="valor-inteiro">{formatarMoeda(passo.jurosDoMesCentavos)}</span>
                  </p>

                  {passo.pagamentos.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {passo.pagamentos.map((pagamento) => (
                        <li key={pagamento.id} className="linha-financeira text-xs">
                          <span className="text-muted-fg">
                            {pagamento.nome} <span className="opacity-60">({pagamento.motivo})</span>
                          </span>
                          <span><span className="valor-inteiro">{formatarMoeda(pagamento.valorCentavos)}</span></span>
                        </li>
                      ))}
                    </ul>
                  )}

                  <p className="mt-2 text-xs">
                    resta depois deste mês:{" "}
                    <span className="font-medium"><span className="valor-inteiro">{formatarMoeda(passo.dividaRestanteCentavos)}</span></span>
                  </p>
                </AccordionContent></AccordionItem>
              ))}</Accordion></Cartao></div>
      )}
    </div>
  )
}
