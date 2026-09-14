import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import estilos from "./plano.module.css"

import { sessaoDaPagina } from "@/lib/pagina"
import { competenciaAtual, competenciaMaisMeses, rotuloCompetencia } from "@/lib/datas"
import { formatarMoeda, formatarPercentual } from "@/lib/dinheiro"
import { montarPlanoDoLar } from "@/lib/tino/plano-do-lar"
import { cn } from "@/lib/utils"
import { Cartao, Vazio } from "@/components/ui/painel"

export const dynamic = "force-dynamic"

export default async function Plano() {
  const sessao = await sessaoDaPagina()
  const competencia = competenciaAtual()

  const { alvos, plano, capacidadeMensalCentavos } = await montarPlanoDoLar(sessao.larId, competencia)

  if (alvos.length === 0) {
    return (
      <div className={estilos.pagina}>
        <Cartao titulo="Plano de pagamento">
          <Vazio titulo="Nenhuma dívida aberta" texto="Não há dívidas abertas para organizar." />
        </Cartao>
      </div>
    )
  }

  const primeiroMes = plano.passos[0]
  const alvoDaVez = plano.ordem[0]
  const totalDivida = alvos.reduce((soma, alvo) => soma + alvo.saldoCentavos, 0)
  const maiorSaldo = Math.max(1, ...plano.ordem.map((alvo) => alvo.saldoCentavos))
  const pagamentoDoMes = primeiroMes?.pagamentos.reduce((soma, item) => soma + item.valorCentavos, 0) ?? 0
  // "14 meses" obriga a contar no calendário. A data é a resposta.
  const mesLivre = plano.mesesAteLimpar ? competenciaMaisMeses(competencia, plano.mesesAteLimpar) : null
  // Quanto do caminho já foi andado: o que ainda falta pagar contra tudo que
  // ainda sai do bolso (saldo de hoje mais os juros que o plano ainda cobra).
  const totalDoCaminho = totalDivida + plano.totalJurosCentavos
  const andado = totalDoCaminho > 0 ? Math.min(100, Math.max(0, ((totalDoCaminho - totalDivida) / totalDoCaminho) * 100)) : 0

  return (
    <div className={estilos.pagina}>
      <section className={estilos.livre}>
        <div>
          <p className={estilos.rotulo}>Sua data de liberdade</p>
          <h1>
            {mesLivre ? <>Você fica sem dívida em <em>{rotuloCompetencia(mesLivre)}</em>.</> : <>No ritmo de hoje, a dívida <em>não fecha</em>.</>}
          </h1>
          <p>
            {mesLivre
              ? `Mantendo ${formatarMoeda(capacidadeMensalCentavos)} por mês na fila abaixo, pagando sempre a de juro mais alto primeiro.`
              : "A sobra do mês não cobre nem os juros que correm. Abra espaço no orçamento ou renegocie a taxa antes de seguir o roteiro."}
          </p>
        </div>
        <div className={estilos.regua}>
          <div className={estilos.trilho}><i style={{ width: `${andado}%` }} /></div>
          <div className={estilos.marcos}>
            <span>Falta pagar<b>{formatarMoeda(totalDivida)}</b></span>
            <span>Juros no caminho<b>{formatarMoeda(plano.totalJurosCentavos)}</b></span>
            <span>Sobra por mês<b>{formatarMoeda(capacidadeMensalCentavos)}</b></span>
          </div>
        </div>
      </section>

      <div className={estilos.numeros}>
        <div className={estilos.numero}>
          <p className={estilos.rotulo}>Pague isto em {rotuloCompetencia(competencia)}</p>
          <strong>{formatarMoeda(pagamentoDoMes)}</strong>
          <small>{primeiroMes ? `Já contam ${formatarMoeda(primeiroMes.parcelasFixasCentavos)} de parcelas contratadas e ${formatarMoeda(primeiroMes.jurosDoMesCentavos)} de juros do mês.` : "Sem pagamentos previstos neste mês."}</small>
        </div>
        <div className={cn(estilos.numero, capacidadeMensalCentavos <= 0 && estilos.negativo)}>
          <p className={estilos.rotulo}>Depois deste mês, resta</p>
          <strong>{formatarMoeda(primeiroMes?.dividaRestanteCentavos ?? totalDivida)}</strong>
          <small>De {formatarMoeda(totalDivida)} hoje. Cada mês pago derruba este número.</small>
        </div>
      </div>

      {alvoDaVez && (
        <section className={estilos.alvo}>
          <div>
            <p className={estilos.rotulo}>Ataque esta primeiro</p>
            <h2>{alvoDaVez.nome}</h2>
            <p>
              {alvoDaVez.jurosMensalBps > 0
                ? `Cobra ${formatarPercentual(alvoDaVez.jurosMensalBps)} ao mês — o juro mais caro da sua fila. Todo real extra rende mais aqui do que em qualquer outra dívida.`
                : "Sem juros enquanto for paga integral. Mantenha em dia para não virar rotativo."}
            </p>
            <Button asChild className="mt-4"><Link href="/dividas">Registrar um pagamento</Link></Button>
          </div>
          <div className={estilos.alvoValor}>
            <b>{formatarMoeda(alvoDaVez.saldoCentavos)}</b>
            <small>saldo em aberto</small>
          </div>
        </section>
      )}

      {plano.avisos.map((aviso) => (
        <p key={aviso} className={estilos.aviso}>{aviso}</p>
      ))}

      <div className={estilos.blocos}>
        <section className={estilos.bloco}>
          <h2>A fila inteira</h2>
          <p>Da mais cara para a mais barata. A barra mostra o peso de cada uma no total.</p>
          <ol className={estilos.fila}>
            {plano.ordem.map((alvo, indice) => (
              <li key={alvo.id} data-primeira={indice === 0}>
                <span className={estilos.posicao}>{indice + 1}</span>
                <span>
                  <strong>{alvo.nome}</strong>
                  <small>{alvo.jurosMensalBps > 0 ? `${formatarPercentual(alvo.jurosMensalBps)} ao mês` : "sem juros enquanto for paga integral"}</small>
                </span>
                <b>{formatarMoeda(alvo.saldoCentavos)}</b>
                <span className={estilos.barraFila}><i style={{ width: `${(alvo.saldoCentavos / maiorSaldo) * 100}%` }} /></span>
              </li>
            ))}
          </ol>
        </section>

        <section className={estilos.bloco}>
          <h2>Mês a mês até o fim</h2>
          <p>O que sai em cada mês e quanto sobra de dívida depois dele.</p>
          <div id="roteiro" className="scroll-mt-28" />
          <Accordion type="single" collapsible defaultValue={plano.passos[0]?.competencia} className="mt-2">
            {plano.passos.map((passo) => (
              <AccordionItem key={passo.competencia} value={passo.competencia} className={estilos.mes}>
                <AccordionTrigger className="py-0 hover:no-underline">
                  <span className={estilos.mesTopo}>
                    <span>{rotuloCompetencia(passo.competencia)}</span>
                    <span className={estilos.mesValor}>
                      {formatarMoeda(passo.dividaRestanteCentavos)}
                      <small>ainda devendo</small>
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  {passo.pagamentos.length > 0 && (
                    <ul className={estilos.pagamentos}>
                      {passo.pagamentos.map((pagamento) => (
                        <li key={pagamento.id}>
                          <span>{pagamento.nome}<small>{pagamento.motivo}</small></span>
                          <b>{formatarMoeda(pagamento.valorCentavos)}</b>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className={estilos.restante}>
                    <span>Sobra no mês</span>
                    <b className={passo.sobraCentavos < 0 ? "text-negativo" : "text-positivo"}>{formatarMoeda(passo.sobraCentavos)}</b>
                  </p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      </div>

      <Accordion type="single" collapsible>
        <AccordionItem value="criterios">
          <AccordionTrigger>Como este plano foi calculado</AccordionTrigger>
          <AccordionContent><p className={estilos.comoFoi}>{plano.primeiroPasso}</p></AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}
