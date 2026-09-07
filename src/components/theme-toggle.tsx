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
export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // Reserva o espaço antes de montar: sem isso a barra salta na hidratação.
  if (!mounted) return <div className="size-9 shrink-0" />

  const isDark = theme === "dark"

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Usar tema claro" : "Usar tema escuro"}
      className="toque grid size-9 shrink-0 place-items-center rounded-full text-muted-fg transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
    >
      {isDark ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
    </button>
  )
}
