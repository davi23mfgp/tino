"use client"

import { useRef, useState } from "react"
import { File, FileSpreadsheet, FileText, Upload, X } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * FilesystemItem — inspirado no `filesystem-item` do builduilabs (21st.dev).
 *
 * O componente original é uma árvore de pastas; o Tino não tem árvore de
 * arquivo nenhuma. O que existe é `/importar`: a pessoa solta um extrato
 * (OFX/CSV/PDF) e antes disto o campo era um `<input type="file">` cru, sem
 * ícone, sem tamanho, sem jeito de trocar o arquivo sem reabrir o seletor.
 * Isto reaproveita a IDEIA do componente — um "item de arquivo" com ícone
 * por tipo, nome, tamanho e botão de remover — numa zona de soltar arquivo
 * em vez de uma árvore.
 */

function iconePara(nome: string) {
  const ext = nome.split(".").pop()?.toLowerCase()
  if (ext === "csv") return FileSpreadsheet
  if (ext === "pdf") return FileText
  return File
}

function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Um arquivo já escolhido, pronto para ser removido/trocado. */
export function FilesystemItem({ arquivo, aoRemover }: { arquivo: File; aoRemover: () => void }) {
  const Icone = iconePara(arquivo.name)
  return (
    <div className="flex items-center gap-3 rounded-[var(--raio-campo)] border border-pauta bg-papel-2 p-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-background text-muted-fg">
        <Icone className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium">{arquivo.name}</p>
        <p className="text-[11px] text-muted-fg">{formatarTamanho(arquivo.size)}</p>
      </div>
      <button
        type="button"
        onClick={aoRemover}
        aria-label="Remover arquivo"
        className="shrink-0 rounded-full p-1.5 text-muted-fg transition hover:bg-foreground/[0.06] hover:text-negativo"
      >
        <X className="size-4" />
      </button>
    </div>
  )
}

/**
 * Zona de soltar/escolher arquivo. Sem arquivo selecionado mostra o convite
 * para soltar ou clicar; com arquivo, mostra o `FilesystemItem`.
 */
export function ZonaDeArquivo({
  arquivo,
  aoEscolher,
  aceita,
  rotulo = "Solte o arquivo aqui ou clique para escolher",
}: {
  arquivo: File | null
  aoEscolher: (arquivo: File | null) => void
  aceita?: string
  rotulo?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [arrastando, setArrastando] = useState(false)

  if (arquivo) {
    return <FilesystemItem arquivo={arquivo} aoRemover={() => aoEscolher(null)} />
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(evento) => {
        if (evento.key === "Enter" || evento.key === " ") inputRef.current?.click()
      }}
      onDragOver={(evento) => {
        evento.preventDefault()
        setArrastando(true)
      }}
      onDragLeave={() => setArrastando(false)}
      onDrop={(evento) => {
        evento.preventDefault()
        setArrastando(false)
        const solto = evento.dataTransfer.files?.[0]
        if (solto) aoEscolher(solto)
      }}
      className={cn(
        "flex cursor-pointer flex-col items-center gap-2 rounded-[var(--raio-campo)] border border-dashed p-6 text-center transition-colors",
        arrastando ? "border-acao bg-acao/5" : "border-pauta hover:border-acao/40",
      )}
    >
      <Upload className="size-5 text-muted-fg" />
      <p className="text-[13px] text-muted-fg">{rotulo}</p>
      <input
        ref={inputRef}
        type="file"
        accept={aceita}
        className="sr-only"
        onChange={(evento) => aoEscolher(evento.target.files?.[0] ?? null)}
      />
    </div>
  )
}
