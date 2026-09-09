"use client"

import { useEffect, useState } from "react"
import { Check, AlertTriangle, Info, X } from "lucide-react"
import { cn } from "@/lib/utils"

type ToastVariant = "success" | "error" | "info"
interface ToastAction { label: string; onClick: () => void }
interface ToastItem {
  id: number
  title: string
  description?: string
  variant: ToastVariant
  action?: ToastAction
  duration: number
}

// Emitter em nível de módulo — qualquer código pode chamar showToast().
type Listener = (t: ToastItem) => void
const listeners = new Set<Listener>()
let seq = 0

/**
 * `action` é o que transforma isto em "Desfazer em vez de confirmar" (item
 * 4 do redesign de 07/09/2026): em vez de perguntar "tem certeza?" antes
 * de agir, a ação já roda, e a saída fica disponível por alguns segundos.
 * `duration` sobe de 3s pra 5s quando há ação — precisa de tempo pra ler
 * E decidir, não só ler.
 */
export function showToast(
  title: string,
  opts?: { description?: string; variant?: ToastVariant; action?: ToastAction; duration?: number },
) {
  const t: ToastItem = {
    id: ++seq,
    title,
    description: opts?.description,
    variant: opts?.variant ?? "info",
    action: opts?.action,
    duration: opts?.duration ?? (opts?.action ? 5000 : 3000),
  }
  listeners.forEach(l => l(t))
  return t.id
}

const ICON = { success: Check, error: AlertTriangle, info: Info }
const ACCENT: Record<ToastVariant, string> = {
  success: "text-positivo",
  error: "text-negativo",
  info: "text-acao",
}

/**
 * Toaster — container global. Montar uma vez no layout.
 * Aparece no topo-centro, bg papel-1 + pauta, rounded-[14px].
 */
export function Toaster() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    const onToast = (t: ToastItem) => {
      setToasts(prev => [...prev, t])
      setTimeout(() => setToasts(prev => prev.filter(x => x.id !== t.id)), t.duration)
    }
    listeners.add(onToast)
    return () => { listeners.delete(onToast) }
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-2rem)] max-w-md flex flex-col items-center gap-2 pointer-events-none">
      {toasts.map(t => {
        const Icon = ICON[t.variant]
        return (
          <div key={t.id} role={t.variant === "error" ? "alert" : "status"}
            className={cn(
              "pointer-events-auto flex items-start gap-2.5 w-full",
              "bg-[var(--papel-solido)] border border-pauta rounded-[14px] shadow-lg shadow-black/30",
              "px-4 py-3 spring-slide-up",
            )}>
            <Icon className={cn("w-4 h-4 mt-0.5 flex-shrink-0", ACCENT[t.variant])} strokeWidth={2.2} />
            <div className="min-w-0 flex-1 break-words">
              <p className="text-[14px] font-medium text-foreground leading-snug">{t.title}</p>
              {t.description && <p className="text-[13px] text-muted-fg mt-0.5">{t.description}</p>}
            </div>
            {t.action && (
              <button
                onClick={() => {
                  t.action?.onClick()
                  setToasts(prev => prev.filter(x => x.id !== t.id))
                }}
                className="min-h-11 shrink-0 text-[13px] font-semibold text-acao hover:underline"
              >
                {t.action.label}
              </button>
            )}
            <button onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
              aria-label="Fechar notificação"
              className="grid size-11 place-items-center text-muted-fg hover:text-foreground flex-shrink-0 -mr-2 -mt-2">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
