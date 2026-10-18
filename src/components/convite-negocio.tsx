"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Store } from "lucide-react"

/**
 * O convite no Início para quem ainda não ligou o Tino negócio (passo 40, opção
 * B com A). "Agora não" some com o card neste aparelho: insistir em quem já
 * disse que não tem MEI é o que faz a pessoa desligar o app. A pessoa continua
 * achando o caminho no Perfil.
 */
const CHAVE = "tino:convite-negocio-dispensado"

export function ConviteNegocio() {
  const [visivel, setVisivel] = useState(false)

  useEffect(() => {
    try { setVisivel(localStorage.getItem(CHAVE) !== "1") } catch { setVisivel(true) }
  }, [])

  if (!visivel) return null
  return (
    <section aria-label="Tino negócio" className="ficha flex flex-col gap-3 border border-primary/40 p-4 sm:p-5">
      <div className="flex gap-3">
        <Store className="mt-0.5 size-6 shrink-0 text-primary" aria-hidden />
        <div>
          <h2 className="text-[calc(16px*var(--escala-letra))] font-semibold">Você tem MEI?</h2>
          <p className="mt-0.5 text-[calc(13.5px*var(--escala-letra))] leading-relaxed text-muted-fg">O Tino separa o dinheiro da casa do dinheiro do negócio e acompanha o limite do MEI.</p>
        </div>
      </div>
      <div className="flex gap-2">
        <Link href="/ligar-negocio" className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-5 text-[calc(14px*var(--escala-letra))] font-semibold text-primary-foreground">Ligar o negócio</Link>
        <button type="button" className="min-h-11 rounded-full border border-pauta px-5 text-[calc(14px*var(--escala-letra))]" onClick={() => { try { localStorage.setItem(CHAVE, "1") } catch {} setVisivel(false) }}>Agora não</button>
      </div>
    </section>
  )
}
