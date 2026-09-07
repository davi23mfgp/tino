import * as React from "react"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Select nativo — inspirado no `select-native` do originui (21st.dev).
 *
 * Mantém o `<select>` do navegador (teclado, acessibilidade e o menu do
 * sistema operacional continuam de graça) e só padroniza a moldura: mesmo
 * campo que um `<input>` do Tino, com a seta à direita em vez da seta feia
 * do navegador. Substitui as dezenas de `<select className="rounded...">`
 * que cada tela vinha estilizando à mão, sempre um pouco diferente uma da
 * outra.
 *
 * Não é o `<Select>` baseado em Radix que já existe em `ui/select.tsx` —
 * aquele é para lista longa com busca; este é para escolha curta (conta,
 * categoria, tipo) onde o picker nativo do celular é mais rápido de usar
 * que um popover custom.
 */
export const SelectNative = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & { tamanho?: "padrao" | "pilula" }
>(({ className, children, tamanho = "padrao", ...props }, ref) => {
  return (
    <div className="relative inline-block w-full">
      <select
        ref={ref}
        className={cn(
          "peer w-full appearance-none bg-background/60 backdrop-blur-vidro pr-8 text-[13px] outline-none transition-colors",
          "border border-pauta focus:border-acao/50 focus:bg-background",
          "disabled:cursor-not-allowed disabled:opacity-50",
          tamanho === "pilula"
            ? "rounded-[var(--raio-pilula)] px-4 py-2"
            : "rounded-[var(--raio-campo)] px-3.5 py-2.5",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-fg peer-disabled:opacity-50"
      />
    </div>
  )
})
SelectNative.displayName = "SelectNative"
