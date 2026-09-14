"use client"

import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { Bell, Check, LogOut, Settings, ShieldCheck } from "lucide-react"
import { buscar, enviar } from "@/lib/cliente"
import { tituloDaRota, todosOsGrupos, GRUPO_LOJA_FUNCIONARIO } from "@/lib/navegacao-grupos"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { FabAdicionar } from "@/components/fab-adicionar"
import { ThemeToggle } from "@/components/theme-toggle"
import { GatilhoBuscaPaginas } from "@/components/buscar-paginas"
import { showToast } from "@/components/ui/toast"

interface Alerta { id:string; titulo:string; texto:string; lido:boolean; acaoRota:string|null; severidade:string }
export function BarraTopo({nome,admin,avatarUrl,competencia,apenasLoja}:{nome:string;admin?:boolean;avatarUrl?:string|null;competencia?:string;apenasLoja?:boolean}) {
  const router=useRouter()
  const caminho=usePathname()
  const [alertas,setAlertas]=useState<Alerta[]>([])
  const [aberto,setAberto]=useState(false)
  const [erro,setErro]=useState(false)
  const [carregando,setCarregando]=useState(true)
  const [salvando,setSalvando]=useState(false)
  const [soNovas,setSoNovas]=useState(false)
  const carregar=useCallback(async()=>{
    if(apenasLoja) return
    setCarregando(true);setErro(false)
    try { setAlertas(await buscar<Alerta[]>("/api/tino/alertas")) } catch { setErro(true) } finally { setCarregando(false) }
  },[apenasLoja])
  useEffect(()=>{void carregar()},[carregar])
  async function marcar(ids?:string[]) {
    setSalvando(true)
    try {
      await enviar("/api/tino/alertas",ids ? {ids} : {},"PATCH")
      setAlertas(lista=>lista.map(a=>!ids || ids.includes(a.id) ? {...a,lido:true} : a))
    } catch { showToast("Não foi possível marcar como lida. Tente novamente.",{variant:"error"}) }
    finally { setSalvando(false) }
  }
  async function sair() {
    try { await enviar("/api/auth/logout",{});router.push("/login");router.refresh() }
    catch { showToast("Não consegui sair. Tente novamente.",{variant:"error"}) }
  }
  const titulo=tituloDaRota(apenasLoja ? [GRUPO_LOJA_FUNCIONARIO] : todosOsGrupos(true),caminho) ?? "Tino"
  const novas=alertas.filter(a=>!a.lido)
  const prioridade:Record<string,number>={CRITICO:0,ATENCAO:1,INFO:2}
  const lista=[...(soNovas ? novas : alertas)].sort((a,b)=>(prioridade[a.severidade]??3)-(prioridade[b.severidade]??3))
  return <header className="app-header">
    <div className="app-header-title"><h1>{caminho==="/painel" ? "Olá, "+nome.split(" ")[0]+"." : titulo}</h1><p>{apenasLoja ? "Sua loja, organizada." : competencia}</p></div>
    <div className="app-header-actions">
      {!apenasLoja && <div className="hidden sm:block"><GatilhoBuscaPaginas /></div>}
      {!apenasLoja && <FabAdicionar ancorado />}
      {!apenasLoja && <Sheet open={aberto} onOpenChange={setAberto}>
        <SheetTrigger asChild><button aria-label="Notificações" className="relative grid size-11 place-items-center rounded-full border border-pauta"><Bell className="size-5" aria-hidden/>{novas.length>0 && <span className="absolute right-1 top-1 size-2 rounded-full bg-acao" />}</button></SheetTrigger>
        <SheetContent className="flex w-full max-w-[480px] flex-col overflow-hidden p-0"><SheetHeader className="mb-0 border-b border-pauta px-6 pb-5 pt-7 pr-16"><SheetTitle className="text-2xl font-bold tracking-tight">Notificações</SheetTitle><SheetDescription>Vencimentos, pendências e próximos passos.</SheetDescription></SheetHeader><div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5">
          <div className="mb-3 flex gap-2">{[{novas:false,rotulo:"Todas"},{novas:true,rotulo:`Não lidas (${novas.length})`}].map(aba=><button key={aba.rotulo} onClick={()=>setSoNovas(aba.novas)} aria-pressed={soNovas===aba.novas} className={"min-h-11 rounded-full border px-4 text-sm transition-colors "+(soNovas===aba.novas ? "border-transparent bg-foreground font-semibold text-background" : "border-pauta text-muted-fg hover:text-foreground")}>{aba.rotulo}</button>)}</div>
          {carregando ? <p role="status" className="py-6 text-sm text-muted-fg">Carregando avisos…</p> : erro ? <div role="alert"><p>Não foi possível carregar os avisos.</p><button className="min-h-11 underline" onClick={()=>void carregar()}>Tentar novamente</button></div> : <>
            {!lista.length && <p className="py-8 text-center text-sm text-muted-fg">Nenhum aviso por aqui.</p>}
            {lista.map(a=><article key={a.id} className={"mb-3 rounded-2xl border p-4 " + (a.lido ? "border-pauta/50 bg-transparent" : a.severidade === "CRITICO" ? "border-red-500/40 bg-red-500/10" : a.severidade === "ATENCAO" ? "border-amber-500/40 bg-amber-500/10" : "border-pauta bg-papel-2")}><div className="flex items-start gap-3"><div className="min-w-0 flex-1"><span className={"mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide "+(a.lido ? "text-muted-fg/70" : "text-foreground")}>{!a.lido && <span aria-hidden className="size-2 shrink-0 rounded-full bg-acao" />}{a.severidade === "CRITICO" ? "Prioridade alta" : a.severidade === "ATENCAO" ? "Atenção" : "Informação"}{a.lido ? " · Lida" : " · Nova"}</span><h2 className={"text-lg leading-snug tracking-tight "+(a.lido ? "font-semibold text-muted-fg" : "font-bold text-foreground")}>{a.titulo}</h2><p className={"mt-2 text-sm leading-relaxed "+(a.lido ? "text-muted-fg/80" : "text-muted-fg")}>{a.texto}</p>{a.acaoRota && <Link href={a.acaoRota} onClick={()=>setAberto(false)} className="inline-flex min-h-11 items-center text-sm underline">Ver detalhes</Link>}</div>{!a.lido && <button disabled={salvando} aria-label={"Marcar como lida: "+a.titulo} onClick={()=>void marcar([a.id])} className="grid size-11 shrink-0 place-items-center rounded-full border border-pauta"><Check size={16}/></button>}</div></article>)}
            <button disabled={salvando || !novas.length} onClick={()=>void marcar()} className="mt-3 min-h-11 text-sm underline disabled:opacity-50">Marcar todas como lidas</button>
          </>}
        </div></SheetContent>
      </Sheet>}
      <DropdownMenu><DropdownMenuTrigger asChild><button aria-label="Minha conta" className="grid size-11 place-items-center rounded-full border border-pauta"><Avatar className="size-8">{avatarUrl && <AvatarImage src={avatarUrl} alt="" />}<AvatarFallback>{nome.charAt(0).toUpperCase()}</AvatarFallback></Avatar></button></DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60"><DropdownMenuLabel>{nome}</DropdownMenuLabel><DropdownMenuSeparator/>
          {!apenasLoja && <DropdownMenuItem asChild><Link href="/configuracoes"><Settings className="mr-2 size-4"/>Minha conta</Link></DropdownMenuItem>}
          {admin && !apenasLoja && <DropdownMenuItem asChild><Link href="/admin"><ShieldCheck className="mr-2 size-4"/>Administração</Link></DropdownMenuItem>}
          <div className="flex items-center justify-between px-2 py-2 text-sm"><span>Aparência</span><ThemeToggle/></div>
          <DropdownMenuSeparator/><DropdownMenuItem onClick={()=>void sair()}><LogOut className="mr-2 size-4"/>Sair</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </header>
}