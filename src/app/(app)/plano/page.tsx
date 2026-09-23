import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import estilos from "./plano.module.css"
import { PlanoMesAMes } from "./mes-a-mes"

import { sessaoDaPagina } from "@/lib/pagina"
import { competenciaAtual, competenciaMaisMeses, rotuloCompetencia } from "@/lib/datas"
import { formatarMoeda, formatarPercentual } from "@/lib/dinheiro"
import { montarPlanoDoLar } from "@/lib/tino/plano-do-lar"
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

  const alvoDaVez = plano.ordem[0]
  const totalDivida = alvos.reduce((soma, alvo) => soma + alvo.saldoCentavos, 0)
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

      {/* A fila inteira saiu daqui (23/09): a lista de Dívidas já mostra as
          mesmas dívidas na ordem de ataque, e o gráfico e o mês a mês dizem
          quando cada uma acaba — que era o que a fila deixava de dizer. */}
      <PlanoMesAMes passos={plano.passos} ordem={plano.ordem} mesLivre={mesLivre} />

      <Accordion type="single" collapsible>
        <AccordionItem value="criterios">
          <AccordionTrigger>Como este plano foi calculado</AccordionTrigger>
          <AccordionContent><p className={estilos.comoFoi}>{plano.primeiroPasso}</p></AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}
