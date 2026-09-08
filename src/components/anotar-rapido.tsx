"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Send } from "lucide-react"

import { enviar } from "@/lib/cliente"
import { DitarGasto } from "@/components/ditar-gasto"

/**
 * A caixa de anotar em uma linha, na tela Hoje.
 *
 * Mesmo leitor e mesma rota de "Anotar em segundos" (`/capturas`): "mercado
 * 52,30" funciona igual nos dois lugares porque é o mesmo `/api/capturas/
 * rapida` por trás. Ficou como componente à parte, e não como extração da
 * página de Capturas, de propósito — a página de Capturas tem fila, chaves
 * de origem, histórico, e mexer nela pra encaixar aqui arriscava mais do
 * que os ~30 linhas que se repetem.
 */
export function AnotarRapido({ aoRegistrar }: { aoRegistrar?: () => void }) {
  const [texto, setTexto] = useState("")
  const [ocupado, setOcupado] = useState(false)

  async function anotar(valor: string) {
    if (!valor.trim()) return
    setOcupado(true)
    try {
      await enviar("/api/capturas/rapida", { texto: valor })
      setTexto("")
      aoRegistrar?.()
    } finally {
      setOcupado(false)
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        anotar(texto)
      }}
      className="flex gap-2"
    >
      <input
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="mercado 52,30"
        aria-label="Anotar um gasto ou entrada"
        className="flex-1 rounded-[var(--raio-campo)] border border-pauta bg-background px-4 py-3 text-[14px] outline-none focus:border-acao/50"
      />
      <DitarGasto aoTranscrever={anotar} />
      <button
        type="submit"
        disabled={ocupado || !texto.trim()}
        aria-label="Registrar"
        className="toque rounded-[var(--raio-pilula)] bg-primary px-5 text-primary-foreground disabled:opacity-40"
      >
        <Send className="size-4" />
      </button>
    </form>
  )
}

/**
 * A versão usada na tela Hoje: depois de registrar, os números da própria
 * tela (saldo, sobra, fila esperando) precisam mudar na hora — é a regra de
 * "resultado imediato e visível" do redesign. `router.refresh()` busca a
 * página server de novo sem perder o estado do formulário nem piscar a tela.
 */
export function AnotarRapidoHoje() {
  const router = useRouter()
  return <AnotarRapido aoRegistrar={() => router.refresh()} />
}
