"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"

import { cn } from "@/lib/utils"
import { GRUPO_LOJA, GRUPOS_NAV, type ItemNav } from "@/lib/navegacao-grupos"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

/**
 * O "Buscar" do trilho lateral.
 *
 * Não é busca de TRANSAÇÃO (isso já existe dentro de /transacoes, sobre o
 * dado) — é busca de TELA: a pergunta que o ícone do trilho responde é "onde
 * fica X", não "quanto gastei em X". Ir atrás de outra coisa aqui seria
 * duplicar a busca de dado com pior contexto do que a tela certa já tem.
 */

const TODAS: (ItemNav & { grupo: string })[] = [
  ...GRUPOS_NAV.flatMap((g) => g.itens.map((item) => ({ ...item, grupo: g.titulo }))),
  ...GRUPO_LOJA.itens.map((item) => ({ ...item, grupo: GRUPO_LOJA.titulo })),
]

function achatar(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
}

export function BuscarPaginas({ mei }: { mei: boolean }) {
  const router = useRouter()
  const [aberto, setAberto] = useState(false)
  const [termo, setTermo] = useState("")
  const [selecionado, setSelecionado] = useState(0)
  const campo = useRef<HTMLInputElement>(null)

  const opcoes = useMemo(() => {
    const base = mei ? TODAS : TODAS.filter((item) => item.grupo !== "Loja")
    const q = achatar(termo.trim())
    if (!q) return base
    return base.filter((item) => achatar(item.rotulo).includes(q) || achatar(item.grupo).includes(q))
  }, [termo, mei])

  // Atalho global: Ctrl/Cmd+K abre a busca de qualquer tela, sem precisar
  // clicar no trilho — é o padrão que quem usa app de produtividade espera.
  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setAberto(true)
      }
    }
    window.addEventListener("keydown", aoTeclar)
    return () => window.removeEventListener("keydown", aoTeclar)
  }, [])

  useEffect(() => {
    if (aberto) {
      setTermo("")
      setSelecionado(0)
      // Foco só depois do diálogo montar, senão o Radix rouba o foco de volta.
      requestAnimationFrame(() => campo.current?.focus())
    }
  }, [aberto])

  useEffect(() => {
    setSelecionado(0)
  }, [termo])

  function ir(rota: string) {
    setAberto(false)
    router.push(rota)
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <button
        onClick={() => setAberto(true)}
        aria-label="Buscar uma tela"
        title="Buscar (Ctrl+K)"
        className="toque grid place-items-center rounded-2xl text-[color:var(--texto-2)] transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
      >
        <Search className="size-[18px]" />
      </button>

      <DialogContent className="max-w-[min(480px,92vw)] gap-0 overflow-hidden p-0">
        <DialogHeader className="px-4 py-3">
          <DialogTitle className="sr-only">Buscar uma tela do Tino</DialogTitle>
          <div className="flex items-center gap-2.5">
            <Search className="size-4 shrink-0 text-muted-fg" />
            <input
              ref={campo}
              value={termo}
              onChange={(e) => setTermo(e.target.value)}
              placeholder="Ir para..."
              className="w-full bg-transparent text-[15px] outline-none placeholder:text-muted-fg"
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault()
                  setSelecionado((s) => Math.min(s + 1, opcoes.length - 1))
                } else if (e.key === "ArrowUp") {
                  e.preventDefault()
                  setSelecionado((s) => Math.max(s - 1, 0))
                } else if (e.key === "Enter" && opcoes[selecionado]) {
                  ir(opcoes[selecionado].rota)
                }
              }}
            />
          </div>
        </DialogHeader>

        <div className="max-h-[50vh] overflow-y-auto p-2">
          {opcoes.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-fg">Nenhuma tela com esse nome.</p>
          ) : (
            opcoes.map((item, i) => {
              const { Icone } = item
              return (
                <button
                  key={item.rota}
                  onClick={() => ir(item.rota)}
                  onMouseEnter={() => setSelecionado(i)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                    i === selecionado ? "bg-foreground/[0.06] text-foreground" : "text-[color:var(--texto-2)]",
                  )}
                >
                  <Icone className="size-4 shrink-0" />
                  <span className="flex-1 truncate">{item.rotulo}</span>
                  <span className="text-[12px] text-muted-fg">{item.grupo}</span>
                </button>
              )
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
