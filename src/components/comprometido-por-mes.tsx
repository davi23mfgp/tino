import { rotuloCompetencia } from "@/lib/datas"
import { formatarMoedaCurta } from "@/lib/dinheiro"
import { cn } from "@/lib/utils"

/**
 * Quanto de cada mês já está comprometido antes de a pessoa gastar qualquer
 * coisa.
 *
 * O desenho veio da referência que o Davi mandou em 15/09/2026 (a tela de
 * gastos parcelados do Meu Assessor): barra por mês, **o valor escrito em cima
 * da barra**, e só o mês corrente aceso enquanto os outros ficam apagados.
 *
 * Por que o valor em cima e não numa legenda: a pergunta aqui é "quanto",
 * não "qual mês é maior". Barra sem número obriga a estimar pela altura, e
 * estimar altura é justamente o trabalho que a tela deveria poupar.
 *
 * A altura é relativa ao MAIOR mês, não a um teto fixo: com teto fixo, uma
 * sequência de meses parecidos vira cinco barras idênticas e a régua não
 * informa nada.
 */
export function ComprometidoPorMes({
  meses,
  rotulo = "Já comprometido por mês",
  className,
}: {
  meses: { competencia: string; totalCentavos: number }[]
  rotulo?: string
  className?: string
}) {
  if (meses.length === 0) return null

  const maior = Math.max(...meses.map((mes) => mes.totalCentavos), 1)
  const destaque = meses.findIndex((mes) => mes.totalCentavos > 0)

  return (
    <section className={cn("mt-5", className)}>
      <p className="text-[max(10px,calc(12px*var(--escala-letra)))] font-semibold uppercase tracking-[0.14em] text-[color:var(--texto-3)]">
        {rotulo}
      </p>

      <ol className="mt-4 flex items-end gap-2 sm:gap-3">
        {meses.map((mes, indice) => {
          const vazio = mes.totalCentavos === 0
          return (
            <li key={mes.competencia} className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <span
                className={cn(
                  "numero whitespace-nowrap text-[max(10px,calc(12px*var(--escala-letra)))] font-medium tabular-nums",
                  vazio ? "text-[color:var(--texto-3)]" : "text-foreground",
                )}
              >
                {formatarMoedaCurta(mes.totalCentavos)}
              </span>

              {/* A barra do mês corrente é a única sólida. O resto desbota em
                  degrau, como a referência: a série inteira colorida faz cinco
                  barras competirem pela mesma atenção. */}
              <span
                aria-hidden
                className={cn(
                  "w-full rounded-[10px] transition-[height] duration-500 ease-[var(--curva)]",
                  indice === destaque ? "bg-acao" : "bg-foreground/[0.14]",
                )}
                style={{ height: `${Math.max(6, (mes.totalCentavos / maior) * 96)}px` }}
              />

              <span
                className={cn(
                  "truncate text-[max(10px,calc(12px*var(--escala-letra)))]",
                  indice === destaque ? "font-medium text-foreground" : "text-[color:var(--texto-3)]",
                )}
              >
                {rotuloCompetencia(mes.competencia, true).split(" ")[0]}
              </span>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
