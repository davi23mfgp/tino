import type { ElementType, ReactNode } from "react"

/**
 * Cabeçalho padrão de tela: badge com o ícone, título, linha de contexto e a
 * ação principal à direita.
 *
 * Cada tela abria de um jeito — umas com `<h1>` solto, outras já no conteúdo,
 * outras com o botão perdido no meio. Sem um cabeçalho constante, quem navega
 * entre telas perde a referência de onde está e onde fica a ação principal.
 *
 * A linha de contexto não repete o título: diz o que a tela tem agora
 * ("18 parceiros ativos", "3 chamados abertos"). É o dado que faz a pessoa
 * decidir se precisa agir.
 */
export function CabecalhoPagina({
  icone: Icone, titulo, contexto, acao,
}: {
  icone: ElementType
  titulo: string
  contexto?: ReactNode
  /** Ação principal da tela — normalmente um botão de criar. */
  acao?: ReactNode
}) {
  return (
    <div className="ficha flex items-center justify-between gap-4 p-4 sm:p-5">
      <div className="flex min-w-0 items-center gap-3.5">
        <div className="grid size-11 shrink-0 place-items-center rounded-full bg-foreground/[0.08] ring-1 ring-inset ring-border">
          <Icone className="size-[20px] text-foreground" strokeWidth={1.8} />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-[calc(22px*var(--escala-letra))] font-semibold leading-tight tracking-tight text-foreground">
            {titulo}
          </h1>
          {contexto && (
            <p className="mt-0.5 truncate text-[calc(13px*var(--escala-letra))] text-muted-fg">{contexto}</p>
          )}
        </div>
      </div>
      {acao && <div className="shrink-0">{acao}</div>}
    </div>
  )
}
