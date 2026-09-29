"use client"

import { useEffect } from "react"

import { relatarErro } from "@/lib/relatar-erro"

/**
 * Os erros que não derrubam a tela e por isso não passam pelo `error.tsx`:
 * clique que falha, promessa rejeitada sem `catch`. Sem isto, eles só existem
 * no console do celular de quem usa — e ninguém nunca fica sabendo.
 */
export function OuvidoDeErros() {
  useEffect(() => {
    const aoErro = (evento: ErrorEvent) => relatarErro(evento.error ?? evento.message)
    const aoRejeitar = (evento: PromiseRejectionEvent) => relatarErro(evento.reason)
    window.addEventListener("error", aoErro)
    window.addEventListener("unhandledrejection", aoRejeitar)
    return () => {
      window.removeEventListener("error", aoErro)
      window.removeEventListener("unhandledrejection", aoRejeitar)
    }
  }, [])
  return null
}
