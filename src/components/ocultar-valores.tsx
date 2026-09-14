"use client"

import { useEffect, useState } from "react"
import { Eye, EyeOff } from "lucide-react"

const CHAVE = "tino:valores-ocultos"

/**
 * Esconde os valores em conta, como o olho dos aplicativos de banco.
 *
 * O estado mora num atributo no `<html>` e o borrão é feito em CSS
 * (`[data-valores="ocultos"] .valor-sensivel`), então qualquer tela marca o
 * que é sensível sem precisar de contexto nem de prop atravessando a árvore.
 *
 * A preferência fica no navegador de quem está olhando — é sobre quem está
 * por perto da tela, não sobre a conta.
 */
export function BotaoOcultarValores() {
  const [oculto, setOculto] = useState(false)

  useEffect(() => {
    try {
      const salvo = localStorage.getItem(CHAVE) === "1"
      setOculto(salvo)
      document.documentElement.dataset.valores = salvo ? "ocultos" : "visiveis"
    } catch {
      // Navegador com armazenamento bloqueado: os valores aparecem, que é o
      // comportamento de sempre.
    }
  }, [])

  function alternar() {
    const proximo = !oculto
    setOculto(proximo)
    document.documentElement.dataset.valores = proximo ? "ocultos" : "visiveis"
    try { localStorage.setItem(CHAVE, proximo ? "1" : "0") } catch {}
  }

  return (
    <button
      type="button"
      onClick={alternar}
      aria-pressed={oculto}
      aria-label={oculto ? "Mostrar valores" : "Ocultar valores"}
      className="grid size-9 shrink-0 place-items-center rounded-full border border-pauta text-[color:var(--texto-2)] transition-colors hover:text-foreground"
    >
      {oculto ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
    </button>
  )
}
