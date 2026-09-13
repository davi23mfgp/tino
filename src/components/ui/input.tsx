import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Input Control.Deal: 44px, radius 16px, fundo sutil, foco anel acao
          "flex h-12 min-w-0 w-full rounded-[16px] border border-border bg-papel-2 px-4 py-2.5 text-base text-foreground",
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
