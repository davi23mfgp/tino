"use client"

import { useEffect, useRef, useState } from "react"
import { formatarMoeda, paraCentavos } from "@/lib/dinheiro"
import { cn } from "@/lib/utils"

/**
 * Edição no lugar — item 1 do redesign de experiência (07/09/2026).
 *
 * Antes, mudar a descrição ou o valor de um lançamento não existia: só a
 * categoria era editável ali mesmo (um `<select>` na linha). Estes dois
 * componentes estendem a mesma ideia para texto e dinheiro, sem abrir modal
 * nem navegar para outra tela — clicou, virou campo; Enter ou saiu do campo
 * salva; Esc cancela.
 *
 * O texto/número normal já parece clicável o bastante (cursor de texto no
 * hover, sem contorno permanente) para não precisar de um ícone de lápis
 * grudado em cada linha — que numa tabela de duzentas linhas vira ruído
 * visual constante para uma ação ocasional.
 */

interface Comuns {
  className?: string
  /** Enquanto true, a linha não aceita novo clique (evita corrida com um save em andamento). */
  desabilitado?: boolean
}

export function EditavelTexto({
  valor,
  aoSalvar,
  className,
  desabilitado,
}: Comuns & { valor: string; aoSalvar: (novo: string) => void }) {
  const [editando, setEditando] = useState(false)
  const [rascunho, setRascunho] = useState(valor)
  const campoRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editando) campoRef.current?.select()
  }, [editando])

  function abrir() {
    if (desabilitado) return
    setRascunho(valor)
    setEditando(true)
  }

  function confirmar() {
    setEditando(false)
    const limpo = rascunho.trim()
    if (limpo && limpo !== valor) aoSalvar(limpo)
  }

  if (editando) {
    return (
      <input
        ref={campoRef}
        value={rascunho}
        onChange={(evento) => setRascunho(evento.target.value)}
        onBlur={confirmar}
        onKeyDown={(evento) => {
          if (evento.key === "Enter") campoRef.current?.blur()
          if (evento.key === "Escape") {
            setRascunho(valor)
            setEditando(false)
          }
        }}
        className={cn(
          "-mx-2 -my-1 w-[calc(100%+1rem)] rounded-[var(--raio-campo)] border border-acao/50 bg-background px-2 py-1 text-[14px] outline-none",
          className,
        )}
      />
    )
  }

  return (
    <button
      type="button"
      onClick={abrir}
      title="clique para editar"
      className={cn(
        "-mx-2 -my-1 max-w-full truncate rounded-[var(--raio-campo)] px-2 py-1 text-left text-[14px] transition-colors",
        "cursor-text hover:bg-foreground/[0.05]",
        className,
      )}
    >
      {valor}
    </button>
  )
}

export function EditavelMoeda({
  valorCentavos,
  aoSalvar,
  className,
  desabilitado,
}: Comuns & { valorCentavos: number; aoSalvar: (novoCentavos: number) => void }) {
  const [editando, setEditando] = useState(false)
  const [rascunho, setRascunho] = useState("")
  const campoRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editando) campoRef.current?.select()
  }, [editando])

  function abrir() {
    if (desabilitado) return
    setRascunho((valorCentavos / 100).toFixed(2).replace(".", ","))
    setEditando(true)
  }

  function confirmar() {
    setEditando(false)
    const novoCentavos = paraCentavos(rascunho)
    if (novoCentavos > 0 && novoCentavos !== valorCentavos) aoSalvar(novoCentavos)
  }

  if (editando) {
    return (
      <input
        ref={campoRef}
        value={rascunho}
        onChange={(evento) => setRascunho(evento.target.value)}
        onBlur={confirmar}
        inputMode="decimal"
        onKeyDown={(evento) => {
          if (evento.key === "Enter") campoRef.current?.blur()
          if (evento.key === "Escape") {
            setEditando(false)
          }
        }}
        className={cn(
          "numero w-28 rounded-[var(--raio-campo)] border border-acao/50 bg-background px-2 py-1 text-right text-[14px] outline-none",
          className,
        )}
      />
    )
  }

  return (
    <button
      type="button"
      onClick={abrir}
      title="clique para editar"
      className={cn(
        "numero w-28 rounded-[var(--raio-campo)] px-2 py-1 text-right text-[14px] font-medium transition-colors",
        "cursor-text hover:bg-foreground/[0.05]",
        className,
      )}
    >
      {formatarMoeda(valorCentavos)}
    </button>
  )
}
