"use client"

import { Fragment, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { ChevronRight, LogOut, Menu, Settings } from "lucide-react"
import { cn } from "@/lib/utils"
import { enviar } from "@/lib/cliente"
import { TinoMarca } from "@/components/tino-mascote"
import { GatilhoBuscaPaginas } from "@/components/buscar-paginas"
import { FabAdicionar } from "@/components/fab-adicionar"
import { TinoDock } from "@/components/tino-dock"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerTrigger, DrawerClose } from "@/components/ui/drawer"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { estaAtivo, grupoDoCaminho, gruposPara, GRUPO_LOJA_FUNCIONARIO, NUCLEO, todosOsGrupos, type GrupoNav } from "@/lib/navegacao-grupos"

/**
 * Abas do grupo em que a tela está (Análise, Fluxo, Simulador, Investir).
 *
 * Quatro nomes inteiros, lado a lado, sem caixa em volta — o desenho que o
 * Davi apontou como o que queria. Dividem a largura em partes iguais, então
 * cabem no celular sem rolagem lateral, e só a ativa fica preenchida.
 *
 * A altura ficou em 40px: o suficiente para o toque, sem a faixa de 44px mais
 * margem que antes empurrava o primeiro número da tela para fora da vista.
 */
export function SubAbas({ mei, apenasLoja }: { mei?: boolean; apenasLoja?: boolean }) {
  const caminho = usePathname()
  const grupo = grupoDoCaminho(apenasLoja ? [GRUPO_LOJA_FUNCIONARIO] : todosOsGrupos(Boolean(mei)), caminho)
  if (!grupo || grupo.itens.length < 2 || grupo.chave === "movimento" || apenasLoja) return null
  return (
    <nav aria-label={grupo.titulo} className="app-subabas mb-4">
      {grupo.itens.map(({ rota, rotulo }) => {
        const ativo = estaAtivo(caminho, rota)
        return (
          <Link
            key={rota}
            href={rota}
            aria-current={ativo ? "page" : undefined}
            aria-label={rotulo}
            data-ativo={ativo}
            className="spring-press"
          >
            <span className="truncate">{rotulo}</span>
          </Link>
        )
      })}
    </nav>
  )
}

function Mais({ grupos, ativo, desktop = false }: { grupos: GrupoNav[]; ativo: boolean; desktop?: boolean }) {
  const [aberto, setAberto] = useState(false)
  const caminho = usePathname()
  return <Drawer shouldScaleBackground={false} open={aberto} onOpenChange={setAberto}>
    <DrawerTrigger asChild><button aria-label="Mais recursos" className={cn(desktop ? "app-nav-item" : "app-bottom-item", ativo && "is-active")}>
      <Menu className="size-5" aria-hidden /><span>Mais</span>
    </button></DrawerTrigger>
    <DrawerContent >
      <DrawerHeader><DrawerTitle>Seu Tino</DrawerTitle><DrawerDescription>Escolha o que quer organizar.</DrawerDescription></DrawerHeader>
      <div className="min-h-0 overflow-y-auto overscroll-contain px-5 pb-5">
      <div className="mb-4"><GatilhoBuscaPaginas variant="barra" /></div>
      <nav aria-label="Todos os recursos">
        <Accordion type="single" collapsible defaultValue={grupos.find(g => g.itens.some(i => estaAtivo(caminho, i.rota)))?.chave}>
          {grupos.map(grupo => <AccordionItem key={grupo.chave} value={grupo.chave}>
            <AccordionTrigger><span className="text-left">{grupo.titulo}<small className="mt-1 block font-normal text-muted-fg">{grupo.pergunta}</small></span></AccordionTrigger>
            <AccordionContent><div className="ios-lista">{grupo.itens.map(({rota, rotulo, Icone}) =>
              <Link key={rota} href={rota} onClick={() => setAberto(false)} aria-current={estaAtivo(caminho, rota) ? "page" : undefined} className="ios-lista-linha"><span className="ios-icone"><Icone aria-hidden /></span><span>{rotulo}</span></Link>
            )}</div></AccordionContent>
          </AccordionItem>)}
        </Accordion>
      </nav>
      </div>
      <div className="px-5 pb-5"><DrawerClose asChild><Button variant="secondary" className="w-full">Concluir</Button></DrawerClose></div>
    </DrawerContent>
  </Drawer>
}

