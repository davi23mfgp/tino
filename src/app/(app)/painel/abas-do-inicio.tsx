"use client"

import { useEffect, useRef, useState } from "react"

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
  const grade = useRef<HTMLDivElement>(null)
  const [aba, setAba] = useState<Aba>("hoje")
  useEffect(() => {
    const elemento = grade.current
    if (!elemento) return
    const blocos = new Set<HTMLElement>()
    const medir = () => {
      for (const bloco of blocos) {
        const linhas = Math.ceil((bloco.getBoundingClientRect().height + 12) / 16)
        bloco.style.setProperty("--linhas-bloco", String(Math.max(1, linhas)))
      }
    }
    const observador = new ResizeObserver(medir)
    const registrar = () => {
      // Seções podem chegar depois da hidratação pelo streaming do Next.
      // Observar só a lista inicial deixava os blocos novos sobrepostos.
      elemento.querySelectorAll<HTMLElement>("[data-area]").forEach((bloco) => {
        if (!blocos.has(bloco)) { blocos.add(bloco); observador.observe(bloco) }
      })
      medir()
    }
    const mudancas = new MutationObserver(registrar)
    mudancas.observe(elemento, { childList: true, subtree: true })
    registrar()
    return () => { observador.disconnect(); mudancas.disconnect() }
  }, [])
  return (
    <div ref={grade} className={estilos.grade} data-aba={aba}>
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
