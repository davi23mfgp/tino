"use client"

import { useEffect } from "react"

/**
 * Avisa o funil próprio (achado 14) sem cookie: a visita conta uma vez por
 * aba aberta (`sessionStorage`), e o toque em qualquer link para o cadastro
 * conta como "começar". Falha calada: medir nunca atrapalha quem está usando.
 */
function avisar(etapa: string, produto: string) {
  void fetch("/api/funil", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ etapa, produto }), keepalive: true }).catch(() => {})
}

function primeiraVez(chave: string) {
  try {
    if (sessionStorage.getItem(chave)) return false
    sessionStorage.setItem(chave, "1")
  } catch {
    // Aba privada ou armazenamento bloqueado: conta mesmo assim.
  }
  return true
}

export function MarcarEtapa({ etapa, produto }: { etapa: "VISITA" | "CADASTRO_INICIADO"; produto: "pessoal" | "mei" }) {
  useEffect(() => {
    if (primeiraVez(`tino-funil-${etapa}-${produto}`)) avisar(etapa, produto)
    if (etapa !== "VISITA") return
    function aoTocar(evento: MouseEvent) {
      const link = (evento.target as Element | null)?.closest?.("a[href]")
      if (link && /^\/cadastro(\/|$|\?)/.test(link.getAttribute("href") ?? "") && primeiraVez(`tino-funil-clique-${produto}`)) avisar("CLIQUE_COMECAR", produto)
    }
    document.addEventListener("click", aoTocar)
    return () => document.removeEventListener("click", aoTocar)
  }, [etapa, produto])
  return null
}
