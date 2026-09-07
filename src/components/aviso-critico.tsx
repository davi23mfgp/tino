"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

import { buscar } from "@/lib/cliente"
import { Banner } from "@/components/ui/banner"

interface Alerta {
  id: string
  titulo: string
  texto: string
  severidade: "INFO" | "ATENCAO" | "CRITICO"
  acaoRota: string | null
}

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
  const [alerta, setAlerta] = useState<Alerta | null>(null)

  useEffect(() => {
    buscar<Alerta[]>("/api/tino/alertas")
      .then((lista) => setAlerta(lista.find((item) => item.severidade === "CRITICO") ?? null))
      .catch(() => setAlerta(null))
  }, [])

  if (!alerta) return null

  return (
    <Banner
      id={alerta.id}
      tom="critico"
      acao={
        alerta.acaoRota && (
          <Link href={alerta.acaoRota} className="shrink-0 underline underline-offset-2">
            Ver
          </Link>
        )
      }
    >
      {alerta.titulo} — {alerta.texto}
    </Banner>
  )
}
