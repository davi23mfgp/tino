import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  // Base Apple: pill arredondado, sem borda grossa, cor suave
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-medium transition-colors focus:outline-none",
  {
    variants: {
      variant: {
        // `acao`/`negativo` (a cor CLARA, não a variante "-solido" de botão
        // cheio) — mesmo padrão de pastilha de vidro tingido que
        // success/warning/info/purple abaixo já usavam; `default`/
        // `destructive` eram os dois únicos que ainda vazavam para o
        // `primary`/`destructive` do shadcn (a cor sólida de botão).
        default:     "bg-acao/10 text-acao border border-acao/20",
        secondary:   "bg-papel-2 text-secondary-foreground",
        destructive: "bg-negativo/10 text-negativo border border-negativo/20",
        outline:     "border border-border text-foreground bg-transparent",
        // Sem paleta do Tailwind: as cores fixas (emerald, amber, sky, violet)
        // eram o último lugar do app que ignorava os tokens, e sobreviveram a
        // duas trocas de identidade por estarem escondidas aqui. Agora cada
        // variante usa o token de função correspondente, e segue a escala de
        // cinza junto com o resto.
        success:     "bg-positivo/10 text-positivo border border-positivo/20",
        warning:     "bg-atencao/10 text-atencao border border-atencao/20",
        info:        "bg-dado/10 text-dado border border-dado/20",
        purple:      "bg-destaque/10 text-destaque border border-destaque/20",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
