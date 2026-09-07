"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { usePathname } from "next/navigation"
import {
  CreditCard,
  Home,
  LogOut,
  Package,
  PanelLeftOpen,
  PieChart,
  Settings,
  ShoppingBag,
  User,
  X,
  Zap,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { enviar } from "@/lib/cliente"
import { TinoMascote } from "@/components/tino-mascote"
import { BuscarPaginas } from "@/components/buscar-paginas"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  estaAtivo,
  grupoDoCaminho,
  gruposPara,
  type GrupoNav,
  type ItemNav,
} from "@/lib/navegacao-grupos"

/**
 * Navegação do app, redesenhada em 07/09/2026.
 *
 * ANTES: uma coluna com dezoito telas em três grupos. Achar "Dívidas" ou
 * "Plano de pagamento" pedia saber a diferença entre os dois — divisão que
 * fazia sentido pra quem construiu, não pra quem usa.
 *
 * AGORA: um trilho fino com quatro ícones (Hoje, Buscar, Configurações,
 * Perfil — sempre visível, sempre no mesmo lugar) e seis abas em pílula no
 * topo, uma por PERGUNTA que o usuário faz. Nenhuma tela foi removida — a
 * lista completa de rotas mora em `lib/navegacao-grupos.ts`, e o menu do
 * celular (gaveta e barra do polegar) continua alcançando todas elas.
 *
 * A cor de "item ativo" continua o azul de ação de hoje — ver o registro em
 * `docs/REDESIGN-EM-CURSO.md` sobre por que a casca não virou neutra nesta
 * rodada.
 */

const CHAVE_RECOLHIDO = "tino:menu-recolhido"

function Pilula({ item, ativo }: { item: ItemNav; ativo: boolean }) {
  const { Icone } = item
  return (
    <Link
      href={item.rota}
      aria-current={ativo ? "page" : undefined}
      className={cn(
        "flex shrink-0 items-center gap-2 rounded-[var(--raio-pilula)] px-4 py-2 text-[14px] font-medium transition-colors",
        ativo
          ? "bg-accent text-accent-foreground"
          : "text-[color:var(--texto-2)] hover:bg-foreground/[0.05] hover:text-foreground",
      )}
    >
      <Icone className="size-4 shrink-0" />
      {item.rotulo}
    </Link>
  )
}

/**
 * As seis (ou sete, com loja) abas do topo. Cada uma navega para a PRIMEIRA
 * tela do grupo — a sub-navegação entre as telas do mesmo grupo aparece
 * dentro do conteúdo, pela `<SubAbas>`.
 *
 * Do tablet para cima, um grupo com mais de uma tela também abre um painel
 * ao passar o mouse — mapeamento do `dropdown-navigation` do ln-dev7
 * (21st.dev). Antes, ir direto para "Metas" a partir de qualquer outra
 * seção exigia dois cliques: a pílula "Planejar" sempre abre a primeira
 * tela do grupo (Orçamento), e só depois a sub-navegação aparecia para
 * escolher Metas. Não troca o clique (que continua indo para a primeira
 * tela — é o que a pessoa espera de um link) nem some com `<SubAbas>` no
 * celular, onde não existe "passar o mouse".
 */
function AbasPrincipais({ grupos, caminho }: { grupos: GrupoNav[]; caminho: string }) {
  return (
    <nav
      aria-label="Seções do app"
      className="scrollbar-none -mx-4 flex gap-1 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0"
    >
      {grupos.map((grupo) => {
        const ativo = grupo.itens.some((item) => estaAtivo(caminho, item.rota))
        const primeiro = grupo.itens[0]
        const pilula = (
          <Link
            href={primeiro.rota}
            title={grupo.pergunta}
            aria-current={ativo ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-[var(--raio-pilula)] px-4 py-2 text-[14px] font-medium transition-colors",
              ativo
                ? "bg-accent text-accent-foreground"
                : "text-[color:var(--texto-2)] hover:bg-foreground/[0.05] hover:text-foreground",
            )}
          >
            {grupo.titulo}
          </Link>
        )

        if (grupo.itens.length < 2) return <div key={grupo.chave}>{pilula}</div>

        return (
          <div key={grupo.chave} className="group/nav relative shrink-0">
            {pilula}
            {/* O painel some por padrão e só entra em aparelho com mouse de
                verdade — `(hover:hover)` evita a "armadilha do hover" em
                tela touch, onde o primeiro toque só acionaria o :hover em
                vez de seguir o link. Em touch a navegação continua igual a
                antes: clique na pílula + `<SubAbas>` abaixo do conteúdo. */}
            <div
              role="menu"
              aria-label={grupo.titulo}
              className="vidro-menu invisible absolute left-0 top-full z-30 hidden w-56 -translate-y-1 rounded-[var(--raio-cartao)] p-1.5 opacity-0 transition-[opacity,transform] duration-150 [@media(hover:hover)]:block [@media(hover:hover)]:group-hover/nav:visible [@media(hover:hover)]:group-hover/nav:translate-y-1 [@media(hover:hover)]:group-hover/nav:opacity-100"
            >
              <p className="px-2.5 pb-1.5 pt-1 text-[11px] text-muted-fg">{grupo.pergunta}</p>
              {grupo.itens.map((item) => {
                const { Icone } = item
                const itemAtivo = estaAtivo(caminho, item.rota)
                return (
                  <Link
                    key={item.rota}
                    href={item.rota}
                    role="menuitem"
                    aria-current={itemAtivo ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] transition-colors",
                      itemAtivo
                        ? "bg-accent font-medium text-accent-foreground"
                        : "text-foreground hover:bg-foreground/[0.05]",
                    )}
                  >
                    <Icone className="size-4 shrink-0 text-muted-fg" />
                    {item.rotulo}
                  </Link>
                )
              })}
            </div>
          </div>
        )
      })}
    </nav>
  )
}

