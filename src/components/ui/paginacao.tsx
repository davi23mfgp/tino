"use client"

import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Paginação — inspirada no hook `use-pagination` do originui (21st.dev).
 *
 * O app busca listas inteiras de uma vez (ex.: até 200 transações do mês) e
 * as telas mostravam tudo empilhado, ou cortavam num número fixo sem forma de
 * ver o resto. Isto pagina o que já está em memória — não troca a forma como
 * a API é chamada, só como a lista é MOSTRADA — com números de página e
 * reticências quando há muita coisa, do jeito do componente original.
 */

const PONTOS = "pontos" as const

function calcularPaginas(paginaAtual: number, totalPaginas: number, vizinhos = 1): (number | typeof PONTOS)[] {
  const total = Math.max(1, totalPaginas)
  if (total <= 5 + vizinhos * 2) return Array.from({ length: total }, (_, i) => i + 1)

  const paginas: (number | typeof PONTOS)[] = [1]

  const inicio = Math.max(2, paginaAtual - vizinhos)
  const fim = Math.min(total - 1, paginaAtual + vizinhos)

  if (inicio > 2) paginas.push(PONTOS)
  for (let p = inicio; p <= fim; p++) paginas.push(p)
  if (fim < total - 1) paginas.push(PONTOS)

  paginas.push(total)
  return paginas
}

/** Fatia uma lista já carregada em páginas de tamanho fixo. */
export function usePaginacao<T>(itens: T[], porPagina: number) {
  const [pagina, setPagina] = useState(1)
  const totalPaginas = Math.max(1, Math.ceil(itens.length / porPagina))
  const paginaValida = Math.min(pagina, totalPaginas)

  const itensDaPagina = useMemo(
    () => itens.slice((paginaValida - 1) * porPagina, paginaValida * porPagina),
    [itens, paginaValida, porPagina],
  )

  return { pagina: paginaValida, totalPaginas, itensDaPagina, irPara: setPagina }
}

export function Paginacao({
  pagina,
  totalPaginas,
  aoMudar,
  className,
}: {
  pagina: number
  totalPaginas: number
  aoMudar: (pagina: number) => void
  className?: string
}) {
  const paginas = useMemo(() => calcularPaginas(pagina, totalPaginas), [pagina, totalPaginas])
  if (totalPaginas <= 1) return null

  return (
    <nav aria-label="Paginação" className={cn("flex items-center justify-center gap-1", className)}>
      <button
        onClick={() => aoMudar(pagina - 1)}
        disabled={pagina <= 1}
        aria-label="Página anterior"
        className="grid size-8 place-items-center rounded-full text-muted-fg transition hover:bg-foreground/[0.06] hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
      >
        <ChevronLeft className="size-4" />
      </button>

      {paginas.map((item, indice) =>
        item === PONTOS ? (
          <span key={`pontos-${indice}`} className="grid size-8 place-items-center text-muted-fg">
            <MoreHorizontal className="size-4" />
          </span>
        ) : (
          <button
            key={item}
            onClick={() => aoMudar(item)}
            aria-current={item === pagina ? "page" : undefined}
            className={cn(
              "grid size-8 place-items-center rounded-full text-[13px] tabular-nums transition-colors",
              item === pagina
                ? "bg-accent font-medium text-accent-foreground"
                : "text-muted-fg hover:bg-foreground/[0.06] hover:text-foreground",
            )}
          >
            {item}
          </button>
        ),
      )}

      <button
        onClick={() => aoMudar(pagina + 1)}
        disabled={pagina >= totalPaginas}
        aria-label="Próxima página"
        className="grid size-8 place-items-center rounded-full text-muted-fg transition hover:bg-foreground/[0.06] hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
      >
        <ChevronRight className="size-4" />
      </button>
    </nav>
  )
}
