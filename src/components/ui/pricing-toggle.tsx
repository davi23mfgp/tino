"use client"

import { cn } from "@/lib/utils"

/**
 * PricingToggle — inspirado no `pricing-interaction` do ln-dev7 (21st.dev).
 *
 * O original usa gradiente de marca e framer-motion; aqui a indicação
 * deslizante é feita só com transição de CSS (o projeto não tem
 * framer-motion instalado, e não valia a pena puxar a dependência por um
 * efeito) e a cor é o `acao` que o Tino já usa — nenhuma cor de marca nova
 * entrou, conforme a regra da paleta travada.
 */
export function PricingToggle({
  valor,
  aoMudar,
  rotuloDesconto,
}: {
  valor: "MENSAL" | "ANUAL"
  aoMudar: (valor: "MENSAL" | "ANUAL") => void
  /** Ex.: "-15%" — mostrado como selo perto da opção anual. */
  rotuloDesconto?: string
}) {
  return (
    <div className="relative inline-flex rounded-[var(--raio-pilula)] bg-foreground/[0.06] p-1 text-[12px]">
      <div
        aria-hidden
        className={cn(
          "absolute inset-y-1 w-[calc(50%-4px)] rounded-[var(--raio-pilula)] bg-acao shadow-sm transition-transform duration-200 ease-[var(--curva)]",
          valor === "ANUAL" ? "translate-x-[calc(100%+8px)]" : "translate-x-0",
        )}
      />
      <button
        type="button"
        onClick={() => aoMudar("MENSAL")}
        className={cn(
          "relative z-10 rounded-[var(--raio-pilula)] px-3.5 py-1.5 font-medium transition-colors",
          valor === "MENSAL" ? "text-white" : "text-muted-fg",
        )}
      >
        mensal
      </button>
      <button
        type="button"
        onClick={() => aoMudar("ANUAL")}
        className={cn(
          "relative z-10 flex items-center gap-1.5 rounded-[var(--raio-pilula)] px-3.5 py-1.5 font-medium transition-colors",
          valor === "ANUAL" ? "text-white" : "text-muted-fg",
        )}
      >
        anual
        {rotuloDesconto && (
          <span
            className={cn(
              "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
              valor === "ANUAL" ? "bg-white/20 text-white" : "bg-positivo/15 text-positivo",
            )}
          >
            {rotuloDesconto}
          </span>
        )}
      </button>
    </div>
  )
}
