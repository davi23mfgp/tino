"use client"

import { useMemo } from "react"
import { nomeDoDia, semanaDe, somarDias } from "@/lib/semana"
import { ChevronLeft, ChevronRight } from "lucide-react"
import estilos from "./faixa-de-dias.module.css"

export interface DiaComMovimento {
  dia: string
  lancamentos: number
  saldoCentavos: number
}


/**
 * Semana em faixa, com o dia escolhido em destaque.
 *
 * Sete dias por vez, e não o mês inteiro: no celular um calendário de 35
 * células empurra os lançamentos para fora da tela, que é justamente o que a
 * pessoa veio ver. As setas andam de semana em semana e o mês continua sendo
 * escolhido no seletor acima.
 *
 * O ponto embaixo do número diz que aquele dia tem lançamento — sem ele a
 * pessoa toca dia a dia procurando onde há movimento.
 */
export function FaixaDeDias({
  diaSelecionado,
  aoEscolher,
  dias,
  destacar = true,
}: {
  diaSelecionado: string
  /// Pinta o dia escolhido. No extrato em modo "mês" a faixa só mostra a
  /// semana; pintar um dia ali dizia que a lista estava presa a ele, e não
  /// estava.
  destacar?: boolean
  aoEscolher: (dia: string) => void
  dias: DiaComMovimento[]
}) {
  const semana = useMemo(() => semanaDe(diaSelecionado), [diaSelecionado])

  const porDia = useMemo(() => new Map(dias.map((linha) => [linha.dia, linha])), [dias])
  const hoje = new Date().toISOString().slice(0, 10)

  return (
    <div className={estilos.faixa}>
      <button
        type="button"
        aria-label="Semana anterior"
        onClick={() => aoEscolher(somarDias(diaSelecionado, -7))}
      >
        <ChevronLeft size={18} aria-hidden />
      </button>

      <ol>
        {semana.map((dia) => {
          const movimento = porDia.get(dia)
          const numero = Number(dia.slice(8, 10))
          return (
            <li key={dia}>
              <button
                type="button"
                onClick={() => aoEscolher(dia)}
                aria-pressed={destacar && dia === diaSelecionado}
                aria-label={`Dia ${numero}${movimento ? `, ${movimento.lancamentos} lançamentos` : ", sem lançamentos"}`}
                data-hoje={dia === hoje}
              >
                <small>{nomeDoDia(dia)}</small>
                <b>{numero}</b>
                <i data-tem={Boolean(movimento)} aria-hidden />
              </button>
            </li>
          )
        })}
      </ol>

      <button
        type="button"
        aria-label="Próxima semana"
        onClick={() => aoEscolher(somarDias(diaSelecionado, 7))}
      >
        <ChevronRight size={18} aria-hidden />
      </button>
    </div>
  )
}
