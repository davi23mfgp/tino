"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

import { buscar } from "@/lib/cliente"
import { Banner } from "@/components/ui/banner"
import { usarAlertas } from "@/components/alertas-provider"

/**
 * Faixa de vigia crítica no topo do app — mapeamento do componente `banner`
 * do 21st.dev (ver `docs/REDESIGN-EM-CURSO.md`).
 *
 * `BarraTopo` já mostra os alertas dentro de um sino que a pessoa precisa
 * abrir; isto é o oposto — o alerta mais grave, na cara, antes de qualquer
 * outra tela. Só aparece para severidade CRÍTICO: ATENÇÃO já tem lugar no
 * sino, e um banner que dispara para todo aviso pequeno perde a força
 * quando o de verdade aparecer.
 */
export function AvisoCritico() {
  // A lista vem do provedor: era a segunda de quatro requisições idênticas na
  // mesma tela, e chegava num instante diferente das outras.
  const { alertas } = usarAlertas()
  const alerta = alertas.find((item) => item.severidade === "CRITICO") ?? null

  if (!alerta) return null

  return (
    <Banner
      id={alerta.id}
      tom="critico"
      acao={
        alerta.acaoRota && (
          <Link
            href={alerta.acaoRota}
            // Mesmo motivo do X ao lado: 19x19px é alvo de mouse, não de
            // dedo. O sublinhado continua no texto, a área é que cresceu.
            className="inline-flex h-11 shrink-0 items-center px-2 underline underline-offset-2"
          >
            Ver
          </Link>
        )
      }
    >
      <span className="block font-semibold">{alerta.titulo}</span><span className="mt-1 block text-xs font-normal text-muted-fg">{alerta.texto}</span>
    </Banner>
  )
}
