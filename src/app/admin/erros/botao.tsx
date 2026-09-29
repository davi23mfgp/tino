"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { buscar } from "@/lib/cliente"

export function BotaoResolverErro({ id, status }: { id: string; status: "NOVO" | "RESOLVIDO" }) {
  const router = useRouter()
  const [ocupado, setOcupado] = useState(false)
  async function alternar() {
    setOcupado(true)
    try {
      await buscar(`/api/admin/erros/${id}`, { method: "PATCH", body: JSON.stringify({ status: status === "NOVO" ? "RESOLVIDO" : "NOVO" }) })
      router.refresh()
    } finally {
      setOcupado(false)
    }
  }
  return (
    <button
      type="button"
      onClick={() => void alternar()}
      disabled={ocupado}
      className="shrink-0 rounded-full border border-pauta px-4 py-2 text-[calc(13px*var(--escala-letra))] hover:border-acao/40 disabled:opacity-50"
    >
      {status === "NOVO" ? "Marcar resolvido" : "Reabrir"}
    </button>
  )
}
