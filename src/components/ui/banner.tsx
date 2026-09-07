"use client"

import { useEffect, useState } from "react"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Banner — inspirado no `banner` do fuma-nama (21st.dev).
 *
 * Faixa fina no topo da tela, para um aviso que precisa ser visto antes de
 * qualquer outra coisa — não um card na lista, que a pessoa só vê se rolar
 * até ele. Some sozinho quando dispensado, e lembra que foi dispensado (por
 * `id`) até o dia seguinte: um aviso crítico que reaparece a cada F5 vira
 * ruído, mas um que some para sempre esconde um problema real.
 */

type Tom = "critico" | "atencao" | "info"

const TOM: Record<Tom, string> = {
  critico: "bg-negativo text-white",
  atencao: "bg-atencao text-[oklch(0.2_0.02_70)]",
  info: "bg-acao text-white",
}

const CHAVE = (id: string) => `tino:banner-dispensado:${id}`

/** Verdadeiro se este banner já foi dispensado hoje. Lido só no cliente. */
function jaDispensadoHoje(id: string): boolean {
  try {
    return localStorage.getItem(CHAVE(id)) === new Date().toDateString()
  } catch {
    return false
  }
}

export function Banner({
  id,
  tom = "info",
  children,
  acao,
  className,
}: {
  /** Identifica o aviso — dispensar um não esconde os outros, nem o mesmo aviso amanhã. */
  id: string
  tom?: Tom
  children: React.ReactNode
  acao?: React.ReactNode
  className?: string
}) {
  const [visivel, setVisivel] = useState(false)

  useEffect(() => {
    setVisivel(!jaDispensadoHoje(id))
  }, [id])

  if (!visivel) return null

  function dispensar() {
    setVisivel(false)
    try {
      localStorage.setItem(CHAVE(id), new Date().toDateString())
    } catch {
      // Sem storage disponível (aba privada, política do navegador): o banner
      // ainda fecha nesta visita, só não lembra na próxima. Melhor isso do
      // que travar o botão de fechar.
    }
  }

  return (
    <div
      role="status"
      className={cn(
        "relative flex items-center justify-center gap-3 px-4 py-2.5 text-center text-[13px] font-medium",
        TOM[tom],
        className,
      )}
    >
      <span className="min-w-0">{children}</span>
      {acao}
      <button
        onClick={dispensar}
        aria-label="Dispensar aviso"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 opacity-80 transition hover:bg-white/15 hover:opacity-100"
      >
        <X className="size-3.5" />
      </button>
    </div>
  )
}
