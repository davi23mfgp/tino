import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

interface SectionCardProps {
  children: ReactNode
  className?: string
  title?: string
  action?: ReactNode
}

/**
 * SectionCard — vidro do Tino (`.ios-card`). Header opcional com título
 * 15px font-semibold + ação à direita em `acao`.
 */
export function SectionCard({ children, className, title, action }: SectionCardProps) {
  return (
    <div className={cn("ios-card overflow-hidden", className)}>
      {(title || action) && (
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          {title && <h3 className="text-[15px] font-semibold text-foreground">{title}</h3>}
          {action && <div className="text-[13px] text-acao">{action}</div>}
        </div>
      )}
      {children}
    </div>
  )
}
