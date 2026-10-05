"use client"

import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { AlertTriangle, ChevronRight, Bell, Check, Clock, Info, LogOut, Settings, ShieldCheck } from "lucide-react"
import { buscar, enviar } from "@/lib/cliente"
import { tituloDaRota, todosOsGrupos, GRUPO_LOJA_FUNCIONARIO } from "@/lib/navegacao-grupos"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { FabAdicionar } from "@/components/fab-adicionar"
import { ThemeToggle } from "@/components/theme-toggle"
import { GatilhoBuscaPaginas } from "@/components/buscar-paginas"
import { usarAlertas } from "@/components/alertas-provider"
import notificacoes from "./notificacoes.module.css"
import { AvisosDaLoja } from "./avisos-da-loja"
import menuConta from "./menu-da-conta.module.css"
import { showToast } from "@/components/ui/toast"

/**
 * O sino de notificações e o menu da conta.
 *
 * Separado da barra porque o Início, no celular, mostra os dois dentro do
 * bloco branco do topo. `sobreClaro` troca a borda e a cor para o fundo
 * branco daquele bloco — a borda do tema escuro é branca e sumia ali.
 */
export function AcoesDaConta({nome,admin,avatarUrl,apenasLoja,mei,sobreClaro}:{nome:string;admin?:boolean;avatarUrl?:string|null;apenasLoja?:boolean;mei?:boolean;sobreClaro?:boolean}) {
  const router=useRouter()
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
  const novas=alertas.filter(a=>!a.lido)
  const prioridade:Record<string,number>={CRITICO:0,ATENCAO:1,INFO:2}
  const lista=[...(soNovas ? novas : alertas)].sort((a,b)=>(prioridade[a.severidade]??3)-(prioridade[b.severidade]??3))
  const borda=sobreClaro ? "border-[oklch(0_0_0/0.12)] text-[oklch(0.17_0.02_145)]" : "border-pauta"
  return <>
      {!apenasLoja && !mei && <Sheet open={aberto} onOpenChange={setAberto}>
        <SheetTrigger asChild><button aria-label="Notificações" className={"relative grid size-11 place-items-center rounded-full border sm:size-10 "+borda}><Bell className="size-[18px]" strokeWidth={1.6} aria-hidden/>{/* Ponto vermelho quando há alerta crítico sem ler: a faixa que o
            repetia no topo de toda tela saiu (Davi, 25/09), e o sino passou a
            ser o único aviso fora do Início. */}
        {novas.length>0 && <span className={"absolute right-1 top-1 size-2 rounded-full " + (novas.some((a) => a.severidade === "CRITICO") ? "bg-negativo" : "bg-acao")} />}</button></SheetTrigger>
        <SheetContent className={notificacoes.painel + " flex w-full max-w-[400px] flex-col overflow-hidden p-0 sm:inset-y-auto sm:right-4 sm:top-20 sm:h-[min(560px,calc(100dvh-100px))] sm:rounded-2xl sm:border"}>
          <SheetHeader className="mb-0 px-5 pb-3 pr-16 pt-6">
            <SheetTitle className="text-[calc(20px*var(--escala-letra))] font-semibold tracking-tight">Notificações</SheetTitle>
            <SheetDescription className="text-xs">Vencimentos e próximos passos, em um lugar só.</SheetDescription>
          </SheetHeader>

          <div className="px-5 pb-3">
            <div role="tablist" aria-label="Filtrar avisos" className="grid grid-cols-2 gap-1 rounded-[12px] bg-papel-2 p-1">
              {([false, true] as const).map((soNaoLidas) => (
                <button
                  key={String(soNaoLidas)}
                  role="tab"
                  aria-selected={soNovas === soNaoLidas}
                  onClick={() => setSoNovas(soNaoLidas)}
                  className={"min-h-11 rounded-[9px] px-3 text-sm transition-colors " + (soNovas === soNaoLidas ? "bg-papel-solido font-semibold text-foreground shadow-[0_1px_2px_rgb(0_0_0/.25)]" : "text-muted-fg hover:text-foreground")}
                >
                  {soNaoLidas ? `Não lidas · ${novas.length}` : "Todas"}
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4">
            {carregando ? <p role="status" className="py-6 text-sm text-muted-fg">Carregando avisos…</p> : erro ? <div role="alert" className="py-6"><p className="text-sm">Não foi possível carregar os avisos.</p><button className="mt-2 min-h-11 text-sm underline" onClick={()=>void recarregar()}>Tentar novamente</button></div> : <>
              {!lista.length && <div className="flex min-h-52 flex-col items-center justify-center gap-3 py-8 text-center"><span className="grid size-14 place-items-center rounded-2xl border border-pauta bg-papel-2 text-muted-fg"><Bell className="size-6" aria-hidden /></span><p className="text-sm font-medium">{soNovas ? "Tudo em dia" : "Sem novidades por enquanto"}</p><p className="max-w-60 text-xs leading-relaxed text-muted-fg">{soNovas ? "Você já leu todos os seus avisos." : "Seus lembretes e pendências aparecem aqui quando houver algo para acompanhar."}</p></div>}
              {lista.map(a=>(
                <article key={a.id} data-lido={a.lido} data-severidade={a.severidade} className={notificacoes.aviso + " " + "relative mb-2 flex items-start gap-3 overflow-hidden rounded-[14px] py-3 pl-4 pr-3 last:mb-0 " + (a.lido ? "border border-pauta bg-transparent" : "bg-papel-2")}>
                  <span aria-hidden className={"mt-0.5 grid size-9 shrink-0 place-items-center rounded-full " + (a.lido ? "bg-transparent text-[color:var(--texto-3)] ring-1 ring-inset ring-[color:var(--pauta)]" : "bg-papel-solido text-[color:var(--texto-2)]")}>
                    {a.severidade === "CRITICO" ? <AlertTriangle className="size-[17px]" /> : a.severidade === "ATENCAO" ? <Clock className="size-[17px]" /> : <Info className="size-[17px]" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2">
                      <h2 className={"flex min-w-0 flex-1 items-center gap-1.5 text-[calc(15px*var(--escala-letra))] leading-snug " + (a.lido ? "font-normal text-muted-fg" : "font-medium text-foreground")}><span className="min-w-0 flex-1 truncate">{a.titulo}</span></h2>
                      <span className="shrink-0 pt-0.5 text-xs text-muted-fg">{new Date(a.criadoEm ?? Date.now()).toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"})}</span>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-[calc(13px*var(--escala-letra))] leading-snug text-muted-fg">{a.texto}</p>
                    <div className={notificacoes.acoes}>
                      {a.acaoRota && <Link href={a.acaoRota} onClick={()=>setAberto(false)}>Abrir detalhes →</Link>}
                      <button
                        disabled={salvando || a.lido}
                        aria-label={a.lido ? `Lida: ${a.titulo}` : `Marcar como lida: ${a.titulo}`}
                        onClick={()=>void marcar([a.id])}
                        className={notificacoes.ler}
                      ><Check className="size-[15px]" aria-hidden /><span>{a.lido ? "Lida" : "Marcar lida"}</span></button>
                    </div>
                  </div>
                </article>
              ))}
            </>}
          </div>

          {alertas.length > 0 && <footer className="flex items-center justify-between gap-2 border-t border-pauta px-3 py-2">
            <button disabled={salvando || !novas.length} onClick={()=>void marcar()} className="min-h-11 rounded-[10px] px-3 text-xs font-medium text-acao disabled:opacity-40">Marcar todas lidas</button>
            <button disabled={salvando || !alertas.length} onClick={()=>void limparTudo()} className="min-h-11 rounded-[10px] px-3 text-xs font-medium text-muted-fg hover:text-negativo disabled:opacity-40">Limpar tudo</button>
          </footer>}
        </SheetContent>
      </Sheet>}
      {mei && !apenasLoja && <AvisosDaLoja borda={borda} />}
      <DropdownMenu modal={false}><DropdownMenuTrigger asChild><button aria-label="Minha conta" className={"grid size-11 place-items-center rounded-full border sm:size-10 "+borda}><Avatar className="size-8 sm:size-7">{avatarUrl && <AvatarImage src={avatarUrl} alt="" />}<AvatarFallback>{nome.charAt(0).toUpperCase()}</AvatarFallback></Avatar></button></DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={10} className={menuConta.menu + " w-64 max-w-[calc(100vw-24px)] rounded-2xl border border-pauta p-2 shadow-xl"}>
          <div className="flex items-center gap-3 px-3 py-2">
            <Avatar className="size-9 shrink-0 border border-pauta">{avatarUrl && <AvatarImage src={avatarUrl} alt="" />}<AvatarFallback>{nome.charAt(0).toUpperCase()}</AvatarFallback></Avatar>
            <div className="min-w-0"><p className="truncate text-sm font-semibold">{nome}</p><p className="mt-0.5 text-xs text-muted-fg">{apenasLoja || mei ? "Seu negócio" : "Seu espaço pessoal"}</p></div>
          </div>
          <DropdownMenuSeparator className="mx-2" />
          {mei && !apenasLoja && <DropdownMenuItem asChild className="min-h-11 rounded-xl px-3"><Link href="/loja/minha-conta"><span className="grid size-8 place-items-center rounded-lg bg-papel-3"><Settings aria-hidden /></span><span className="flex-1">Minha conta</span><ChevronRight className="text-muted-fg" aria-hidden /></Link></DropdownMenuItem>}
          {!apenasLoja && !mei && <DropdownMenuItem asChild className="min-h-11 rounded-xl px-3"><Link href="/configuracoes"><span className="grid size-8 place-items-center rounded-lg bg-papel-3"><Settings aria-hidden /></span><span className="flex-1">Minha conta</span><ChevronRight className="text-muted-fg" aria-hidden /></Link></DropdownMenuItem>}
          {admin && !apenasLoja && !mei && <DropdownMenuItem asChild className="min-h-11 rounded-xl px-3"><Link href="/admin"><span className="grid size-8 place-items-center rounded-lg bg-papel-3"><ShieldCheck aria-hidden /></span><span className="flex-1">Administração</span><ChevronRight className="text-muted-fg" aria-hidden /></Link></DropdownMenuItem>}
          <div className="space-y-2 px-3 py-2"><p className="text-xs font-medium text-muted-fg">Aparência</p><ThemeToggle variante="menu" /></div>
          <DropdownMenuSeparator className="mx-2" />
          <DropdownMenuItem className="min-h-11 rounded-xl px-3 text-muted-fg" onClick={()=>void sair()}><span className="grid size-8 place-items-center rounded-lg bg-papel-3"><LogOut aria-hidden /></span>Sair da conta</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
  </>
}

export function BarraTopo({nome,admin,avatarUrl,competencia,apenasLoja,mei}:{nome:string;admin?:boolean;avatarUrl?:string|null;competencia?:string;apenasLoja?:boolean;mei?:boolean}) {
  const caminho=usePathname()
  const titulo=tituloDaRota(apenasLoja ? [GRUPO_LOJA_FUNCIONARIO] : todosOsGrupos(Boolean(mei)),caminho) ?? "Tino"
  // No celular o Início traz o sino e a conta dentro do bloco branco do topo
  // (Davi, 23/09); a barra ali repetiria os dois e o título "Início".
  return <header className={caminho==="/painel" ? "app-header app-header-inicio" : "app-header"}>
    <div className="app-header-title"><h1>{caminho==="/painel" ? "Início" : titulo}</h1><p>{apenasLoja || mei ? "Seu negócio, organizado." : competencia}</p></div>
    <div className="app-header-actions">
      {/* Barra, nao icone: o botao redondo so com a lupa nao dizia o que faz nem
          que existe atalho. A forma de barra e a mesma do resto do app e ja
          carrega o rotulo e a pista `Ctrl K`. */}
      {!apenasLoja && <div className="hidden sm:block"><GatilhoBuscaPaginas variant="barra" /></div>}
      {!apenasLoja && !mei && <FabAdicionar ancorado />}
      <AcoesDaConta nome={nome} admin={admin} avatarUrl={avatarUrl} apenasLoja={apenasLoja} mei={mei} />
    </div>
  </header>
}