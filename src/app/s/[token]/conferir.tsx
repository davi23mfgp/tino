"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { enviar } from "@/lib/cliente"
import estilos from "../../o/[token]/orcamento.module.css"
import passos from "./servico.module.css"

/**
 * "Está certo" ou "tem coisa errada", num toque (passo 39, opção A). O errado
 * pede uma frase: "a câmera funcionava" ajuda a loja; um "não" sozinho, não.
 */
export function ConferirEntrada({ token }: { token: string }) {
  const router = useRouter()
  const [contestando, setContestando] = useState(false)
  const [texto, setTexto] = useState("")
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function responder(corpo: { acao: "confere" } | { acao: "contesta"; texto: string }) {
    setOcupado(true)
    setErro(null)
    try {
      await enviar(`/api/servico-publico/${token}`, corpo)
      router.refresh()
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não consegui mandar. Tente de novo.")
      setOcupado(false)
    }
  }

  if (contestando) {
    return (
      <form className={passos.contestar} onSubmit={(evento) => { evento.preventDefault(); if (texto.trim()) void responder({ acao: "contesta", texto: texto.trim() }) }}>
        <label htmlFor="o-que-esta-errado">O que está diferente?</label>
        <textarea id="o-que-esta-errado" rows={3} maxLength={500} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Ex.: a câmera funcionava quando deixei" autoFocus />
        <div className={estilos.acoes}>
          <button type="submit" className={estilos.principal} disabled={ocupado || !texto.trim()}>{ocupado ? "Mandando…" : "Mandar para a loja"}</button>
          <button type="button" className={estilos.secundario} disabled={ocupado} onClick={() => setContestando(false)}>Voltar</button>
        </div>
        {erro && <p className={estilos.erro}>{erro}</p>}
      </form>
    )
  }
  return (
    <div className={estilos.acoes}>
      <button type="button" className={estilos.principal} disabled={ocupado} onClick={() => void responder({ acao: "confere" })}>{ocupado ? "Mandando…" : "Está certo"}</button>
      <button type="button" className={estilos.secundario} disabled={ocupado} onClick={() => setContestando(true)}>Tem coisa errada</button>
      {erro && <p className={estilos.erro}>{erro}</p>}
    </div>
  )
}
