"use client"

import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { AlertTriangle, Bell, Check, Clock, Info, LogOut, Settings, ShieldCheck } from "lucide-react"
import { buscar, enviar } from "@/lib/cliente"
import { tituloDaRota, todosOsGrupos, GRUPO_LOJA_FUNCIONARIO } from "@/lib/navegacao-grupos"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { FabAdicionar } from "@/components/fab-adicionar"
import { ThemeToggle } from "@/components/theme-toggle"
import { GatilhoBuscaPaginas } from "@/components/buscar-paginas"
import { usarAlertas } from "@/components/alertas-provider"
import { showToast } from "@/components/ui/toast"

export function BarraTopo({nome,admin,avatarUrl,competencia,apenasLoja}:{nome:string;admin?:boolean;avatarUrl?:string|null;competencia?:string;apenasLoja?:boolean}) {
  const router=useRouter()
  const caminho=usePathname()
  const [aberto,setAberto]=useState(false)
  // Os avisos vêm do provedor: quatro componentes desta mesma tela pediam a
  // mesma lista, cada um no seu tempo, e marcar como lido num não apagava a
  // bolinha dos outros.
  const {alertas,carregando,erro,recarregar,marcarLidos,dispensarTodos}=usarAlertas()
  const [salvando,setSalvando]=useState(false)
  const [soNovas,setSoNovas]=useState(false)
  async function marcar(ids?:string[]) {
    setSalvando(true)
    try { await marcarLidos(ids) }
    catch { showToast("Não foi possível marcar como lida. Tente novamente.",{variant:"error"}) }
    finally { setSalvando(false) }
  }
  /**
   * "Limpar tudo": arquiva os avisos em vez de apagar.
   *
   * O registro continua no banco e nenhuma transacao e tocada -- so sai da
   * lista. E nao volta no proximo carregamento: `atualizarAlertas` so reabre
   * um aviso dispensado quando o MOTIVO dele muda (o texto recalculado e
   * outro). Sem isso o botao parecia quebrado, porque o GET seguinte
   * recriava tudo pela chave estavel.
   */
  async function limparTudo() {
    setSalvando(true)
    try { await dispensarTodos() }
    catch { showToast("Nao foi possivel limpar os avisos. Tente novamente.",{variant:"error"}) }
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
      {/* Barra, nao icone: o botao redondo so com a lupa nao dizia o que faz nem
          que existe atalho. A forma de barra e a mesma do resto do app e ja
          carrega o rotulo e a pista `Ctrl K`. */}
      {!apenasLoja && <div className="hidden sm:block"><GatilhoBuscaPaginas variant="barra" /></div>}
      {!apenasLoja && <FabAdicionar ancorado />}
      {!apenasLoja && <Sheet open={aberto} onOpenChange={setAberto}>
        <SheetTrigger asChild><button aria-label="Notificações" className="relative grid size-11 place-items-center rounded-full border border-pauta sm:size-10"><Bell className="size-[18px]" strokeWidth={1.6} aria-hidden/>{novas.length>0 && <span className="absolute right-1 top-1 size-2 rounded-full bg-acao" />}</button></SheetTrigger>
        {/* Painel na forma da referência aprovada (13/09): título forte,
            segmentado Todas/Não lidas com a contagem, cartões compactos com
            ícone circular, e o rodapé fixo com as duas ações em texto.

            O que saiu: o rótulo de severidade em caixa alta acima de cada
            título (três palavras repetidas em todo cartão), o título de 18px
            e o "Ver detalhes" sublinhado ocupando uma linha inteira. A
            urgência agora é uma barra de 3px na lateral esquerda — cor
            moderada, como o prompt pede, em vez de fundo vermelho no cartão
            inteiro. */}
        <SheetContent className="flex w-full max-w-[440px] flex-col overflow-hidden p-0">
          <SheetHeader className="mb-0 px-5 pb-3 pr-16 pt-6">
            <SheetTitle className="text-[calc(26px*var(--escala-letra))] font-bold tracking-tight">Notificações</SheetTitle>
            <SheetDescription className="sr-only">Vencimentos, pendências e próximos passos.</SheetDescription>
          </SheetHeader>

          <div className="px-5 pb-3">
            <div role="tablist" aria-label="Filtrar avisos" className="grid grid-cols-2 gap-1 rounded-[12px] bg-papel-2 p-1">
              {([false, true] as const).map((soNaoLidas) => (
                <button
                  key={String(soNaoLidas)}
                  role="tab"
                  aria-selected={soNovas === soNaoLidas}
                  onClick={() => setSoNovas(soNaoLidas)}
                  className={"min-h-9 rounded-[9px] px-3 text-sm transition-colors " + (soNovas === soNaoLidas ? "bg-papel-solido font-semibold text-foreground shadow-[0_1px_2px_rgb(0_0_0/.25)]" : "text-muted-fg hover:text-foreground")}
                >
                  {soNaoLidas ? `Não lidas · ${novas.length}` : "Todas"}
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4">
            {carregando ? <p role="status" className="py-6 text-sm text-muted-fg">Carregando avisos…</p> : erro ? <div role="alert" className="py-6"><p className="text-sm">Não foi possível carregar os avisos.</p><button className="mt-2 min-h-11 text-sm underline" onClick={()=>void recarregar()}>Tentar novamente</button></div> : <>
              {!lista.length && <p className="py-10 text-center text-sm text-muted-fg">{soNovas ? "Nenhum aviso não lido." : "Nenhum aviso por aqui."}</p>}
              {lista.map(a=>(
                <article key={a.id} className={"relative mb-2 flex items-start gap-3 overflow-hidden rounded-[14px] py-3 pl-4 pr-3 last:mb-0 " + (a.lido ? "border border-pauta bg-transparent" : "bg-papel-2")}>
                  {a.severidade !== "INFO" && !a.lido && <span aria-hidden className={"absolute inset-y-0 left-0 w-[3px] " + (a.severidade === "CRITICO" ? "bg-negativo" : "bg-atencao")} />}
                  <span aria-hidden className={"mt-0.5 grid size-9 shrink-0 place-items-center rounded-full " + (a.lido ? "bg-transparent text-[color:var(--texto-3)] ring-1 ring-inset ring-[color:var(--pauta)]" : "bg-papel-solido text-[color:var(--texto-2)]")}>
                    {a.severidade === "CRITICO" ? <AlertTriangle className="size-[17px]" /> : a.severidade === "ATENCAO" ? <Clock className="size-[17px]" /> : <Info className="size-[17px]" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2">
                      <h2 className={"flex min-w-0 flex-1 items-center gap-1.5 text-[calc(15px*var(--escala-letra))] leading-snug " + (a.lido ? "font-normal text-muted-fg" : "font-semibold text-foreground")}>{!a.lido && <span aria-hidden className="size-2 shrink-0 rounded-full bg-acao" />}<span className="min-w-0 flex-1 truncate">{a.titulo}</span></h2>
                      <span className="shrink-0 pt-0.5 text-xs text-muted-fg">{new Date(a.criadoEm ?? Date.now()).toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"})}</span>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-[calc(13px*var(--escala-letra))] leading-snug text-muted-fg">{a.texto}</p>
                    {a.acaoRota && <Link href={a.acaoRota} onClick={()=>setAberto(false)} className="mt-1 inline-flex min-h-9 items-center text-[calc(13px*var(--escala-letra))] text-acao">Ver detalhes</Link>}
                  </div>
                  <button
                    disabled={salvando || a.lido}
                    aria-label={a.lido ? `Lida: ${a.titulo}` : `Marcar como lida: ${a.titulo}`}
                    onClick={()=>void marcar([a.id])}
                    className={"mt-0.5 grid size-8 shrink-0 place-items-center rounded-full transition-colors " + (a.lido ? "bg-papel-solido text-[color:var(--texto-3)]" : "bg-acao/15 text-acao hover:bg-acao/25")}
                  >
                    <Check className="size-[15px]" aria-hidden />
                  </button>
                </article>
              ))}
            </>}
          </div>

          <footer className="flex items-center justify-between gap-2 border-t border-pauta px-3 py-2">
            <button disabled={salvando || !novas.length} onClick={()=>void marcar()} className="min-h-11 rounded-[10px] px-3 text-sm font-medium text-acao disabled:opacity-40">Marcar todas lidas</button>
            <button disabled={salvando || !alertas.length} onClick={()=>void limparTudo()} className="min-h-11 rounded-[10px] px-3 text-sm font-medium text-negativo disabled:opacity-40">Limpar tudo</button>
          </footer>
        </SheetContent>
      </Sheet>}
      <DropdownMenu><DropdownMenuTrigger asChild><button aria-label="Minha conta" className="grid size-11 place-items-center rounded-full border border-pauta sm:size-10"><Avatar className="size-8 sm:size-7">{avatarUrl && <AvatarImage src={avatarUrl} alt="" />}<AvatarFallback>{nome.charAt(0).toUpperCase()}</AvatarFallback></Avatar></button></DropdownMenuTrigger>
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