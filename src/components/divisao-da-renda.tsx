"use client"

import { useEffect, useState } from "react"

import { buscar } from "@/lib/cliente"
import { formatarMoeda, formatarPercentual } from "@/lib/dinheiro"
import { GraficoDaDivisao } from "@/components/graficos"
import { Cartao } from "@/components/ui/painel"

/**
 * Onde colocar cada parte da renda.
 *
 * Morava em `/investir` e mudou para o orçamento em 15/09/2026, por decisão do
 * Davi. Faz sentido: a divisão da renda é decisão de **orçamento** — quanto vai
 * para necessidades, lazer, educação, longo prazo e reserva. Na tela de
 * investimentos ela competia com a carteira, que responde outra pergunta.
 *
 * Aqui ela fica ao lado do plano por categoria, que é onde a pessoa decide o
 * mesmo assunto com os números dela.
 */

interface Fatia {
  nome: string
  rotulo: string
  percentualBps: number
  valorCentavos: number
}

interface Resposta {
  receitaMensalCentavos: number
  temBase: boolean
  divisaoSugerida: Fatia[]
}

export function DivisaoDaRenda() {
  const [dados, setDados] = useState<Resposta | null>(null)

  useEffect(() => {
    buscar<Resposta>("/api/investir?meses=24")
      .then(setDados)
      .catch(() => setDados(null))
  }, [])

  // Sem histórico não há renda para dividir, e uma divisão de zero não ensina
  // nada — a tela simplesmente não mostra o bloco.
  if (!dados?.temBase || dados.receitaMensalCentavos <= 0) return null

  return (
    <Cartao titulo="Onde colocar cada parte da renda">
      <div className="mt-2">
        <GraficoDaDivisao fatias={dados.divisaoSugerida} total={formatarMoeda(dados.receitaMensalCentavos)} />
      </div>

      <ul className="mt-5 space-y-2.5">
        {dados.divisaoSugerida.map((fatia) => (
          <li key={fatia.nome} className="flex items-baseline gap-3">
            <span className="min-w-0 flex-1 truncate text-[calc(13px*var(--escala-letra))]">
              {fatia.rotulo}
              <span className="ml-2 text-[color:var(--texto-3)]">{formatarPercentual(fatia.percentualBps, 0)}</span>
            </span>
            <span className="numero shrink-0 text-[calc(14px*var(--escala-letra))] font-medium tabular-nums">
              {formatarMoeda(fatia.valorCentavos)}
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-4 border-t border-pauta pt-3 text-[calc(11.5px*var(--escala-letra))] leading-relaxed text-[color:var(--texto-3)]">
        Referência do Grão (Grupo Primo). Parâmetro, não regra. Cálculo, não recomendação.
      </p>
    </Cartao>
  )
}
