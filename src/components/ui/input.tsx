import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // 44px no celular, 36px do `sm` para cima: o minimo de toque vale
          // onde existe dedo. O texto continua 16px no celular de proposito
          // -- abaixo disso o Safari do iPhone da zoom sozinho ao focar o
          // campo, e o zoom quebra o layout inteiro.
          "flex h-11 min-w-0 w-full rounded-xl border border-border bg-papel-2 px-3.5 text-base text-foreground",
          "sm:h-9 sm:px-3 sm:text-sm",
          "placeholder:text-muted-fg",
          "transition-all duration-200 ease-apple",
          "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-acao/15 focus-visible:border-acao/50 focus-visible:bg-background",
          "disabled:cursor-not-allowed disabled:opacity-40",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
