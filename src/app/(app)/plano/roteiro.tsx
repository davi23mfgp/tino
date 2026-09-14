"use client"

import { useState } from "react"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import { rotuloCompetencia } from "@/lib/datas"
import { formatarMoeda } from "@/lib/dinheiro"
import estilos from "./plano.module.css"

export interface PassoDoPlano {
  competencia: string
  sobraCentavos: number
  dividaRestanteCentavos: number
  pagamentos: { id: string; nome: string; valorCentavos: number; motivo: string }[]
}

/**
 * Roteiro mês a mês com filtro por ano.
 *
 * Um plano de quitação passa de trinta meses com facilidade, e a lista inteira
 * empilhada não é navegável: a pessoa rola procurando um mês específico. O
 * filtro por ano corta a lista no recorte que ela já tem em mente, e o total
 * de cada ano aparece na própria pílula para a escolha não ser às cegas.
 */
export function RoteiroMeses({ passos }: { passos: PassoDoPlano[] }) {
  const anos = [...new Set(passos.map((passo) => passo.competencia.slice(0, 4)))]
  const [ano, setAno] = useState(anos[0] ?? "")
  const doAno = passos.filter((passo) => passo.competencia.startsWith(ano))

  return (
    <>
      {anos.length > 1 && (
        <div className={estilos.filtroAnos} role="group" aria-label="Ano do roteiro">
          {anos.map((valor) => {
            const meses = passos.filter((passo) => passo.competencia.startsWith(valor)).length
            return (
              <button key={valor} type="button" aria-pressed={ano === valor} onClick={() => setAno(valor)}>
                {valor}
                <small>{meses} {meses === 1 ? "mês" : "meses"}</small>
              </button>
            )
          })}
        </div>
      )}

      <Accordion type="single" collapsible defaultValue={doAno[0]?.competencia} className="mt-2">
        {doAno.map((passo) => (
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
    </>
  )
}
