"use client"

import { useState } from "react"
import { Smile } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Escolha de emoji por toque, não por digitação.
 *
 * O campo anterior era um `<input>` de texto com o emoji dentro. Dois
 * defeitos apareceram nas capturas de 13/09: ele mostrava o identificador
 * técnico guardado no banco (a palavra "circle", que é nome de ícone Lucide
 * de uma versão antiga) como se fosse conteúdo do usuário, e ocupava a
 * largura de um campo inteiro para caber um caractere.
 *
 * Aqui a grade é a interface. O valor continua sendo texto simples — emoji
 * é texto, nunca HTML — e quem quiser um que não está na grade digita no
 * campo pequeno ao lado.
 */

/** Agrupados pelo que a pessoa procura, não pela ordem do Unicode. */
const GRADE: { titulo: string; emojis: string[] }[] = [
  { titulo: "Casa", emojis: ["🏠", "🛋️", "🔑", "💡", "💧", "🔥", "🧹", "🪑", "🧾", "📦"] },
  { titulo: "Comida", emojis: ["🛒", "🍽️", "🍕", "🍔", "☕", "🍺", "🥗", "🛵", "🍞", "🧃"] },
  { titulo: "Transporte", emojis: ["🚗", "⛽", "🚕", "🚌", "🚲", "✈️", "🛣️", "🅿️", "🛞", "🚇"] },
  { titulo: "Saúde", emojis: ["🩺", "💊", "🦷", "👓", "🏋️", "🧘", "🏥", "🧴", "🩹", "🧬"] },
  { titulo: "Vida", emojis: ["📚", "🎓", "🎟️", "🎬", "🎮", "🎁", "✂️", "👕", "🐾", "🧸"] },
  { titulo: "Dinheiro", emojis: ["💰", "💵", "💳", "🏦", "📈", "📉", "🧮", "🪙", "↔️", "⚖️"] },
]

export function SeletorEmoji({
  valor,
  aoMudar,
  desabilitado,
  rotulo = "Emoji",
}: {
  valor: string
  aoMudar: (emoji: string) => void
  desabilitado?: boolean
  rotulo?: string
}) {
  const [aberto, setAberto] = useState(false)
  const escolhido = /\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(valor) ? valor : ""

  return (
    <div className="relative">
      <button
        type="button"
        disabled={desabilitado}
        onClick={() => setAberto((atual) => !atual)}
        aria-expanded={aberto}
        aria-label={escolhido ? `${rotulo}: ${escolhido}. Trocar` : `Escolher ${rotulo.toLowerCase()}`}
        className="grid size-11 place-items-center rounded-[12px] border border-pauta bg-papel-2 text-xl hover:bg-papel-3"
      >
        {escolhido || <Smile aria-hidden className="size-[18px] text-[color:var(--texto-3)]" strokeWidth={1.8} />}
      </button>

      {aberto && (
        <>
          {/* Fecha ao tocar fora sem prender o foco: a grade é escolha
              rápida, não um diálogo com decisão a confirmar. */}
          <button
            type="button"
            aria-label="Fechar seletor de emoji"
            onClick={() => setAberto(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div
            className="absolute left-0 top-full z-50 mt-1 max-h-72 w-[min(310px,calc(100vw-2rem))] overflow-y-auto overscroll-contain rounded-[14px] border border-pauta bg-popover p-2 shadow-[var(--sombra-flutuante)]"
            role="dialog"
            aria-label="Escolher emoji"
          >
            {GRADE.map((secao) => (
              <div key={secao.titulo} className="mb-1.5 last:mb-0">
                <p className="px-1 pb-1 text-[11px] uppercase tracking-[0.1em] text-[color:var(--texto-3)]">
                  {secao.titulo}
                </p>
                <div className="grid grid-cols-10 gap-0.5">
                  {secao.emojis.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        aoMudar(emoji)
                        setAberto(false)
                      }}
                      aria-label={emoji}
                      aria-pressed={emoji === escolhido}
                      className={cn(
                        "grid aspect-square place-items-center rounded-lg text-lg hover:bg-papel-2",
                        emoji === escolhido && "bg-accent",
                      )}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <label className="mt-1 flex items-center gap-2 border-t border-pauta px-1 pt-2 text-xs text-muted-fg">
              Outro
              <input
                value={escolhido}
                onChange={(evento) => aoMudar(evento.target.value)}
                maxLength={8}
                placeholder="🙂"
                aria-label="Digitar outro emoji"
                className="h-9 w-16 rounded-lg border border-pauta bg-papel-2 text-center text-lg"
              />
              {escolhido && (
                <button
                  type="button"
                  onClick={() => {
                    aoMudar("")
                    setAberto(false)
                  }}
                  className="ml-auto min-h-9 px-2 text-xs text-muted-fg hover:text-foreground"
                >
                  Remover
                </button>
              )}
            </label>
          </div>
        </>
      )}
    </div>
  )
}
