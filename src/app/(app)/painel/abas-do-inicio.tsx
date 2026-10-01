"use client"

import { useState } from "react"

import estilos from "./inicio.module.css"

const ABAS = [
  { valor: "hoje", rotulo: "Hoje" },
  { valor: "mes", rotulo: "Mês" },
  { valor: "futuro", rotulo: "Futuro" },
] as const

type Aba = (typeof ABAS)[number]["valor"]

/**
 * Hoje, Mês e Futuro no celular (Davi, 29/09/2026: opção C do canvas, passo 30).
 *
 * A tela inteira em sequência ficava com 4.600 px no celular; com as abas, cada
 * pergunta cabe numa rolagem curta: o que pede você hoje, como foi o mês, o que
 * vem. No computador as abas somem e tudo aparece junto, porque lá há largura
 * para isso (ver `.grupo` em inicio.module.css).
 */
export function AbasDoInicio({ children, carteira }: { children: React.ReactNode; carteira?: React.ReactNode }) {
  const [aba, setAba] = useState<Aba>("hoje")
  return (
    <div className={estilos.grade} data-aba={aba}>
      {carteira}
      <div className={estilos.abas} role="tablist" aria-label="Partes do início">
        {ABAS.map((item) => (
          <button key={item.valor} type="button" role="tab" aria-selected={aba === item.valor} onClick={() => setAba(item.valor)}>
            {item.rotulo}
          </button>
        ))}
      </div>
      {children}
    </div>
  )
}
