"use client"

import { useState } from "react"
import Link from "next/link"

import { enviar } from "@/lib/cliente"

/**
 * Aviso de que a política ou os termos mudaram (ver `@/lib/termos`). Fica no
 * topo do conteúdo, não por cima dele: é informação, não bloqueio — as bases
 * legais do Tino são contrato e legítimo interesse, não consentimento.
 */
export function AvisoDeTermos({ mudancas }: { mudancas: string }) {
  const [visivel, setVisivel] = useState(true)
  if (!visivel) return null

  async function entendi() {
    setVisivel(false)
    await enviar("/api/usuario/termos", {}).catch(() => {})
  }

  return (
    <div role="status" className="mb-4 flex flex-wrap items-center gap-3 rounded-[var(--raio-bloco)] border border-[var(--vidro-borda)] bg-[var(--papel-1)] px-4 py-3 text-[calc(13px*var(--escala-letra))] backdrop-blur-xl">
      <p className="min-w-0 flex-1 text-muted-fg">
        <b className="font-semibold text-foreground">Atualizamos a política de privacidade.</b> {mudancas}{" "}
        <Link href="/privacidade" className="underline underline-offset-2">
          Ler a política
        </Link>
      </p>
      <button type="button" onClick={() => void entendi()} className="rounded-full bg-primary px-4 py-2 font-semibold text-primary-foreground">
        Entendi
      </button>
    </div>
  )
}
