import { cn } from "@/lib/utils"

/**
 * Skeleton — placeholder de carregamento (padrão Control.Deal).
 * bg branco translúcido com shimmer; NÃO usar spinner ou "Carregando...".
 */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-2xl bg-white/[0.06]", className)}
      {...props}
    />
  )
}

/**
 * Skeleton de linhas — inspirado no `animated-loading-skeleton` do
 * anurag-mishra22 (21st.dev).
 *
 * Substitui o texto solto "Carregando…" que `/transacoes` e `/assinatura`
 * mostravam (e o nada que `/capturas` mostrava — a lista aparecia vazia por
 * um instante antes de preencher, o que lê como "sem nada aqui" mesmo
 * quando os dados estão a caminho). Cada linha já ocupa a altura real do
 * conteúdo, então a tela não pula quando o skeleton some.
 */
export function EsqueletoLinhas({ linhas = 4, className }: { linhas?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)} aria-hidden role="presentation">
      {Array.from({ length: linhas }).map((_, indice) => (
        <div key={indice} className="flex min-h-[52px] items-center gap-3 rounded-[var(--raio-campo)] px-2 py-2">
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-[min(220px,60%)] bg-foreground/[0.07]" />
            <Skeleton className="h-2.5 w-[min(120px,35%)] bg-foreground/[0.05]" />
          </div>
          <Skeleton className="h-6 w-16 shrink-0 rounded-full bg-foreground/[0.06]" />
          <Skeleton className="h-4 w-16 shrink-0 bg-foreground/[0.07]" />
        </div>
      ))}
    </div>
  )
}
