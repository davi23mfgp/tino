"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { enviar } from "@/lib/cliente"
import estilos from "./orcamento.module.css"

/**
 * O "sim" do cliente. Pede confirmação na própria tela: aprovar por engano
 * num toque perdido do polegar faria a loja separar peça à toa.
 */
export function AprovarOrcamento({ token }: { token: string }) {
  const router = useRouter()
  const [confirmando, setConfirmando] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function aprovar() {
    setOcupado(true)
    setErro(null)
    try {
      await enviar(`/api/orcamento-publico/${token}`, { acao: "aprovar" })
      router.refresh()
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não consegui aprovar. Tente de novo.")
      setOcupado(false)
    }
  }

  if (!confirmando) {
    return <button type="button" className={estilos.principal} onClick={() => setConfirmando(true)}>Aprovar orçamento</button>
  }
  return (
    <div className={estilos.confirmar}>
      <p>Aprovar o orçamento? A loja vê a aprovação e fala com você para combinar.</p>
      <div>
        <button type="button" className={estilos.principal} disabled={ocupado} onClick={() => void aprovar()}>{ocupado ? "Aprovando…" : "Sim, aprovar"}</button>
        <button type="button" className={estilos.secundario} disabled={ocupado} onClick={() => setConfirmando(false)}>Voltar</button>
      </div>
      {erro && <p className={estilos.erro}>{erro}</p>}
    </div>
  )
}
