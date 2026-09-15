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
    <div className="relative inline-flex rounded-[var(--raio-pilula)] bg-foreground/[0.06] p-1 text-[calc(12px*var(--escala-letra))]">
      <div
        aria-hidden
        className={cn(
          // O indicador é o verde neon da marca e o texto por cima é PRETO —
          // 13,61:1, o mesmo par do botão principal. Branco sobre esse verde
          // daria 1,46:1 e é por isso que a opção ativa não usa branco.
          "absolute inset-y-1 w-[calc(50%-4px)] rounded-[var(--raio-pilula)] bg-acao shadow-sm transition-transform duration-200 ease-[var(--curva)]",
          valor === "ANUAL" ? "translate-x-[calc(100%+8px)]" : "translate-x-0",
        )}
      />
      <button
        type="button"
        onClick={() => aoMudar("MENSAL")}
        className={cn(
          "relative z-10 rounded-[var(--raio-pilula)] px-3.5 py-1.5 font-medium transition-colors",
          valor === "MENSAL" ? "text-[color:var(--background)]" : "text-foreground/70 hover:text-foreground",
        )}
      >
        mensal
      </button>
      <button
        type="button"
        onClick={() => aoMudar("ANUAL")}
        className={cn(
          "relative z-10 flex items-center gap-1.5 rounded-[var(--raio-pilula)] px-3.5 py-1.5 font-medium transition-colors",
          valor === "ANUAL" ? "text-[color:var(--background)]" : "text-foreground/70 hover:text-foreground",
        )}
      >
        anual
        {rotuloDesconto && (
          <span
            className={cn(
              "rounded-full px-1.5 py-0.5 text-[max(10px,calc(12px*var(--escala-letra)))] font-semibold",
              valor === "ANUAL" ? "bg-black/15 text-[color:var(--background)]" : "bg-acao/15 text-acao",
            )}
          >
            {rotuloDesconto}
          </span>
        )}
      </button>
    </div>
  )
}
