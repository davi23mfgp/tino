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
  // `negativo`/`acao` CLAROS falham contraste com texto branco (2,9–3,2:1,
  // abaixo do 4,5:1 exigido) — a faixa usa a variante "-solido", calculada
  // para >=5:1 (ver globals.css). `atencao` já nasceu clara o bastante para
  // hospedar texto escuro em cima, então segue igual.
  critico: "border-negativo/25 bg-negativo/5 text-foreground",
  atencao: "border-atencao/25 bg-atencao/5 text-foreground",
  info: "border-acao/25 bg-acao/5 text-foreground",
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
        "relative mb-5 flex items-center gap-3 rounded-2xl border pl-4 pr-14 py-3 text-left text-[calc(13px*var(--escala-letra))] font-medium",
        TOM[tom],
        className,
      )}
    >
      <span className="min-w-0">{children}</span>
      {acao}
      <button
        onClick={dispensar}
        aria-label="Dispensar aviso"
        // Alvo de 44px, o mínimo de área tocável do spec (PARTE 2). O
        // ícone continua com 14px: quem cresceu foi a área clicável, não o
        // desenho — em 26px o X era um alvo que só acerta com mouse.
        className="absolute right-1 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full opacity-80 transition hover:bg-foreground/10 hover:opacity-100"
      >
        <X className="size-3.5" />
      </button>
    </div>
  )
}