/**
 * Sub-navegação de um grupo com mais de uma tela (ex.: Dívidas absorve
 * Dívidas + Plano de pagamento + Empréstimo). Some sozinha em grupo de
 * tela única, como Parecer/Hoje quando não há nada a escolher.
 */
export function SubAbas({ mei }: { mei?: boolean }) {
  const caminho = usePathname()
  const grupos = gruposPara(Boolean(mei))
  const grupo = grupoDoCaminho(grupos, caminho)
  if (!grupo || grupo.itens.length < 2) return null

  return (
    <div className="-mt-1 mb-5 flex gap-1.5 overflow-x-auto">
      {grupo.itens.map((item) => (
        <Pilula key={item.rota} item={item} ativo={estaAtivo(caminho, item.rota)} />
      ))}
    </div>
  )
}

/** Ícone-âncora "Hoje": sempre leva pra /painel, de qualquer aba em que a pessoa esteja. */
function IconeTrilho({
  href,
  rotulo,
  Icone,
  ativo,
}: {
  href: string
  rotulo: string
  Icone: typeof Zap
  ativo?: boolean
}) {
  return (
    <Link
      href={href}
      title={rotulo}
      aria-label={rotulo}
      aria-current={ativo ? "page" : undefined}
      className={cn(
        "toque grid place-items-center rounded-2xl transition-colors",
        ativo
          ? "bg-accent text-accent-foreground"
          : "text-[color:var(--texto-2)] hover:bg-foreground/[0.06] hover:text-foreground",
      )}
    >
      <Icone className="size-[18px]" />
    </Link>
  )
}

