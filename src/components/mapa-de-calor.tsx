"use client"

import { formatarMoeda } from "@/lib/dinheiro"
import { cn } from "@/lib/utils"

/**
 * Mapa de calor dos gastos do mês.
 *
 * Uma grade de dias colorida pela intensidade do gasto. Serve para uma pergunta
 * que gráfico de barras não responde bem: *quando* o dinheiro sai. Padrões
 * aparecem de relance — fim de semana pesado, o dia do mercado, a segunda-feira
 * cara depois do sábado livre.
 *
 * A escala é relativa ao maior dia do próprio mês, não a um valor fixo: cada
 * pessoa gasta numa ordem de grandeza diferente, e escala fixa deixaria o mapa
 * todo claro para uns e todo escuro para outros.
 */

interface Dia {
  dia: number
  diaDaSemana: number
  totalCentavos: number
}

const INICIAIS = ["D", "S", "T", "Q", "Q", "S", "S"]

export function MapaDeCalor({
  dias,
  mediaDiariaCentavos,
  maiorGasto,
}: {
  dias: Dia[]
  mediaDiariaCentavos: number
  maiorGasto: { dia: number; totalCentavos: number } | null
}) {
  const maior = Math.max(1, ...dias.map((linha) => linha.totalCentavos))

  // Semanas começam no domingo. O primeiro dia do mês raramente cai no domingo,
  // então as posições anteriores ficam vazias para a grade não desalinhar.
  const semanas: (Dia | null)[][] = []
  let semanaAtual: (Dia | null)[] = Array.from({ length: dias[0]?.diaDaSemana ?? 0 }, () => null)

  for (const dia of dias) {
    semanaAtual.push(dia)
    if (semanaAtual.length === 7) {
      semanas.push(semanaAtual)
      semanaAtual = []
    }
  }
  if (semanaAtual.length > 0) {
    while (semanaAtual.length < 7) semanaAtual.push(null)
    semanas.push(semanaAtual)
  }

  const hoje = new Date().getUTCDate()

  return (
    <div>
      <div className="flex gap-1.5">
        {/* Coluna de iniciais dos dias da semana */}
        <div className="flex flex-col gap-1 pr-1">
          {INICIAIS.map((inicial, indice) => (
            <span key={indice} className="flex h-7 items-center text-[10px] text-muted-fg">
              {inicial}
            </span>
          ))}
        </div>

        <div className="flex flex-1 gap-1 overflow-x-auto">
          {semanas.map((semana, indiceSemana) => (
            <div key={indiceSemana} className="flex flex-1 flex-col gap-1">
              {Array.from({ length: 7 }, (_, posicao) => {
                const dia = semana[posicao]
                if (!dia) return <div key={posicao} className="h-7" />

                const intensidade = dia.totalCentavos / maior
                const eHoje = dia.dia === hoje

                return (
                  <div
                    key={posicao}
                    title={`Dia ${dia.dia}: ${formatarMoeda(dia.totalCentavos)}`}
                    className={cn(
                      "flex h-7 items-center justify-center rounded-md text-[10px] tabular-nums transition-colors",
                      dia.totalCentavos === 0 ? "bg-foreground/[0.04] text-muted-fg" : "text-white",
                      eHoje && "ring-1 ring-inset ring-acao",
                    )}
                    style={
                      dia.totalCentavos > 0
                        ? {
                            // Um só matiz, variando só a opacidade: cores
                            // diferentes por faixa dariam a impressão de
                            // categorias, e aqui a única variável é intensidade.
                            //
                            // `--lch-negativo-solido` (não o `--lch-negativo`
                            // claro): no dia de maior gasto a opacidade chega
                            // a 90%, quase cor cheia — com o matiz claro o
                            // texto branco em cima cairia a ~3,2:1. A variante
                            // "-solido" já foi calculada para >=5:1 com branco
                            // mesmo em opacidade total (ver globals.css); em
                            // opacidade baixa (mais preto aparecendo) o
                            // contraste só melhora.
                            backgroundColor: `oklch(var(--lch-negativo-solido) / ${0.18 + intensidade * 0.72})`,
                          }
                        : undefined
                    }
                  >
                    {dia.dia}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-[10px] text-muted-fg">
          menos
          {[0.1, 0.3, 0.55, 0.8, 1].map((nivel) => (
            <span
              key={nivel}
              className="size-3 rounded-[3px]"
              style={{ backgroundColor: `oklch(var(--lch-negativo) / ${0.18 + nivel * 0.72})` }}
            />
          ))}
          mais
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-fg">
          <span>
            média por dia com gasto: <span className="text-foreground">{formatarMoeda(mediaDiariaCentavos)}</span>
          </span>
          {maiorGasto && maiorGasto.totalCentavos > 0 && (
            <span>
              maior: <span className="text-negativo">{formatarMoeda(maiorGasto.totalCentavos)}</span> no dia{" "}
              {maiorGasto.dia}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
