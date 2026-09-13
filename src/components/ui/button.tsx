import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/**
 * Botão do Tino.
 *
 * Reescrito em 13/09/2026 depois de o Davi rejeitar a interface por
 * "controles exagerados". Duas causas estavam aqui dentro:
 *
 * 1. **`rounded-full` em tudo.** Toda ação virava cápsula, inclusive botão
 *    largo. Cápsula é para ação única e curta; em botão largo ela engorda a
 *    tela sem informar nada. O padrão agora é raio de 12px, e a cápsula
 *    virou variante (`forma="pilula"`) para quem realmente precisa.
 * 2. **Todo tamanho tinha 44px de altura** — `xs`, `sm` e `default` eram
 *    todos `h-11`. O mínimo de toque virou altura fixa em qualquer contexto,
 *    e no desktop, onde o alvo é o ponteiro, ficava tudo gigante.
 *
 * A altura agora é responsiva: **44px no celular, 36px do `sm` para cima**.
 * O mínimo de toque continua valendo onde ele existe (dedo) e some onde não
 * faz sentido (mouse) — a mesma conta que a Apple faz: 44pt no iPhone,
 * 28-32px no macOS.
 */

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-40 select-none transition-[background-color,transform] duration-150 active:scale-[0.98] motion-reduce:transform-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-pauta bg-transparent hover:bg-papel-2",
        secondary: "bg-papel-2 text-foreground hover:bg-papel-3",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-acao underline-offset-4 hover:underline",
      },
      size: {
        /** Padrão: 44px no dedo, 36px no ponteiro. */
        default: "h-11 px-4 sm:h-9 sm:px-3.5",
        sm: "h-11 px-3 text-[calc(13px*var(--escala-letra))] sm:h-8 sm:px-3",
        lg: "h-12 px-6 text-[calc(15px*var(--escala-letra))] sm:h-10 sm:px-5",
        icon: "size-11 sm:size-9",
        /** Ação secundária dentro de linha de lista, onde 36px ainda pesa. */
        xs: "h-11 px-2.5 text-xs sm:h-7 sm:px-2",
      },
      forma: {
        /** 12px — o raio de controle do resto do app. */
        padrao: "rounded-xl",
        /** Cápsula: só para ação isolada e curta. */
        pilula: "rounded-full",
      },
    },
    defaultVariants: { variant: "default", size: "default", forma: "padrao" },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, forma, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return <Comp className={cn(buttonVariants({ variant, size, forma, className }))} ref={ref} {...props} />
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }
