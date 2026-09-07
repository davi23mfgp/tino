import * as React from "react"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Checkbox — inspirado no `checkbox` do originui (21st.dev).
 *
 * O `<input type="checkbox">` continua sendo o elemento real (teclado, leitor
 * de tela, `name`/`form` de graça) — só fica visualmente escondido atrás de
 * uma caixinha desenhada que segue os tokens do Tino (raio de campo, azul de
 * ação no marcado) em vez do quadrado cinza padrão do navegador, que era o
 * que `/transacoes`, `/importar` e `/regras` usavam até aqui.
 */
export const Checkbox = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { rotulo?: React.ReactNode }
>(({ className, rotulo, id, ...props }, ref) => {
  const gerado = React.useId()
  const idReal = id ?? gerado

  const caixa = (
    <span className="relative inline-flex size-[18px] shrink-0 items-center justify-center">
      <input
        ref={ref}
        id={idReal}
        type="checkbox"
        className={cn("peer absolute inset-0 size-full cursor-pointer opacity-0", className)}
        {...props}
      />
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 rounded-[6px] border border-pauta bg-background transition-colors",
          "peer-checked:border-acao peer-checked:bg-acao",
          "peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-acao",
          "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        )}
      />
      <Check
        aria-hidden
        strokeWidth={3}
        className="pointer-events-none relative size-3 scale-0 text-primary-foreground opacity-0 transition-transform peer-checked:scale-100 peer-checked:opacity-100"
      />
    </span>
  )

  if (!rotulo) return caixa

  return (
    <label htmlFor={idReal} className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-foreground">
      {caixa}
      {rotulo}
    </label>
  )
})
Checkbox.displayName = "Checkbox"
