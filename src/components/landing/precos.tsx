"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight, Check } from "lucide-react"
import type { Plano } from "@/lib/planos"
import { formatarMoeda } from "@/lib/dinheiro"

export function Precos({ planos, dias }: { planos: Plano[]; dias: number }) {
  const [anual, definirAnual] = useState(false)
  return <>
    <div className="lp-ciclo" aria-label="Período de cobrança"><button aria-pressed={!anual} onClick={() => definirAnual(false)}>Mensal</button><button aria-pressed={anual} onClick={() => definirAnual(true)}>Anual</button></div>
    <div className="lp-planos">{planos.map((plano, indice) => <article className="lp-plano" key={plano.codigo} data-destaque={indice === 1}>
      <span className="lp-tag">{indice === 0 ? "Sua vida financeira" : "Sua vida + seu negócio"}</span>
      <h3>{plano.nome}</h3><p>{plano.chamada}</p>
      <div className="lp-preco">{formatarMoeda(anual ? plano.anualCentavos : plano.mensalCentavos)}<small>/{anual ? "ano" : "mês"}</small></div>
      <p className="lp-cobranca">{anual ? "Cobrança única por 12 meses." : "Cobrança mensal."}</p>
      <Link href="/cadastro" className="lp-botao">Testar {dias} dias <ArrowRight size={16} /></Link>
      <ul>{plano.inclui.map(item => <li key={item}><Check size={16} aria-hidden />{item}</li>)}</ul>
      <p className="lp-exclusoes">Não inclui: {plano.naoInclui.join(", ")}.</p>
    </article>)}</div>
  </>
}
