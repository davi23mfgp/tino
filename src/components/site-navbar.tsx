"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu } from "lucide-react"

import { TinoMascote } from "@/components/tino-mascote"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

/**
 * Navegação da página que vende — mapeamento do `navbar1` do shadcnblocks
 * (21st.dev), estrutura de referência do fincash (tailgrids.com/templates/
 * fincash: nav fixa no topo sobre home/preço/depoimentos/FAQ).
 *
 * A vitrine (`(site)/page.tsx`) caía direto no herói sem nenhuma navegação —
 * quem chegava rolando a página não tinha como pular para "Quanto custa" nem
 * voltar ao topo sem usar o scroll do navegador. Isto fecha essa lacuna sem
 * inventar seção nova: os links apontam para âncoras que a página já tem
 * (`#planos`) e para as rotas que já existiam (`/login`, `/cadastro`).
 *
 * Sem depoimento nem prova social — o comentário em `(site)/page.tsx` é
 * explícito sobre por quê: "inventar um caso de sucesso seria a mesma
 * mentira que o app inteiro existe para não contar."
 */

const LINKS = [
  { href: "#perguntas", rotulo: "Como funciona" },
  { href: "#loja", rotulo: "Para lojas" },
  { href: "#planos", rotulo: "Preço" },
]

export function SiteNavbar() {
  const [aberto, setAberto] = useState(false)

  return (
    <header className="sticky top-0 z-40 border-b border-pauta bg-background/80 backdrop-blur-xl backdrop-saturate-[1.8]">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-5">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <TinoMascote estado="tranquilo" animado={false} className="size-7" />
          <span className="font-display text-[15px] font-semibold">Tino</span>
        </Link>

        <nav aria-label="Navegação da página" className="hidden items-center gap-6 md:flex">
          {LINKS.map((link) => (
            <a key={link.href} href={link.href} className="text-[13px] text-muted-fg transition hover:text-foreground">
              {link.rotulo}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link href="/login" className="px-3 py-2 text-[13px] text-muted-fg hover:text-foreground">
            Entrar
          </Link>
          <Link
            href="/cadastro"
            className="rounded-full bg-primary px-4 py-2 text-[13px] font-medium text-primary-foreground"
          >
            Criar conta
          </Link>
        </div>

        <Sheet open={aberto} onOpenChange={setAberto}>
          <SheetTrigger asChild>
            <button aria-label="Abrir menu" className="toque grid place-items-center rounded-full md:hidden">
              <Menu className="size-5" />
            </button>
          </SheetTrigger>
          <SheetContent className="flex flex-col gap-1 bg-background">
            {LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setAberto(false)}
                className="rounded-xl px-3 py-2.5 text-[14px] text-foreground transition hover:bg-foreground/[0.05]"
              >
                {link.rotulo}
              </a>
            ))}
            <div className="mt-3 flex flex-col gap-2 border-t border-pauta pt-3">
              <Link
                href="/login"
                className="rounded-full border border-pauta px-4 py-2.5 text-center text-[14px]"
              >
                Entrar
              </Link>
              <Link
                href="/cadastro"
                className="rounded-full bg-primary px-4 py-2.5 text-center text-[14px] font-medium text-primary-foreground"
              >
                Criar conta
              </Link>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
