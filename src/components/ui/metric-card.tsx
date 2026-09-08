import { cn } from "@/lib/utils"

type DotColor = "blue" | "green" | "purple" | "yellow" | "orange" | "red" | "teal"

const DOT: Record<DotColor, string> = {
  blue: "bg-acao", green: "bg-positivo", purple: "bg-destaque",
  yellow: "bg-alerta", orange: "bg-atencao", red: "bg-negativo", teal: "bg-dado",
}

interface MetricCardProps {
  label: string
  value: string | number
  dot?: DotColor
  className?: string
}

/**
 * MetricCard — vidro do Tino (`.ios-card`), não mais painel escuro fixo.
 * Bolinha (cinza — os nomes de cor viraram token acromático) no topo, label
 * uppercase, número 26px bold. Sem gradiente de fundo, sem cor fixa de tema
 * escuro: segue o mesmo `.ios-card` do resto do app, que já inverte sozinho.
 */
export function MetricCard({ label, value, dot = "blue", className }: MetricCardProps) {
  return (
    <div className={cn("ios-card px-4 py-4", className)}>
      <div className={cn("h-2.5 w-2.5 rounded-full mb-3", DOT[dot])} />
      <p className="text-[10px] uppercase tracking-widest text-muted-fg mb-1">{label}</p>
      <p className="text-[26px] font-bold leading-none tracking-tight text-foreground">{value}</p>
    </div>
  )
}
