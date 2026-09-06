"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"

import { buscar } from "@/lib/cliente"
import { estadoPorAlertas, FRASE, TinoMascote } from "@/components/tino-mascote"
import type { EstadoTino } from "@/components/tino-mascote"

/**
 * O Tino acompanhando as contas.
 *
 * Não é enfeite de boas-vindas: mostra o que o motor de alertas achou de mais
 * grave agora, com o caminho para resolver. A expressão dele é o resumo, e o
 * texto ao lado é o motivo — quem só olha a cara já sabe se precisa parar, e
 * quem lê sabe o que fazer.
 *
 * Sem alerta nenhum ele fica tranquilo e diz isso em uma linha. Não inventa
 * elogio nem dica: silêncio do motor quer dizer que não há nada a apontar.
 */

interface Alerta {
  tipo: string
  severidade: "CRITICO" | "ATENCAO" | "INFO"
  titulo: string
  texto: string
  acaoRota?: string | null
}

const BORDA: Record<EstadoTino, string> = {
  critico: "border-negativo/40",
  atento: "border-atencao/40",
  apertado: "border-atencao/40",
  tranquilo: "border-pauta",
  comemorando: "border-positivo/40",
  pensando: "border-pauta",
}

export function TinoAcompanha() {
  const [alertas, setAlertas] = useState<Alerta[] | null>(null)

  const carregar = useCallback(async () => {
    try {
      setAlertas(await buscar<Alerta[]>("/api/tino/alertas"))
    } catch {
      // Falha de rede não vira "está tudo bem": fica sem opinião.
      setAlertas(null)
    }
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  const estado: EstadoTino = alertas === null ? "pensando" : estadoPorAlertas(alertas)

  // O mais grave manda. Entre dois da mesma gravidade, o primeiro que o motor
  // devolveu — ele já ordena por urgência.
  const principal =
    alertas?.find((alerta) => alerta.severidade === "CRITICO") ??
    alertas?.find((alerta) => alerta.severidade === "ATENCAO") ??
    alertas?.[0] ??
    null

  const restantes = (alertas?.length ?? 0) - (principal ? 1 : 0)

  return (
    <section className={`ficha flex items-start gap-4 border p-5 ${BORDA[estado]}`}>
      <TinoMascote estado={estado} className="h-16 w-16 shrink-0" />

      <div className="min-w-0 flex-1">
        <p className="font-display text-[15px] font-semibold">{FRASE[estado]}</p>

        {principal ? (
          <>
            <p className="mt-1 text-[13px] font-medium text-foreground">{principal.titulo}</p>
            <p className="mt-0.5 text-[13px] leading-relaxed text-muted-fg">{principal.texto}</p>

            <div className="mt-3 flex flex-wrap items-center gap-3 text-[12px]">
              {principal.acaoRota && (
                <Link href={principal.acaoRota} className="font-medium text-acao hover:underline">
                  resolver agora
                </Link>
              )}
              {restantes > 0 && (
                <span className="text-muted-fg">
                  e mais {restantes} {restantes === 1 ? "aviso" : "avisos"}
                </span>
              )}
            </div>
          </>
        ) : (
          <p className="mt-1 text-[13px] leading-relaxed text-muted-fg">
            {alertas === null
              ? "Ainda não consegui ler seus números."
              : "Nada exigindo decisão hoje. Volto a avisar quando algum limite se aproximar."}
          </p>
        )}
      </div>
    </section>
  )
}
