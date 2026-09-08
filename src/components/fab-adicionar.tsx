"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Receipt, Upload, Zap } from "lucide-react"

import { buscar, enviar } from "@/lib/cliente"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { SelectNative } from "@/components/ui/select-native"
import { showToast } from "@/components/ui/toast"

/**
 * Botão "+" fixo — padrão mobile do Calen (pedido explícito de Davi: "botão
 * + fixo... replique de verdade"). Só no celular (`lg:hidden`, o desktop já
 * tem espaço de sobra pros mesmos destinos no trilho/menu "Mais").
 *
 * A ORDEM das opções segue o pedido de automação-primeiro: "Anotar" (fila
 * automática — a pessoa escreve como falaria, o Tino tenta preencher
 * sozinho, mesma ideia de `lib/captura/notificacao.ts`) e "Importar
 * extrato" (o banco preenche sozinho) vêm ANTES de "Nova transação
 * manual", que continua existindo como saída de emergência, nunca como a
 * ação sugerida primeiro.
 *
 * "Nova transação manual" é a única peça de verdade nova aqui: a API
 * (`POST /api/transacoes`) já aceitava lançamento manual desde sempre, mas
 * NENHUMA tela tinha formulário pra isso — só existia por natural language
 * (`/capturas`) ou import (`/importar`). Formulário mínimo (conta, tipo,
 * descrição, valor, data); categoria fica de fora de propósito — a própria
 * rota já sugere pela regra do lar quando não vem categoria, então pedir
 * pra escolher aqui seria o oposto de "mínimo esforço".
 */

interface Conta {
  id: string
  nome: string
}

const HOJE_ISO = () => new Date().toISOString().slice(0, 10)

export function FabAdicionar() {
  const router = useRouter()
  const [menuAberto, setMenuAberto] = useState(false)
  const [formAberto, setFormAberto] = useState(false)
  const [contas, setContas] = useState<Conta[]>([])
  const [enviando, setEnviando] = useState(false)

  const [contaId, setContaId] = useState("")
  const [tipo, setTipo] = useState<"DESPESA" | "RECEITA">("DESPESA")
  const [descricao, setDescricao] = useState("")
  const [valor, setValor] = useState("")
  const [data, setData] = useState(HOJE_ISO())

  useEffect(() => {
    if (!formAberto) return
    buscar<Conta[]>("/api/contas")
      .then((lista) => {
        setContas(lista)
        setContaId((atual) => atual || lista[0]?.id || "")
      })
      .catch(() => setContas([]))
  }, [formAberto])

  async function salvar(evento: React.FormEvent) {
    evento.preventDefault()
    const valorCentavos = Math.round(Number(valor.replace(",", ".")) * 100)
    if (!contaId || !descricao.trim() || !Number.isFinite(valorCentavos) || valorCentavos <= 0) {
      showToast("Preencha conta, descrição e um valor válido.", { variant: "error" })
      return
    }

    setEnviando(true)
    try {
      await enviar(
        "/api/transacoes",
        { contaId, tipo, descricao: descricao.trim(), valorCentavos, data },
        "POST",
      )
      showToast("Lançamento adicionado.", { variant: "success" })
      setFormAberto(false)
      setDescricao("")
      setValor("")
      router.refresh()
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Não consegui salvar.", { variant: "error" })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <>
      <div className="fixed bottom-24 right-4 z-40 lg:hidden">
        {menuAberto && (
          <div className="vidro-menu absolute bottom-16 right-0 w-56 space-y-0.5 rounded-[var(--raio-cartao)] p-1.5">
            <button
              onClick={() => {
                setMenuAberto(false)
                router.push("/capturas")
              }}
              className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left text-[14px] transition-colors hover:bg-foreground/[0.05]"
            >
              <Zap className="size-4 shrink-0 text-muted-fg" />
              Anotar
            </button>
            <button
              onClick={() => {
                setMenuAberto(false)
                router.push("/importar")
              }}
              className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left text-[14px] transition-colors hover:bg-foreground/[0.05]"
            >
              <Upload className="size-4 shrink-0 text-muted-fg" />
              Importar extrato
            </button>
            <button
              onClick={() => {
                setMenuAberto(false)
                setFormAberto(true)
              }}
              className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left text-[14px] transition-colors hover:bg-foreground/[0.05]"
            >
              <Receipt className="size-4 shrink-0 text-muted-fg" />
              Nova transação manual
            </button>
          </div>
        )}

        {menuAberto && (
          <button
            aria-label="Fechar"
            onClick={() => setMenuAberto(false)}
            className="fixed inset-0 -z-10 cursor-default"
          />
        )}

        <button
          onClick={() => setMenuAberto((atual) => !atual)}
          aria-label="Adicionar"
          aria-expanded={menuAberto}
          className="ios-tap grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-alta"
        >
          <Plus className={cn("size-6 transition-transform duration-200", menuAberto && "rotate-45")} />
        </button>
      </div>

      <Dialog open={formAberto} onOpenChange={setFormAberto}>
        <DialogContent className="max-w-[min(420px,92vw)]">
          <DialogHeader>
            <DialogTitle>Nova transação</DialogTitle>
          </DialogHeader>

          <form onSubmit={salvar} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTipo("DESPESA")}
                className={cn(
                  "rounded-[var(--raio-campo)] border px-3 py-2 text-[13px] font-medium transition-colors",
                  tipo === "DESPESA"
                    ? "border-negativo/40 bg-negativo/10 text-negativo"
                    : "border-pauta text-muted-fg hover:bg-foreground/[0.04]",
                )}
              >
                Despesa
              </button>
              <button
                type="button"
                onClick={() => setTipo("RECEITA")}
                className={cn(
                  "rounded-[var(--raio-campo)] border px-3 py-2 text-[13px] font-medium transition-colors",
                  tipo === "RECEITA"
                    ? "border-positivo/40 bg-positivo/10 text-positivo"
                    : "border-pauta text-muted-fg hover:bg-foreground/[0.04]",
                )}
              >
                Receita
              </button>
            </div>

            <SelectNative value={contaId} onChange={(e) => setContaId(e.target.value)} required>
              {contas.length === 0 && <option value="">Carregando contas…</option>}
              {contas.map((conta) => (
                <option key={conta.id} value={conta.id}>
                  {conta.nome}
                </option>
              ))}
            </SelectNative>

            <input
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descrição (ex.: mercado)"
              required
              className="w-full rounded-[var(--raio-campo)] border border-pauta bg-background/60 px-3.5 py-2.5 text-[14px] outline-none focus:border-acao/50"
            />

            <div className="grid grid-cols-2 gap-2">
              <input
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="Valor (ex.: 52,30)"
                inputMode="decimal"
                required
                className="w-full rounded-[var(--raio-campo)] border border-pauta bg-background/60 px-3.5 py-2.5 text-[14px] outline-none focus:border-acao/50"
              />
              <input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                required
                className="w-full rounded-[var(--raio-campo)] border border-pauta bg-background/60 px-3.5 py-2.5 text-[14px] outline-none focus:border-acao/50"
              />
            </div>

            <button
              type="submit"
              disabled={enviando}
              className="ios-tap w-full rounded-[var(--raio-pilula)] bg-primary py-2.5 text-[14px] font-medium text-primary-foreground transition disabled:opacity-60"
            >
              {enviando ? "Salvando…" : "Salvar"}
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
