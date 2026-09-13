"use client"

import { TrendingDown, TrendingUp, Minus } from "lucide-react"

import { formatarMoeda } from "@/lib/dinheiro"
import { cn } from "@/lib/utils"

/**
 * Categorias do mês contra o mês anterior.
 *
 * O número do mês sozinho não diz nada: R$ 980 em supermercado é bom ou ruim?
 * Só a comparação responde. A seta indica direção, e a cor indica se aquilo é
 * bom — em despesa, cair é bom, então queda vem em verde.
 *
 * Variação percentual não aparece quando não havia gasto antes: sair de zero
 * para qualquer valor é "aumento infinito", que não informa nada.
 */

interface Linha {
  categoriaId: string | null
  nome: string
  totalCentavos: number
  anteriorCentavos: number
  variacaoBps: number | null
  essencial: boolean
}

export function CategoriasComparadas({ linhas, limite = 8 }: { linhas: Linha[]; limite?: number }) {
  const visiveis = linhas.slice(0, limite)
  const maior = Math.max(1, ...visiveis.map((linha) => Math.max(linha.totalCentavos, linha.anteriorCentavos)))

  return (
    <div className="space-y-3">
      {visiveis.map((linha) => {
        const subiu = linha.variacaoBps !== null && linha.variacaoBps > 0
        const desceu = linha.variacaoBps !== null && linha.variacaoBps < 0
        // Variação abaixo de 3% é ruído de mês, não tendência: marcar como
        // "estável" evita alarmar por diferença de um fim de semana.
        const estavel = linha.variacaoBps !== null && Math.abs(linha.variacaoBps) < 300

        const Icone = estavel ? Minus : subiu ? TrendingUp : TrendingDown
        const tom = estavel ? "text-muted-fg" : subiu ? "text-negativo" : "text-positivo"

        return (
          <div key={linha.categoriaId ?? linha.nome}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 flex-1 truncate text-[calc(13px*var(--escala-letra))]">
                {linha.nome}
                {/* Espaço explícito: sem ele, leitor de tela e cópia do texto
                    devolvem "Supermercadoessencial" numa palavra só. */}
                {linha.essencial && <span className="ml-1.5 text-[calc(10px*var(--escala-letra))] text-muted-fg"> · essencial</span>}
              </span>

              <span className="text-[calc(13px*var(--escala-letra))] tabular-nums">{formatarMoeda(linha.totalCentavos)}</span>

              {linha.variacaoBps !== null ? (
                <span className={cn("flex w-16 items-center justify-end gap-1 text-[calc(11px*var(--escala-letra))] tabular-nums", tom)}>
                  <Icone className="size-3" />
                  {estavel ? "0%" : `${Math.abs(Math.round(linha.variacaoBps / 100))}%`}
                </span>
              ) : (
                <span className="w-16 text-right text-[calc(11px*var(--escala-letra))] text-muted-fg">novo</span>
              )}
            </div>

            {/* Duas barras: a clara é o mês passado, a colorida é este mês.
                Ver as duas lado a lado mostra o tamanho da mudança, não só o sinal. */}
            <div className="mt-1.5 space-y-1">
              <div className="h-2 overflow-hidden rounded-full bg-foreground/[0.06]">
                <div
                  className={cn("h-full rounded-full transition-all", subiu && !estavel ? "bg-negativo" : "bg-acao")}
                  style={{ width: `${(linha.totalCentavos / maior) * 100}%` }}
                />
              </div>
              {linha.anteriorCentavos > 0 && (
                <div className="h-1 overflow-hidden rounded-full bg-foreground/[0.03]">
                  <div
                    className="h-full rounded-full bg-muted-fg/30"
                    style={{ width: `${(linha.anteriorCentavos / maior) * 100}%` }}
                    title={`mês passado: ${formatarMoeda(linha.anteriorCentavos)}`}
                  />
                </div>
              )}
            </div>
          </div>
        )
      })}

      <p className="pt-1 text-[calc(11px*var(--escala-letra))] text-muted-fg">
        A barra fina é o mês passado. Em despesa, cair é bom — por isso a queda aparece em verde.
      </p>
    </div>
  )
}
