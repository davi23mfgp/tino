"use client"

import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * TagsSelector — inspirado no `tags-selector` do ln-dev7 (21st.dev).
 *
 * Escolher categoria era sempre um `<select>` nativo — correto, mas some
 * dentro do menu do sistema: para comparar as opções a pessoa precisa abrir
 * o menu, e só vê uma de cada vez enquanto rola. Aqui todas as categorias
 * aparecem juntas como pastilhas; comparar e trocar é um toque, sem abrir
 * nada. Pensado para listas curtas (categorias, tipos) — uma lista de
 * cinquenta itens ainda pede o `<select>`/`SelectNative`.
 *
 * Continua sendo escolha ÚNICA (a mesma regra de negócio do `<select>` que
 * substitui: um lançamento tem uma categoria só) — o componente original do
 * 21st.dev permite múltiplas; aqui `valor` é sempre uma string ou null.
 */
export function TagsSelector({
  opcoes,
  valor,
  aoEscolher,
  rotuloSemEscolha = "sem categoria",
  className,
}: {
  opcoes: { id: string; nome: string }[]
  valor: string | null
  aoEscolher: (id: string | null) => void
  rotuloSemEscolha?: string
  className?: string
}) {
  return (
    <div role="listbox" aria-label="Categoria" className={cn("flex flex-wrap gap-1.5", className)}>
      <button
        type="button"
        role="option"
        aria-selected={!valor}
        onClick={() => aoEscolher(null)}
        className={cn(
          "rounded-[var(--raio-pilula)] px-3 py-1.5 text-[12px] transition-colors",
          !valor
            ? "bg-atencao/12 text-atencao"
            : "bg-foreground/[0.05] text-[color:var(--texto-2)] hover:bg-foreground/[0.09]",
        )}
      >
        {rotuloSemEscolha}
      </button>

      {opcoes.map((opcao) => {
        const selecionada = opcao.id === valor
        return (
          <button
            key={opcao.id}
            type="button"
            role="option"
            aria-selected={selecionada}
            onClick={() => aoEscolher(opcao.id)}
            className={cn(
              "inline-flex items-center gap-1 rounded-[var(--raio-pilula)] px-3 py-1.5 text-[12px] transition-colors",
              selecionada
                ? "bg-acao/12 text-acao"
                : "bg-foreground/[0.05] text-[color:var(--texto-2)] hover:bg-foreground/[0.09]",
            )}
          >
            {selecionada && <Check className="size-3" />}
            {opcao.nome}
          </button>
        )
      })}
    </div>
  )
}
