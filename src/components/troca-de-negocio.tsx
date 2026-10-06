"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { Check, ChevronDown, Home, Plus, Store } from "lucide-react"

import { buscar, enviar } from "@/lib/cliente"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { showToast } from "@/components/ui/toast"
import menuConta from "./menu-da-conta.module.css"

interface Negocio { id: string; nome: string; rotulo: string | null }
interface Dados { ativoId: string; mesmoCnpj: boolean; negocios: Negocio[] }

/**
 * A troca de negócio no topo (opção A do passo 38, Davi, 06/10/2026).
 *
 * O nome fica sempre à vista, com a seta: o Nubank esconde a troca entre
 * pessoa física e PJ no nome e recebe reclamação de quem não acha
 * (`docs/pesquisas/2026-10-06-escolha-de-area-e-varios-negocios.md`).
 *
 * "Casa" leva ao login pessoal, não troca sozinho: o Davi pediu, em
 * 04/10/2026, que o pessoal e o MEI entrem por logins diferentes.
 */
export function TrocaDeNegocio() {
  const router = useRouter()
  // A barra do topo não remonta entre telas: recarrega a cada tela, senão o
  // nome fica o do negócio anterior depois de criar ou escolher outro.
  const caminho = usePathname()
  const [dados, setDados] = useState<Dados | null>(null)
  const [novoAberto, setNovoAberto] = useState(false)
  const [nomeNovo, setNomeNovo] = useState("")
  const [ocupado, setOcupado] = useState(false)

  const carregar = useCallback(() => {
    buscar<Dados>("/api/loja/negocios").then(setDados, () => setDados(null))
  }, [])
  useEffect(() => { carregar() }, [carregar, caminho])

  async function trocar(id: string) {
    if (!dados || id === dados.ativoId) return
    setOcupado(true)
    try {
      await enviar("/api/loja/negocios/ativo", { lojaId: id }, "PUT")
      setDados({ ...dados, ativoId: id })
      router.refresh()
    } catch (falha) {
      showToast(falha instanceof Error ? falha.message : "Não consegui trocar de negócio.", { variant: "error" })
    } finally {
      setOcupado(false)
    }
  }

  async function criar(evento: React.FormEvent) {
    evento.preventDefault()
    if (!nomeNovo.trim()) return
    setOcupado(true)
    try {
      await enviar("/api/loja/negocios", { nome: nomeNovo.trim() })
      setNovoAberto(false)
      setNomeNovo("")
      router.push("/loja/comecar")
      router.refresh()
    } catch (falha) {
      showToast(falha instanceof Error ? falha.message : "Não consegui criar o negócio.", { variant: "error" })
    } finally {
      setOcupado(false)
    }
  }

  if (!dados) return null
  const ativo = dados.negocios.find((negocio) => negocio.id === dados.ativoId) ?? dados.negocios[0]
  if (!ativo) return null

  return (
    <>
      <DropdownMenu modal={false} onOpenChange={(aberto) => { if (aberto) carregar() }}>
        <DropdownMenuTrigger asChild>
          <button type="button" aria-label={`Negócio aberto: ${ativo.nome}. Trocar de negócio`} disabled={ocupado}
            className="mt-1 inline-flex min-h-9 max-w-full items-center gap-1.5 rounded-full border border-[color-mix(in_oklab,oklch(var(--primary)),transparent_55%)] px-3 text-[calc(13.5px*var(--escala-letra))] font-semibold">
            <Store className="size-4 shrink-0 text-acao" aria-hidden />
            <span className="truncate">{ativo.nome}</span>
            <ChevronDown className="size-4 shrink-0 text-muted-fg" aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={8} className={menuConta.menu + " superficie-flutuante w-80 max-w-[calc(100vw-24px)] rounded-2xl border border-pauta p-2 shadow-xl"}>
          <p className="px-3 pb-1 pt-2 text-[11px] font-semibold tracking-[.12em] text-muted-fg">SEUS NEGÓCIOS</p>
          <DropdownMenuItem asChild className="min-h-12 rounded-xl px-3">
            <Link href="/login">
              <span className="grid size-9 place-items-center rounded-xl bg-papel-3"><Home aria-hidden /></span>
              <span className="min-w-0 flex-1"><span className="block font-semibold">Casa</span><span className="block text-xs text-muted-fg">suas contas pessoais · entra pelo login pessoal</span></span>
            </Link>
          </DropdownMenuItem>
          {dados.negocios.map((negocio) => (
            <DropdownMenuItem key={negocio.id} className="min-h-12 rounded-xl px-3" onSelect={() => void trocar(negocio.id)}>
              <span className="grid size-9 place-items-center rounded-xl bg-papel-3"><Store aria-hidden className={negocio.id === ativo.id ? "text-acao" : undefined} /></span>
              <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{negocio.nome}</span>
                <span className="block truncate text-xs text-muted-fg">{negocio.rotulo ?? "área ainda não escolhida"}</span></span>
              {negocio.id === ativo.id && <Check className="text-acao" aria-label="aberto" />}
            </DropdownMenuItem>
          ))}
          {dados.mesmoCnpj && (
            <p className="mx-2 my-1 rounded-xl px-3 py-2 text-xs leading-snug" style={{ background: "color-mix(in oklab, var(--atencao), transparent 88%)", color: "var(--atencao)" }}>
              Mesmo CNPJ: as vendas de todos os negócios somam no mesmo limite do MEI.
            </p>
          )}
          <DropdownMenuSeparator className="mx-2" />
          <DropdownMenuItem className="min-h-11 rounded-xl px-3 font-semibold text-acao" onSelect={() => setNovoAberto(true)}>
            <Plus aria-hidden />Novo negócio
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={novoAberto} onOpenChange={setNovoAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo negócio</DialogTitle>
            <DialogDescription>Cada negócio tem o seu balcão, clientes e caixa. No mesmo CNPJ, as vendas somam no mesmo limite do MEI.</DialogDescription>
          </DialogHeader>
          <form onSubmit={criar} className="grid gap-3">
            <label className="grid gap-1.5 text-sm font-medium">Nome do negócio
              <input autoFocus value={nomeNovo} onChange={(evento) => setNomeNovo(evento.target.value)} maxLength={60} placeholder="Ex.: Capinhas do Carlos"
                className="min-h-11 rounded-xl border border-pauta bg-transparent px-3 text-[15px]" />
            </label>
            <button type="submit" disabled={ocupado || !nomeNovo.trim()} className="min-h-11 rounded-full bg-[oklch(var(--primary))] px-4 font-semibold text-[oklch(var(--primary-foreground))] disabled:opacity-50">
              {ocupado ? "Criando…" : "Criar e escolher a área"}
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
