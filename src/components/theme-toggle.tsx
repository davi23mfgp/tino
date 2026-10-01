"use client"

import { useTheme } from "@/components/theme-provider"
import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"

/**
 * Alternador de tema.
 *
 * Era um switch de 50×28 com bolinha deslizante — a única peça em formato de
 * interruptor na barra inteira, e a mais chamativa dela. Virou um botão de
 * ícone do mesmo tamanho dos vizinhos (sino, atalhos): o tema é uma
 * preferência, não a ação principal da tela.
 */
export function ThemeToggle({ variante = "icone" }: { variante?: "icone" | "menu" }) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // Reserva o espaço antes de montar: sem isso a barra salta na hidratação.
  if (!mounted) return <div className={variante === "menu" ? "h-12 w-full" : "size-11 shrink-0"} />

  const isDark = theme === "dark"

  if (variante === "menu") return <div className="grid grid-cols-2 gap-1 rounded-xl border border-pauta bg-background/40 p-1" role="group" aria-label="Aparência">
    {[{ valor: "light" as const, rotulo: "Claro", Icone: Sun }, { valor: "dark" as const, rotulo: "Escuro", Icone: Moon }].map(({ valor, rotulo, Icone }) => <button key={valor} type="button" aria-pressed={theme === valor} onClick={() => setTheme(valor)} className={"flex min-h-11 items-center justify-center gap-2 rounded-lg text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring " + (theme === valor ? "bg-papel-3 font-medium text-foreground shadow-sm" : "text-muted-fg hover:bg-accent hover:text-foreground")}><Icone className="size-4" aria-hidden />{rotulo}</button>)}
  </div>

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Usar tema claro" : "Usar tema escuro"}
      className="toque grid size-11 shrink-0 place-items-center rounded-full text-muted-fg transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
    >
      {isDark ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
    </button>
  )
}
