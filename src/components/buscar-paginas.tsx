"use client"

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"

import { cn } from "@/lib/utils"
import { todosOsGrupos, type ItemNav } from "@/lib/navegacao-grupos"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

/**
 * O "Buscar" de TELA (não de transação — isso já existe dentro de
 * /transacoes, sobre o dado). A pergunta que este buscador responde é "onde
 * fica X", não "quanto gastei em X".
 *
 * Virou Provider nesta rodada (07/09/2026, skin acromática): antes cada
 * gatilho (`TrilhoLateral`, cabeçalho móvel) montava seu PRÓPRIO
 * `<BuscarPaginas>` inteiro — diálogo, estado e listener de Ctrl+K
 * duplicados. Os dois ficavam sempre no DOM ao mesmo tempo (só escondidos
 * por CSS, `hidden lg:flex`/`lg:hidden` — nenhum dos dois desmonta), então
 * Ctrl+K já abria dois diálogos sobrepostos antes desta mudança. Ao
 * acrescentar um TERCEIRO gatilho (a barra "Buscar... Ctrl K" da
 * `BarraTopo`, pedida nesta rodada), isso ia virar três — por isso o
 * estado e o diálogo agora vivem uma vez só no Provider, montado no layout,
 * e cada lugar só planta um botão que chama `abrir()`.
 */

function todasAsTelas(mei: boolean): (ItemNav & { grupo: string })[] {
  return todosOsGrupos(mei).flatMap((g) => g.itens.map((item) => ({ ...item, grupo: g.titulo })))
}

function achatar(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
}

const BuscaContexto = createContext<{ abrir: () => void } | null>(null)

export function BuscaPaginasProvider({ mei, children }: { mei: boolean; children: React.ReactNode }) {
  const router = useRouter()
  const [aberto, setAberto] = useState(false)
  const [termo, setTermo] = useState("")
  const [selecionado, setSelecionado] = useState(0)
  const campo = useRef<HTMLInputElement>(null)

  const opcoes = useMemo(() => {
    const base = todasAsTelas(mei)
    const q = achatar(termo.trim())
    if (!q) return base
    return base.filter((item) => achatar(item.rotulo).includes(q) || achatar(item.grupo).includes(q))
  }, [termo, mei])

  // Atalho global: Ctrl/Cmd+K abre a busca de qualquer tela, sem precisar
  // clicar em nada — é o padrão que quem usa app de produtividade espera.
  // Um listener só, porque agora só existe um Provider montado.
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
    <BuscaContexto.Provider value={{ abrir: () => setAberto(true) }}>
      {children}

      <Dialog open={aberto} onOpenChange={setAberto}>
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
    </BuscaContexto.Provider>
  )
}

function useBuscaPaginas() {
  const contexto = useContext(BuscaContexto)
  if (!contexto) throw new Error("useBuscaPaginas precisa estar dentro de <BuscaPaginasProvider>")
  return contexto
}

/**
 * O botão que abre a busca. Dois formatos:
 * - "icone": compacto, do trilho lateral e do cabeçalho móvel (como já era).
 * - "barra": campo "Buscar..." com a pista visual "Ctrl K" à direita, como a
 *   referência — mesmo diálogo/atalho do Provider, só um gatilho maior pra
 *   quem tem espaço horizontal sobrando (`BarraTopo`, desktop).
 */
export function GatilhoBuscaPaginas({
  variant = "icone",
}: {
  variant?: "icone" | "barra" | "trilho"
}) {
  const { abrir } = useBuscaPaginas()

  if (variant === "barra") {
    return (
      <button
        onClick={abrir}
        aria-label="Buscar uma tela"
        className="flex h-11 w-full max-w-[220px] items-center gap-2 rounded-[var(--raio-pilula)] border border-pauta bg-papel-2 px-4 text-left text-[13px] text-muted-fg transition hover:border-acao/40 hover:text-foreground"
      >
        <Search className="size-[15px] shrink-0" />
        <span className="flex-1 truncate">Buscar...</span>
        {/* Só a pista visual — o atalho de verdade já existe (`Ctrl/Cmd+K`
            no Provider), não é implementado de novo aqui. */}
        <kbd className="shrink-0 rounded-md border border-pauta bg-papel-1 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-muted-fg">
          Ctrl K
        </kbd>
      </button>
    )
  }

  // No trilho ele é um item de navegação como os outros: ícone E rótulo de
  // 12px (PARTE 4.2 do spec). Antes o botão não tinha tamanho nenhum e
  // media 18x18px — alvo de mouse, não de dedo, e o único item do trilho
  // sem nome escrito.
  if (variant === "trilho") {
    return (
      <button
        onClick={abrir}
        aria-label="Buscar uma tela"
        className="toque flex w-full flex-col items-center gap-1 rounded-2xl px-1 py-2 text-[color:var(--texto-2)] transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
      >
        <Search className="size-[18px]" />
        <span className="text-[12px] font-medium leading-none">Buscar</span>
      </button>
    )
  }

  return (
    <button
      onClick={abrir}
      aria-label="Buscar uma tela"
      title="Buscar (Ctrl+K)"
      className="toque grid size-11 place-items-center rounded-2xl text-[color:var(--texto-2)] transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
    >
      <Search className="size-[18px]" />
    </button>
  )
}
