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

  // Uma linha só (Davi, passo 63 do canvas, 13/11/2026). O bloco com o texto
  // inteiro ocupava um quarto da tela em toda tela. O que mudou continua a um
  // toque, em "Ler", e segue no aviso para quem usa leitor de tela.
  return (
    <div role="status" className="mb-4 flex items-center gap-3 rounded-full border border-[var(--vidro-borda)] bg-[var(--papel-1)] py-1.5 pl-4 pr-1.5 text-[calc(13px*var(--escala-letra))] backdrop-blur-xl">
      <p className="min-w-0 flex-1 text-muted-fg">
        <b className="font-semibold text-foreground">Política de privacidade atualizada.</b>{" "}
        <span className="sr-only">{mudancas}</span>
        <Link href="/privacidade" className="underline underline-offset-2">
          Ler
        </Link>
      </p>
      <button type="button" onClick={() => void entendi()} className="min-h-11 shrink-0 rounded-full border border-[var(--vidro-borda)] px-4 font-semibold text-foreground">
        Entendi
      </button>
    </div>
  )
}