/** Trilho fixo, do tablet para cima: os quatro ícones que não mudam de tela pra tela. */
function TrilhoLateral({ mei, nome, avatarUrl }: { mei: boolean; nome: string; avatarUrl: string | null }) {
  const caminho = usePathname()
  const router = useRouter()

  async function sair() {
    await enviar("/api/auth/logout", {})
    router.push("/login")
    router.refresh()
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[64px] flex-col items-center gap-2 border-r border-pauta bg-papel-1/80 py-4 backdrop-blur-xl backdrop-saturate-[1.8] md:flex">
      <Link href="/painel" title="Tino" className="mb-2 grid place-items-center">
        <Image src="/tino-mascote.png" alt="" width={30} height={30} className="size-[30px] object-contain" />
      </Link>

      <IconeTrilho href="/painel" rotulo="Hoje" Icone={Home} ativo={estaAtivo(caminho, "/painel")} />
      <BuscarPaginas mei={mei} />

      <div className="mt-auto flex flex-col items-center gap-2">
        <IconeTrilho href="/configuracoes" rotulo="Configurações" Icone={Settings} ativo={estaAtivo(caminho, "/configuracoes")} />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              aria-label="Perfil"
              title="Perfil"
              className="toque grid place-items-center rounded-2xl text-[color:var(--texto-2)] transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
            >
              {avatarUrl ? (
                <Avatar className="size-6">
                  <AvatarImage src={avatarUrl} alt="" />
                  <AvatarFallback className="bg-primary text-[10px] font-semibold text-primary-foreground">
                    {nome.trim().charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <User className="size-[18px]" />
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="end" className="w-48">
            <DropdownMenuLabel className="truncate">{nome}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/configuracoes">
                <Settings className="mr-2 size-4" />
                Configurações
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={sair}>
              <LogOut className="mr-2 size-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  )
}

/** Gaveta do celular: mesma IA de seis grupos, listada inteira porque cabe rolando. */
function Gaveta({ grupos, caminho, aoFechar }: { grupos: GrupoNav[]; caminho: string; aoFechar: () => void }) {
  return (
    <>
      <button
        aria-label="Fechar menu"
        onClick={aoFechar}
        className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm md:hidden"
      />
      <aside className="fixed inset-y-0 left-0 z-50 flex w-[280px] max-w-[85vw] flex-col border-r border-pauta bg-papel-3 backdrop-blur-vidro-forte backdrop-saturate-[1.7] md:hidden">
        <header className="flex h-14 items-center gap-2 border-b border-pauta px-3">
          <TinoMascote estado="tranquilo" animado={false} className="size-7" />
          <span className="font-display text-[15px] font-semibold">Tino</span>
          <button onClick={aoFechar} aria-label="Fechar menu" className="toque ml-auto text-muted-fg">
            <X className="size-4" />
          </button>
        </header>
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {grupos.map((grupo) => (
            <div key={grupo.chave}>
              <p className="px-2.5 pb-1.5 text-[11px] uppercase tracking-[0.12em] text-muted-fg">{grupo.titulo}</p>
              <div className="space-y-0.5">
                {grupo.itens.map((item) => {
                  const ativo = estaAtivo(caminho, item.rota)
                  const { Icone } = item
                  return (
                    <Link
                      key={item.rota}
                      href={item.rota}
                      onClick={aoFechar}
                      aria-current={ativo ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-2.5 rounded-[22px] px-3 py-2.5 text-[14px] transition-colors",
                        ativo
                          ? "bg-accent font-medium text-accent-foreground"
                          : "text-[color:var(--texto-2)] hover:bg-foreground/[0.04] hover:text-foreground",
                      )}
                    >
                      <Icone className="size-4 shrink-0" />
                      <span className="truncate">{item.rotulo}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>
    </>
  )
}

const NO_POLEGAR_BASE: ItemNav[] = [
  { rota: "/painel", rotulo: "Início", Icone: Home },
  { rota: "/capturas", rotulo: "Anotar", Icone: Zap },
  { rota: "/analise", rotulo: "Parecer", Icone: PieChart },
  { rota: "/cartoes", rotulo: "Cartões", Icone: CreditCard },
]

const NO_POLEGAR_LOJA: ItemNav[] = [
  { rota: "/painel", rotulo: "Início", Icone: Home },
  { rota: "/loja", rotulo: "Balcão", Icone: ShoppingBag },
  { rota: "/capturas", rotulo: "Anotar", Icone: Zap },
  { rota: "/loja/estoque", rotulo: "Prateleira", Icone: Package },
]

export function Navegacao({
  mei,
  nome,
  avatarUrl,
}: {
  mei?: boolean
  nome: string
  avatarUrl?: string | null
}) {
  const caminho = usePathname()
  const [gaveta, setGaveta] = useState(false)
  const grupos = gruposPara(Boolean(mei))

  useEffect(() => {
    setGaveta(false)
  }, [caminho])

  return (
    <>
      <TrilhoLateral mei={Boolean(mei)} nome={nome} avatarUrl={avatarUrl ?? null} />

      {/* ── Cabeçalho móvel: hambúrguer + marca, só até o tablet ── */}
      <div className="flex items-center gap-2 pb-2 pt-1 md:hidden">
        <button
          onClick={() => setGaveta(true)}
          aria-label="Abrir menu"
          className="toque grid place-items-center rounded-2xl text-[color:var(--texto-2)]"
        >
          <PanelLeftOpen className="size-[18px]" />
        </button>
        <BuscarPaginas mei={Boolean(mei)} />
      </div>

      {/* As seis abas — em qualquer tamanho de tela. No celular rolam na
          horizontal; é mais rápido que abrir a gaveta pra trocar de seção
          do dia a dia. */}
      <AbasPrincipais grupos={grupos} caminho={caminho} />

      {gaveta && <Gaveta grupos={grupos} caminho={caminho} aoFechar={() => setGaveta(false)} />}

      {/* ── Barra do polegar: intocada nesta rodada, já resolvia bem o celular ── */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-pauta bg-papel-1/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
        <div className="flex items-stretch justify-around">
          {(mei ? NO_POLEGAR_LOJA : NO_POLEGAR_BASE).map((item) => {
            const ativo = estaAtivo(caminho, item.rota)
            const { Icone } = item
            return (
              <Link
                key={item.rota}
                href={item.rota}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] transition-colors",
                  ativo ? "text-acao" : "text-muted-fg",
                )}
              >
                <Icone className="size-5" />
                {item.rotulo}
              </Link>
            )
          })}
          <button
            onClick={() => setGaveta(true)}
            aria-label="Abrir menu"
            className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] text-muted-fg"
          >
            <PanelLeftOpen className="size-5" />
            Tudo
          </button>
        </div>
      </nav>
    </>
  )
}
