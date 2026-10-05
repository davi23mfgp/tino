"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Bell, Check, Clock, FileText } from "lucide-react"

import { buscar, enviar } from "@/lib/cliente"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

import notificacoes from "./notificacoes.module.css"

interface Aviso { id: string; tipo: string; titulo: string; texto: string; rota: string | null; acao: string | null; lidoEm: string | null; criadoEm: string }

const ICONES: Record<string, typeof Bell> = { orcamento_aprovado: Check, os_vence: Clock, os_atrasada: Clock, orcamento_vence: FileText }

function haQuanto(iso: string) {
  const minutos = Math.round((Date.now() - new Date(iso).getTime()) / 60_000)
  if (minutos < 1) return "agora"
  if (minutos < 60) return `há ${minutos} min`
  if (minutos < 24 * 60) return `há ${Math.round(minutos / 60)} h`
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
}

/**
 * O sino do MEI (opção A do passo 37, Davi, 05/10/2026). O pessoal já tinha
 * o seu; o MEI não tinha nenhum, e o "cliente aprovou o orçamento" só
 * aparecia se o dono abrisse a tela Clientes por acaso.
 *
 * O número no sino conta só o que não foi lido. Abrir não marca como lido:
 * ver de relance não é tratar, e o aviso que some sozinho é o que se perde.
 */
export function AvisosDaLoja({ borda }: { borda: string }) {
  const [aberto, setAberto] = useState(false)
  const [avisos, setAvisos] = useState<Aviso[] | null>(null)
  const [erro, setErro] = useState(false)

  const carregar = useCallback(async () => {
    try {
      setErro(false)
      setAvisos((await buscar<{ avisos: Aviso[] }>("/api/loja/avisos")).avisos)
    } catch {
      setErro(true)
    }
  }, [])

  useEffect(() => {
    void carregar()
  }, [carregar])

  useEffect(() => {
    if (aberto) void carregar()
  }, [aberto, carregar])

  async function lerTodos() {
    setAvisos((lista) => lista?.map((aviso) => ({ ...aviso, lidoEm: aviso.lidoEm ?? new Date().toISOString() })) ?? null)
    await enviar("/api/loja/avisos", {}, "PATCH").catch(() => void carregar())
  }

  async function ler(id: string) {
    await enviar("/api/loja/avisos", { ids: [id] }, "PATCH").catch(() => undefined)
  }

  const novos = avisos?.filter((aviso) => !aviso.lidoEm).length ?? 0
  return (
    <Sheet open={aberto} onOpenChange={setAberto}>
      <SheetTrigger asChild>
        <button aria-label={novos ? `Avisos, ${novos} novos` : "Avisos"} className={"relative grid size-11 place-items-center rounded-full border sm:size-10 " + borda}>
          <Bell className="size-[18px]" strokeWidth={1.6} aria-hidden />
          {novos > 0 && <span className="absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[color:var(--atencao)] px-1 text-[11px] font-extrabold text-[oklch(0.2_0.03_75)]">{novos}</span>}
        </button>
      </SheetTrigger>
      <SheetContent className={notificacoes.painel + " flex w-full max-w-[400px] flex-col overflow-hidden p-0 sm:inset-y-auto sm:right-4 sm:top-20 sm:h-[min(560px,calc(100dvh-100px))] sm:rounded-2xl sm:border"}>
        <SheetHeader className="mb-0 px-5 pb-3 pr-16 pt-6">
          <SheetTitle className="text-[calc(20px*var(--escala-letra))] font-semibold tracking-tight">Avisos</SheetTitle>
          <SheetDescription className="text-xs">Orçamento aprovado, OS no prazo e orçamento perto de vencer.</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4">
          {avisos === null && !erro && <p role="status" className="py-6 text-sm text-muted-fg">Carregando avisos…</p>}
          {erro && <div role="alert" className="py-6"><p className="text-sm">Não foi possível carregar os avisos.</p><button className="mt-2 min-h-11 text-sm underline" onClick={() => void carregar()}>Tentar de novo</button></div>}
          {avisos?.length === 0 && (
            <div className="flex min-h-52 flex-col items-center justify-center gap-3 py-8 text-center">
              <span className="grid size-14 place-items-center rounded-2xl border border-pauta bg-papel-2 text-muted-fg"><Bell className="size-6" aria-hidden /></span>
              <p className="text-sm font-medium">Nada por enquanto</p>
              <p className="max-w-60 text-xs leading-relaxed text-muted-fg">Quando um cliente aprovar um orçamento pelo link, ou uma OS chegar no prazo, aparece aqui.</p>
            </div>
          )}
          {avisos?.map((aviso) => {
            const Icone = ICONES[aviso.tipo] ?? Bell
            const bom = aviso.tipo === "orcamento_aprovado"
            return (
              <article key={aviso.id} data-lido={Boolean(aviso.lidoEm)} className={"mb-2 flex items-start gap-3 rounded-[14px] py-3 pl-3 pr-3 last:mb-0 " + (aviso.lidoEm ? "border border-pauta" : "bg-papel-2")}>
                <span aria-hidden className={"mt-0.5 grid size-9 shrink-0 place-items-center rounded-[11px] " + (bom ? "bg-[color-mix(in_oklab,var(--positivo),transparent_85%)] text-[color:var(--positivo)]" : "bg-[color-mix(in_oklab,var(--atencao),transparent_85%)] text-[color:var(--atencao)]")}><Icone className="size-[17px]" /></span>
                <div className="min-w-0 flex-1">
                  <h2 className={"text-[calc(14.5px*var(--escala-letra))] leading-snug " + (aviso.lidoEm ? "font-normal text-muted-fg" : "font-semibold")}>{aviso.titulo}</h2>
                  <p className="mt-0.5 text-[calc(12.5px*var(--escala-letra))] leading-snug text-muted-fg">{aviso.texto} · {haQuanto(aviso.criadoEm)}</p>
                </div>
                {aviso.rota && (
                  <Link href={aviso.rota} className="shrink-0 self-center text-[calc(13px*var(--escala-letra))] font-semibold text-acao" onClick={() => { setAberto(false); if (!aviso.lidoEm) void ler(aviso.id) }}>
                    {aviso.acao ?? "Abrir"}
                  </Link>
                )}
              </article>
            )
          })}
        </div>
        {novos > 0 && (
          <footer className="flex items-center justify-end border-t border-pauta px-3 py-2">
            <button onClick={() => void lerTodos()} className="min-h-11 rounded-[10px] px-3 text-xs font-medium text-acao">Marcar todos como lidos</button>
          </footer>
        )}
      </SheetContent>
    </Sheet>
  )
}