export function Navegacao({ mei, apenasLoja, nome }: { mei?: boolean; apenasLoja?: boolean; nome: string; avatarUrl?: string | null }) {
  const caminho = usePathname()
  const router = useRouter()
  // Entrada por texto, arquivo e banco continua acessivel sem abas permanentes.
  const extras = [NUCLEO[1], ...gruposPara(Boolean(mei))]
  const principais = apenasLoja ? GRUPO_LOJA_FUNCIONARIO.itens.map(item => ({chave:item.rota, titulo:item.rotulo, itens:[item], pergunta:""})) : NUCLEO.slice(0,3)
  // A barra lateral mostrava "Extrato" duas vezes: uma no trilho de cima e
  // outra logo abaixo, como grupo recolhido com Anotar, Importar e Entrada
  // automática dentro. O trilho de baixo do celular precisa dos três itens
  // (é ele que sustenta o polegar), então a remoção vale só no desktop, onde
  // o grupo já mostra tudo o que o atalho mostrava.
  const trilhoLateral = principais.filter(grupo => !extras.includes(grupo))
  const secundario = !principais.some(grupo => grupo.itens.some(item => estaAtivo(caminho,item.rota)))
  async function sair() { await enviar("/api/auth/logout", {}); router.push("/login"); router.refresh() }
  return <>
    {!apenasLoja && <div className="fixed bottom-24 right-4 z-40 lg:hidden"><TinoDock /></div>}
    <aside className="app-sidebar">
      <Link href={apenasLoja ? "/loja" : "/painel"} className="app-brand" aria-label="Tino — início"><TinoMarca className="size-9" /><span>tino.</span></Link>
      <p className="app-sidebar-caption">{apenasLoja ? "Sua loja" : "Seu dia a dia"}</p>
      <nav aria-label="Navegação principal" className="space-y-1">
        {trilhoLateral.map(grupo => { const {rota,Icone}=grupo.itens[0]; const ativo=grupo.itens.some(item => estaAtivo(caminho,item.rota)); return <Link key={grupo.chave} href={rota} className={cn("app-nav-item",ativo && "is-active")} aria-current={ativo ? "page" : undefined}><Icone className="size-5" aria-hidden /><span>{grupo.titulo}</span></Link>})}
      </nav>
      {/* Os grupos ficam recolhidos, como eram dentro do "Mais": a barra
          mostra o app inteiro sem virar uma lista de vinte linhas. O grupo da
          tela aberta já vem expandido. */}
      {!apenasLoja && <div className="mt-4 space-y-1">
        {extras.map(grupo => {
          const dentro = grupo.itens.some(item => estaAtivo(caminho, item.rota))
          return <details key={grupo.chave} open={dentro} className="app-nav-grupo">
            <summary className="app-nav-item"><ChevronRight className="size-4 shrink-0" aria-hidden /><span>{grupo.titulo}</span></summary>
            <div className="space-y-1 pl-3">
              {grupo.itens.map(item => {
                const ativo = estaAtivo(caminho, item.rota)
                return <Link key={item.rota} href={item.rota} className={cn("app-nav-item", ativo && "is-active")} aria-current={ativo ? "page" : undefined}>
                  <item.Icone className="size-5" aria-hidden /><span>{item.rotulo}</span>
                </Link>
              })}
            </div>
          </details>
        })}
      </div>}
      {!apenasLoja && <div className="mt-4"><TinoDock comoItem /></div>}
      <div className="mt-auto space-y-2 pt-6">
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