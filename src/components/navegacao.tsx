"use client"

import { Fragment, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LogOut, Menu, Settings } from "lucide-react"
import { cn } from "@/lib/utils"
import { enviar } from "@/lib/cliente"
import { TinoMarca } from "@/components/tino-mascote"
import { GatilhoBuscaPaginas } from "@/components/buscar-paginas"
import { FabAdicionar } from "@/components/fab-adicionar"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet"
import { estaAtivo, grupoDoCaminho, gruposPara, GRUPO_LOJA_FUNCIONARIO, NUCLEO, todosOsGrupos, type GrupoNav } from "@/lib/navegacao-grupos"

export function SubAbas({ mei, apenasLoja }: { mei?: boolean; apenasLoja?: boolean }) {
  const caminho = usePathname()
  const grupo = grupoDoCaminho(apenasLoja ? [GRUPO_LOJA_FUNCIONARIO] : todosOsGrupos(Boolean(mei)), caminho)
  if (!grupo || grupo.itens.length < 2 || grupo.chave === "movimento" || apenasLoja) return null
  return <nav aria-label={grupo.titulo} className="mb-5 flex gap-1 overflow-x-auto pb-1">
    {grupo.itens.map(({ rota, rotulo }) => <Link key={rota} href={rota} aria-current={estaAtivo(caminho, rota) ? "page" : undefined}
      className={cn("flex min-h-11 shrink-0 items-center rounded-full px-4 text-sm", estaAtivo(caminho, rota) ? "bg-accent text-accent-foreground" : "text-muted-fg hover:bg-papel-2")}>{rotulo}</Link>)}
  </nav>
}

function Mais({ grupos, ativo, desktop = false }: { grupos: GrupoNav[]; ativo: boolean; desktop?: boolean }) {
  const [aberto, setAberto] = useState(false)
  const caminho = usePathname()
  return <Sheet open={aberto} onOpenChange={setAberto}>
    <SheetTrigger asChild><button aria-label="Mais recursos" className={cn(desktop ? "app-nav-item" : "app-bottom-item", ativo && "is-active")}>
      <Menu className="size-5" aria-hidden /><span>Mais</span>
    </button></SheetTrigger>
    <SheetContent className="w-full max-w-md overflow-y-auto overscroll-contain pb-[max(24px,env(safe-area-inset-bottom))]">
      <SheetHeader><SheetTitle>Do seu jeito.</SheetTitle><SheetDescription>O básico está sempre à mão. Explore o resto quando precisar.</SheetDescription></SheetHeader>
      <div className="mb-4"><GatilhoBuscaPaginas variant="barra" /></div>
      <nav aria-label="Todos os recursos" className="space-y-3">
        {grupos.map(grupo => <details key={grupo.chave} className="app-nav-group" open={grupo.chave === "ajustes" || grupo.itens.some(i => estaAtivo(caminho, i.rota))}>
          <summary><span>{grupo.titulo}<small>{grupo.pergunta}</small></span><span aria-hidden>+</span></summary>
          <div className="pb-2">{grupo.itens.map(({rota, rotulo, Icone}) =>
            <Link key={rota} href={rota} onClick={() => setAberto(false)} aria-current={estaAtivo(caminho, rota) ? "page" : undefined}
              className={cn("flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm hover:bg-accent", estaAtivo(caminho, rota) && "bg-accent font-semibold")}>
              <Icone className="size-4" aria-hidden />{rotulo}
            </Link>)}</div>
        </details>)}
      </nav>
    </SheetContent>
  </Sheet>
}

export function Navegacao({ mei, apenasLoja, nome }: { mei?: boolean; apenasLoja?: boolean; nome: string; avatarUrl?: string | null }) {
  const caminho = usePathname()
  const router = useRouter()
  // Entrada por texto, arquivo e banco continua acessivel sem abas permanentes.
  const extras = [NUCLEO[1], ...gruposPara(Boolean(mei))]
  const principais = apenasLoja ? GRUPO_LOJA_FUNCIONARIO.itens.map(item => ({chave:item.rota, titulo:item.rotulo, itens:[item], pergunta:""})) : NUCLEO.slice(0,3)
  const secundario = !principais.some(grupo => grupo.itens.some(item => estaAtivo(caminho,item.rota)))
  async function sair() { await enviar("/api/auth/logout", {}); router.push("/login"); router.refresh() }
  return <>
    <aside className="app-sidebar">
      <Link href={apenasLoja ? "/loja" : "/painel"} className="app-brand" aria-label="Tino — início"><TinoMarca className="size-9" /><span>tino.</span></Link>
      <p className="app-sidebar-caption">{apenasLoja ? "Sua loja" : "Seu dia a dia"}</p>
      <nav aria-label="Navegação principal" className="space-y-1">
        {principais.map(grupo => { const {rota,Icone}=grupo.itens[0]; const ativo=grupo.itens.some(item => estaAtivo(caminho,item.rota)); return <Link key={grupo.chave} href={rota} className={cn("app-nav-item",ativo && "is-active")} aria-current={ativo ? "page" : undefined}><Icone className="size-5" aria-hidden /><span>{grupo.titulo}</span></Link>})}
        {!apenasLoja && <Mais grupos={extras} ativo={secundario} desktop />}
      </nav>
      {!apenasLoja && <div className="mt-6"><FabAdicionar inline /></div>}
      <div className="mt-auto space-y-2 pt-6">
        {!apenasLoja && <GatilhoBuscaPaginas variant="barra" />}
        <div className="border-t border-pauta pt-3"><p className="truncate px-3 text-sm font-medium">{nome}</p>
        {!apenasLoja && <Link href="/configuracoes" className="app-nav-item"><Settings className="size-4" aria-hidden /><span>Minha conta</span></Link>}
        <button onClick={sair} className="app-nav-item"><LogOut className="size-4" aria-hidden /><span>Sair</span></button></div>
      </div>
    </aside>
    <nav aria-label="Navegação principal no celular" className="app-bottom-nav">
      {principais.map((grupo,indice) => {
        const {rota,Icone}=grupo.itens[0]; const ativo=grupo.itens.some(item=>estaAtivo(caminho,item.rota))
        return <Fragment key={grupo.chave}>
          {!apenasLoja && indice===2 && <div className="app-bottom-add"><FabAdicionar ancorado /></div>}
          <Link href={rota} aria-current={ativo ? "page" : undefined} className={cn("app-bottom-item",ativo && "is-active")}><Icone className="size-5" aria-hidden /><span>{grupo.titulo}</span></Link>
        </Fragment>
      })}
      {!apenasLoja && <Mais grupos={extras} ativo={secundario} />}
    </nav>
  </>
}