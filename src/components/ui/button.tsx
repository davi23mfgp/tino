import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[12px] text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-40 select-none",
  {
    variants: {
      variant: {
        // `--primary` já é a variante "solido" do azul de ação (calculada
        // para >=5:1 com texto branco — o `acao` claro normal falha nisso,
        // ver globals.css). Realce de vidro: traço de luz no topo +
        // elevação leve no hover, sem exagerar (é o botão que mais aparece
        // na tela).
        default:
          "bg-primary text-primary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,.25),0_1px_2px_rgba(0,0,0,.4)] hover:bg-primary/90 hover:-translate-y-px hover:shadow-[inset_0_1px_0_rgba(255,255,255,.25),0_6px_16px_-4px_rgba(0,0,0,.5)] transition-all duration-150 spring-press",
        destructive:
          "bg-destructive text-destructive-foreground shadow-[inset_0_1px_0_rgba(255,255,255,.2),0_1px_2px_rgba(0,0,0,.4)] hover:bg-destructive/90 hover:-translate-y-px hover:shadow-[inset_0_1px_0_rgba(255,255,255,.2),0_6px_16px_-4px_rgba(0,0,0,.5)] transition-all duration-150 spring-press",
        // Botão de vidro de verdade: papel translúcido + blur + borda de
        // vidro, brilha (papel-2) e sobe um pixel no hover.
        outline:
          "border border-pauta bg-papel-1 backdrop-blur-vidro hover:bg-papel-2 hover:-translate-y-px hover:border-foreground/20 transition-all duration-150 active:scale-[0.97]",
        secondary:
          "bg-papel-2 text-secondary-foreground backdrop-blur-vidro hover:bg-papel-3 hover:-translate-y-px transition-all duration-150 active:scale-[0.97]",
        ghost:       "hover:bg-accent hover:text-accent-foreground transition-colors duration-150",
        link:        "text-acao underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-5 py-2.5",
        sm:      "h-9 px-3.5 text-[13px]",
        lg:      "h-12 px-7 text-[15px]",
        icon:    "h-9 w-9",
        xs:      "h-7 px-2.5 text-xs",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
