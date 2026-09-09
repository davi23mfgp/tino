"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"

import { enviar } from "@/lib/cliente"
import { paraCentavos } from "@/lib/dinheiro"
import { lerMeta } from "@/lib/tino/lingua-natural"
import { showToast } from "@/components/ui/toast"
import { SelectNative } from "@/components/ui/select-native"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

/**
 * Criar meta — item 3 do redesign de experiência (07/09/2026).
 *
 * A tela de Metas não tinha NENHUM jeito de cadastrar uma pela interface: só
 * existia via a conversa inicial. O próprio chat do Tino (`lib/tino/chat.ts`)
 * já dizia "crie uma em Metas" para quem perguntava de aposentadoria — a
 * promessa existia, a tela não cumpria. Isto fecha essa lacuna com o mesmo
 * padrão de linguagem natural das dívidas: escreve como falaria, confere os
 * campos, salva.
 *
 * O formulário de conferência virou `<Dialog>` em 07/09/2026 — mapeamento do
 * `dialog` do originui (21st.dev). Antes ele empurrava o resto da tela de
 * Metas para baixo ao abrir; como modal, abre por cima e fecha sozinho ao
 * salvar, sem mover o que já estava na tela.
 */

const TIPOS = [
  { valor: "OUTRO", rotulo: "Meta" },
  { valor: "VIAGEM", rotulo: "Viagem" },
  { valor: "RESERVA_EMERGENCIA", rotulo: "Reserva de emergência" },
  { valor: "APOSENTADORIA", rotulo: "Aposentadoria" },
  { valor: "IMOVEL", rotulo: "Imóvel" },
  { valor: "VEICULO", rotulo: "Veículo" },
  { valor: "EDUCACAO", rotulo: "Educação" },
  { valor: "QUITAR_DIVIDA", rotulo: "Quitar dívida" },
]

const campo = "rounded-[var(--raio-campo)] border border-pauta bg-background px-3.5 py-2.5 text-[13px] outline-none focus:border-acao/50"

const VAZIO = { nome: "", tipo: "OUTRO", alvo: "", saldo: "", dataAlvo: "", aporte: "" }

export function NovaMeta() {
  const router = useRouter()
  const [frase, setFrase] = useState("")
  const [abrir, setAbrir] = useState(false)
  const [nova, setNova] = useState(VAZIO)
  const [ocupado, setOcupado] = useState(false)

  function interpretarFrase() {
    if (!frase.trim()) return
    const lida = lerMeta(frase)
    setNova((atual) => ({
      ...atual,
      nome: lida.nome ?? atual.nome,
      alvo: lida.alvoCentavos !== null ? String(lida.alvoCentavos / 100).replace(".", ",") : atual.alvo,
      saldo: lida.saldoCentavos !== null ? String(lida.saldoCentavos / 100).replace(".", ",") : atual.saldo,
      dataAlvo: lida.dataAlvo ?? atual.dataAlvo,
    }))
    setAbrir(true)
    setFrase("")
  }

  async function criar(evento: React.FormEvent) {
    evento.preventDefault()
    setOcupado(true)
    try {
      await enviar("/api/metas", {
        nome: nova.nome,
        tipo: nova.tipo,
        alvoCentavos: paraCentavos(nova.alvo),
        saldoCentavos: nova.saldo ? paraCentavos(nova.saldo) : 0,
        dataAlvo: nova.dataAlvo || undefined,
        aporteMensalCentavos: nova.aporte ? paraCentavos(nova.aporte) : 0,
      })
      setNova(VAZIO)
      setAbrir(false)
      router.refresh()
    } catch (erro) {
      showToast("Não consegui criar a meta", {
        description: erro instanceof Error ? erro.message : undefined,
        variant: "error",
      })
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className="mt-4 border-t border-pauta pt-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          aria-label="Descreva sua meta"
          value={frase}
          onChange={(evento) => setFrase(evento.target.value)}
          onKeyDown={(evento) => {
            if (evento.key === "Enter") {
              evento.preventDefault()
              interpretarFrase()
            }
          }}
          placeholder="escreva: Viagem 8000 até dezembro, já tenho 1200"
          className={cn(campo, "min-w-0 flex-1")}
        />
        <button
          type="button"
          onClick={frase.trim() ? interpretarFrase : () => setAbrir(true)}
          className="flex shrink-0 items-center gap-1.5 rounded-[var(--raio-pilula)] border border-acao/40 bg-acao/10 px-4 py-2.5 text-[13px] text-acao"
        >
          <Plus className="size-3.5" /> nova meta
        </button>
      </div>

      <Dialog open={abrir} onOpenChange={setAbrir}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova meta</DialogTitle>
          </DialogHeader>
          <form id="form-nova-meta" onSubmit={criar}>
            <DialogBody className="grid gap-2 sm:grid-cols-3">
              <label className="flex min-w-0 flex-col gap-1.5 text-xs text-muted-fg">Nome da meta
                <input
                value={nova.nome}
                onChange={(evento) => setNova({ ...nova, nome: evento.target.value })}
                placeholder="nome da meta"
                required
                autoFocus
                className={cn(campo, "sm:col-span-2")}
              />
              </label>
              <label className="flex min-w-0 flex-col gap-1.5 text-xs text-muted-fg">Tipo de meta
                <SelectNative value={nova.tipo} onChange={(evento) => setNova({ ...nova, tipo: evento.target.value })}>
                {TIPOS.map((tipo) => (
                  <option key={tipo.valor} value={tipo.valor}>
                    {tipo.rotulo}
                  </option>
                ))}
              </SelectNative>
              </label>
              <label className="flex min-w-0 flex-col gap-1.5 text-xs text-muted-fg">Quanto quer juntar (R$)
                <input
                value={nova.alvo}
                onChange={(evento) => setNova({ ...nova, alvo: evento.target.value })}
                placeholder="quanto quer juntar"
                required
                inputMode="decimal"
                className={campo}
              />
              </label>
              <label className="flex min-w-0 flex-col gap-1.5 text-xs text-muted-fg">Já guardado (R$, opcional)
                <input
                value={nova.saldo}
                onChange={(evento) => setNova({ ...nova, saldo: evento.target.value })}
                placeholder="já tem guardado (opcional)"
                inputMode="decimal"
                className={campo}
              />
              </label>
              <label className="flex min-w-0 flex-col gap-1.5 text-xs text-muted-fg">Por mês (R$, opcional)
                <input
                value={nova.aporte}
                onChange={(evento) => setNova({ ...nova, aporte: evento.target.value })}
                placeholder="aporte por mês (opcional)"
                inputMode="decimal"
                className={campo}
              />
              </label>
              <label className="flex flex-col gap-1.5 text-[12px] text-muted-fg sm:col-span-3">
                data alvo (opcional)
                <input
                  type="date"
                  value={nova.dataAlvo}
                  onChange={(evento) => setNova({ ...nova, dataAlvo: evento.target.value })}
                  className={campo}
                />
              </label>
            </DialogBody>
            <DialogFooter>
              <button
                disabled={ocupado || !nova.nome || !nova.alvo}
                className="rounded-[var(--raio-pilula)] bg-primary px-4 py-2.5 text-[13px] font-medium text-primary-foreground disabled:opacity-40"
              >
                Criar meta
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
