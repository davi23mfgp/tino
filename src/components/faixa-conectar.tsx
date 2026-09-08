"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Building2, X } from "lucide-react"

const CHAVE = "tino:faixa-conectar-adiada-ate"
const SETE_DIAS = 7 * 86_400_000

/**
 * Faixa de convite para conectar o banco.
 *
 * Aparece no topo do app enquanto não houver banco ligado. Fechar não some
 * para sempre: volta em 7 dias. O prazo mora no `localStorage` de propósito —
 * é preferência de aparência de um aparelho, não dado financeiro, e criar
 * tabela para guardar "fechei uma tarja" seria migração para nada.
 *
 * Diferente do Calen (tarja laranja gritante), aqui a faixa usa a superfície
 * do próprio Tino: o convite não pode competir com o saldo, que é o motivo de
 * a pessoa ter aberto o app.
 */
export function FaixaConectar({ conectado }: { conectado: boolean }) {
  const caminho = usePathname()
  // Começa escondida e só aparece depois de ler o `localStorage`: pintar a
  // faixa e retirá-la em seguida empurraria a página inteira para baixo.
  const [visivel, setVisivel] = useState(false)

  useEffect(() => {
    if (conectado) return
    try {
      const ate = Number(window.localStorage.getItem(CHAVE) ?? 0)
      if (Date.now() >= ate) setVisivel(true)
    } catch {
      // Navegador com armazenamento bloqueado: mostrar a faixa é o padrão seguro.
      setVisivel(true)
    }
  }, [conectado])

  function adiar() {
    setVisivel(false)
    try {
      window.localStorage.setItem(CHAVE, String(Date.now() + SETE_DIAS))
    } catch {
      // Sem armazenamento a faixa volta no próximo carregamento. Aceitável.
    }
  }

  // Na própria tela de conectar a faixa seria eco do que já está na tela.
  if (!visivel || conectado || caminho?.startsWith("/conectar")) return null

  return (
    <div className="ficha mb-4 flex items-center gap-3 p-3 sm:p-4">
      <div className="grid size-10 shrink-0 place-items-center rounded-full bg-foreground/[0.08] ring-1 ring-inset ring-border">
        <Building2 className="size-[18px] text-foreground" strokeWidth={1.8} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-medium leading-snug text-foreground">
          Seu mês fecha sozinho quando o banco está conectado
        </p>
        <p className="mt-0.5 hidden text-[12px] text-[color:var(--texto-3)] sm:block">
          O Open Finance traz cada gasto por você.
        </p>
      </div>

      <Link
        href="/conectar"
        className="ios-tap inline-flex min-h-[38px] shrink-0 items-center rounded-[var(--raio-pilula)] bg-primary px-4 text-[13px] font-semibold text-primary-foreground"
      >
        Conectar
      </Link>

      <button
        type="button"
        onClick={adiar}
        aria-label="Fechar por enquanto"
        className="ios-tap grid size-8 shrink-0 place-items-center rounded-full text-[color:var(--texto-3)] hover:bg-foreground/[0.06]"
      >
        <X className="size-4" strokeWidth={2} />
      </button>
    </div>
  )
}
