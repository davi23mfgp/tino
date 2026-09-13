import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  subtitle?: string
  action?: React.ReactNode
  className?: string
}

/**
 * EmptyState — padrão Control.Deal.
 * Ícone 48px stroke 1.5 muted-fg, título 17px semibold, subtítulo 14px muted,
 * ação primária opcional. Centralizado, padding generoso.
 */
export function EmptyState({ icon: Icon, title, subtitle, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center py-16 px-6", className)}>
      <Icon className="w-12 h-12 text-muted-fg mb-4" strokeWidth={1.5} />
      <p className="text-[calc(17px*var(--escala-letra))] font-semibold text-foreground">{title}</p>
      {subtitle && <p className="text-[calc(14px*var(--escala-letra))] text-muted-fg mt-1 max-w-sm">{subtitle}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
