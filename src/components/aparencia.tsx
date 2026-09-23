"use client"

import { Check, Moon, Sun } from "lucide-react"

import { ACENTOS, useTheme } from "@/components/theme-provider"
import { cn } from "@/lib/utils"

/**
 * Tema e cor de destaque, os dois à vista, sem abrir nada.
 *
 * Pedido do Davi em 23/09: "deixe o Tino dark e white e algumas cores para os
 * usuários brincarem". A troca vale na hora, na tela inteira — é o que torna
 * a escolha uma brincadeira e não um formulário. As cores vêm de
 * `ACENTOS`; os pares de contraste de cada uma estão em `globals.css`.
 */
export function Aparencia() {
  const { theme, setTheme, acento, setAcento } = useTheme()

  return (
    <div className="space-y-4">
      <div role="radiogroup" aria-label="Tema" className="grid grid-cols-2 gap-2">
        {(
          [
            { id: "dark", nome: "Escuro", Icone: Moon },
            { id: "light", nome: "Claro", Icone: Sun },
          ] as const
        ).map(({ id, nome, Icone }) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={theme === id}
            onClick={() => setTheme(id)}
            className={cn(
              "flex min-h-[46px] items-center justify-center gap-2 rounded-full border text-[calc(14px*var(--escala-letra))] font-medium transition-colors",
              theme === id ? "border-transparent bg-primary text-primary-foreground" : "border-pauta bg-papel-1 text-foreground",
            )}
          >
            <Icone className="size-4" aria-hidden />
            {nome}
          </button>
        ))}
      </div>

      <div>
        <p className="mb-2 text-[calc(13px*var(--escala-letra))] text-muted-fg">Cor de destaque</p>
        <div role="radiogroup" aria-label="Cor de destaque" className="flex flex-wrap gap-3">
          {ACENTOS.map((opcao) => {
            const escolhida = acento === opcao.id
            return (
              <button
                key={opcao.id}
                type="button"
                role="radio"
                aria-checked={escolhida}
                aria-label={opcao.nome}
                title={opcao.nome}
                onClick={() => setAcento(opcao.id)}
                className="flex flex-col items-center gap-1.5"
              >
                <span
                  className={cn(
                    "grid size-11 place-items-center rounded-full ring-offset-2 ring-offset-background transition-transform active:scale-95",
                    escolhida ? "ring-2 ring-foreground" : "ring-1 ring-pauta",
                  )}
                  style={{ background: opcao.amostra }}
                >
                  {escolhida && <Check className="size-5 text-[oklch(0.14_0_0)]" aria-hidden />}
                </span>
                <span className="text-[calc(11px*var(--escala-letra))] text-muted-fg">{opcao.nome}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
