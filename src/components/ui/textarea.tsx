import * as React from "react"
import { cn } from "@/lib/utils"

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          // Mesmo poço de vidro que `Input` (`ui/input.tsx`): fundo preto
          // translúcido recuado dentro do cartão, não um cinza próprio —
          // consistente em toda a superfície de formulário do app.
          "flex min-h-[80px] w-full rounded-[16px] border border-border bg-background/60 px-4 py-2.5 text-[15px] text-foreground",
          "placeholder:text-muted-fg",
          "transition-all duration-200 ease-apple",
          "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-acao/15 focus-visible:border-acao/50 focus-visible:bg-background",
          "disabled:cursor-not-allowed disabled:opacity-40",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
