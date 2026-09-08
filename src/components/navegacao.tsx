"use client"

import { Fragment, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { usePathname } from "next/navigation"
import { LogOut, Menu, PanelLeftOpen, Settings, User, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { enviar } from "@/lib/cliente"
import { TinoMascote } from "@/components/tino-mascote"
import { GatilhoBuscaPaginas } from "@/components/buscar-paginas"
import { FabAdicionar } from "@/components/fab-adicionar"
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
  GRUPO_LOJA_FUNCIONARIO,
  NUCLEO,
  todosOsGrupos,
  type GrupoNav,
  type ItemNav,
} from "@/lib/navegacao-grupos"

/**
 * Navegação do app, reestruturada em 07/09/2026 na direção "Calen" (ver
 * `docs/PROMPT-REDESIGN-CALEN.md`).
 *
 * ANTES desta rodada: um trilho de 4 ícones fixos (Hoje/Buscar/Config/
 * Perfil) + seis abas em pílula, de peso igual, sempre visíveis no topo.
 * Resolvia "dezoito telas soltas", mas ainda pedia decidir entre seis
 * opções olhando pro topo da tela toda vez.
 *
 * AGORA: duas camadas. NÍVEL 1 (`NUCLEO`, sempre visível — Início/
 * Movimento/Cartões/Perfil) cobre "ver que tá tudo bem" sem abrir nada
 * mais. NÍVEL 2 (`GRUPOS_NAV`, atrás do botão "Mais") junta o resto por
 * INTENÇÃO — Planejar/Dívidas/Analisar/Ajustes, e Loja pra quem é MEI.
 * Nenhuma tela foi removida — a lista completa continua em
 * `lib/navegacao-grupos.ts`.
 *
 * `apenasLoja` (papel FUNCIONARIO_LOJA, "fase 7" de `docs/TINO-MEI.md`)
 * entrou no merge com `main` de 08/09/2026: essa linhagem do redesign nunca
 * tinha visto esse papel, que nasceu numa branch separada em paralelo.
 * Quem só opera o balcão troca as DUAS camadas pelas 4 telas de
 * `GRUPO_LOJA_FUNCIONARIO` (já filtradas por `lib/acesso.ts`, a mesma regra
 * que `middleware.ts` usa pra barrar por URL) — sem núcleo pessoal, sem
 * "Mais", sem busca global (que acharia tela que a pessoa não pode abrir) e
 * sem o "+" de lançamento pessoal. Ver `docs/REDESIGN-EM-CURSO.md` pela
 * decisão registrada de deixar assim em vez de reconstruir o alternador
 * Pessoal/Empresa que a implementação antiga de `main` tinha.
 */

function Pilula({ item, ativo }: { item: ItemNav; ativo: boolean }) {
  const { Icone } = item
  return (
    <Link
      href={item.rota}
      aria-current={ativo ? "page" : undefined}
      className={cn(
        "flex min-h-[44px] shrink-0 items-center gap-2 rounded-[var(--raio-pilula)] px-4 text-[14px] font-medium transition-colors",
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
 * Sub-navegação de um grupo com mais de uma tela (ex.: Movimento absorve
 * Transações + Anotar + Importar; Dívidas absorve Dívidas + Plano de
 * pagamento + Empréstimo). Some sozinha em grupo de tela única. Procura em
 * TODOS os grupos (núcleo + nível 2), porque agora um item do núcleo
 * (Movimento) também tem irmãos.
 *
 * `apenasLoja` usa só o grupo do funcionário — os outros nunca existem pra
 * essa sessão.
 */
export function SubAbas({ mei, apenasLoja }: { mei?: boolean; apenasLoja?: boolean }) {
  const caminho = usePathname()
  const grupos = apenasLoja ? [GRUPO_LOJA_FUNCIONARIO] : todosOsGrupos(Boolean(mei))
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

function IconeTrilho({
  href,
  rotulo,
  Icone,
  ativo,
}: {
  href: string
  rotulo: string
  Icone: typeof Menu
  ativo?: boolean
}) {
  return (
    // Ícone COM rótulo de 12px, sempre visível (SPEC-CALEN-PRECISO, PARTE
    // 4.2). Antes era só o ícone, com o nome escondido no `title` — e ícone
    // sozinho não é intuitivo para quem o Davi quer atender: a referência
    // mostra "Início/Calendário/Contas/Perfil" escrito em todo item.
    <Link
      href={href}
      aria-label={rotulo}
      aria-current={ativo ? "page" : undefined}
      className={cn(
        "toque flex w-full flex-col items-center gap-1 rounded-2xl px-1 py-2 transition-colors",
        ativo
          ? "bg-accent text-accent-foreground"
          : "text-[color:var(--texto-2)] hover:bg-foreground/[0.06] hover:text-foreground",
      )}
    >
      <Icone className="size-[18px]" />
      <span className="w-full truncate text-center text-[12px] font-medium leading-none">{rotulo}</span>
    </Link>
  )
}

/**
 * Conteúdo do nível 2 (Planejar/Dívidas/Analisar/Ajustes/Loja) — usado
 * tanto no painel do desktop (`MenuMais`) quanto na gaveta do celular, pra
 * não ter duas listas escritas à mão.
 */
function ListaDeGrupos({
  grupos,
  caminho,
  aoNavegar,
}: {
  grupos: GrupoNav[]
  caminho: string
  aoNavegar: () => void
}) {
  return (
    <>
      {grupos.map((grupo) => (
        <div key={grupo.chave}>
          <p className="px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-fg">
            {grupo.titulo}
          </p>
          <div className="space-y-0.5">
            {grupo.itens.map((item) => {
              const ativo = estaAtivo(caminho, item.rota)
              const { Icone } = item
              return (
                <Link
                  key={item.rota}
                  href={item.rota}
                  onClick={aoNavegar}
                  aria-current={ativo ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2.5 rounded-[16px] px-3 py-2.5 text-[14px] transition-colors",
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
    </>
  )
}

/**
 * "Mais" do desktop: painel ancorado no botão do trilho, mesmo mecanismo
 * de portal que o painel de notificações (`barra-topo.tsx`) — necessário
 * pelo mesmo motivo: `.ios-card` (o trilho) tem `overflow: hidden`, que
 * cortaria qualquer painel `position: absolute` mais alto que o próprio
 * trilho.
 */
function MenuMais({ grupos, caminho }: { grupos: GrupoNav[]; caminho: string }) {
  const [aberto, setAberto] = useState(false)
  const botaoRef = useRef<HTMLButtonElement>(null)
  const [posicao, setPosicao] = useState<{ top: number; left: number } | null>(null)

  useEffect(() => {
    if (!aberto) return
    function atualizar() {
      const rect = botaoRef.current?.getBoundingClientRect()
      if (!rect) return
      // O menu abre ALINHADO ao botão, mas nunca passando do rodapé da
      // janela. O botão "Mais" mora no fim do trilho, então em tela baixa
      // (medido: janela de 611px) o painel abria em `top: 475` com 489px de
      // altura e 353px dele ficavam fora da tela — sem rolagem possível,
      // porque quem rolava era a página, não o painel. O teto de altura é o
      // mesmo do `max-h` da classe, para os dois números não divergirem.
      const alturaMaxima = Math.min(560, innerHeight * 0.8)
      const topo = Math.max(12, Math.min(rect.top, innerHeight - alturaMaxima - 12))
      setPosicao({ top: topo, left: rect.right + 8 })
    }
    atualizar()
    window.addEventListener("resize", atualizar)
    window.addEventListener("scroll", atualizar, true)
    return () => {
      window.removeEventListener("resize", atualizar)
      window.removeEventListener("scroll", atualizar, true)
    }
  }, [aberto])

  return (
    <div className="relative">
      <button
        ref={botaoRef}
        onClick={() => setAberto((atual) => !atual)}
        aria-label="Mais"
        aria-expanded={aberto}
        className={cn(
          "toque flex w-full flex-col items-center gap-1 rounded-2xl px-1 py-2 transition-colors",
          aberto
            ? "bg-accent text-accent-foreground"
            : "text-[color:var(--texto-2)] hover:bg-foreground/[0.06] hover:text-foreground",
        )}
      >
        <Menu className="size-[18px]" />
        <span className="text-[12px] font-medium leading-none">Mais</span>
      </button>

      {aberto &&
        posicao &&
        createPortal(
          <>
            <button
              aria-label="Fechar menu"
              onClick={() => setAberto(false)}
              className="fixed inset-0 z-40 cursor-default"
            />
            <div
              className="vidro-menu fixed z-50 max-h-[min(560px,80vh)] w-64 space-y-4 overflow-y-auto rounded-[var(--raio-cartao)] p-3"
              style={{ top: posicao.top, left: posicao.left }}
            >
              <ListaDeGrupos grupos={grupos} caminho={caminho} aoNavegar={() => setAberto(false)} />
            </div>
          </>,
          document.body,
        )}
    </div>
  )
}

/** Trilho fixo, do tablet pra cima: núcleo (Início/Movimento/Cartões),
    Buscar, Mais (nível 2) e Perfil — nessa ordem, de cima pra baixo.
    `apenasLoja` troca o núcleo pelas telas do balcão e tira busca/Mais. */
function TrilhoLateral({
  nome,
  avatarUrl,
  mei,
  apenasLoja,
}: {
  nome: string
  avatarUrl: string | null
  mei: boolean
  apenasLoja: boolean
}) {
  const caminho = usePathname()
  const router = useRouter()
  const grupos = gruposPara(mei)

  async function sair() {
    await enviar("/api/auth/logout", {})
    router.push("/login")
    router.refresh()
  }

  // Sem `apenasLoja`: os 3 primeiros do núcleo pessoal (o 4º, Perfil, vira o
  // botão dedicado lá embaixo, com avatar). Com `apenasLoja`: TODAS as telas
  // do balcão — não existe "4º item redundante com o Perfil" aqui, e cortar
  // uma delas pra caber em 3 esconderia tela de verdade do dia a dia.
  const itensDoTrilho = apenasLoja ? GRUPO_LOJA_FUNCIONARIO.itens : NUCLEO.slice(0, 3).map((grupo) => grupo.itens[0])

  return (
    // Trilho FLUTUANDO: mesma margem de 12px que a barra do polegar do
    // celular já usa (`inset-x-3 bottom-3`), agora nas quatro bordas do
    // próprio trilho. `.ios-card` já traz o raio, o vidro e a sombra.
    // 96px (era 64px): o rótulo de 12px precisa caber inteiro sem cortar
    // "Movimento", o nome mais longo do núcleo — em 84px ele virava
    // "Movime…", que é o mesmo problema do ícone sem nome.
    <aside className="ios-card fixed inset-y-3 left-3 z-30 hidden w-[96px] flex-col items-center gap-1 px-2 py-4 lg:flex">
      <Link
        href={apenasLoja ? "/loja" : "/painel"}
        title="Tino"
        aria-label="Início"
        className="mb-2 grid size-11 place-items-center"
      >
        <Image src="/tino-mascote.png" alt="" width={30} height={30} className="size-[30px] object-contain" />
      </Link>

      {itensDoTrilho.map((item) => (
        <IconeTrilho
          key={item.rota}
          href={item.rota}
          rotulo={item.rotulo}
          Icone={item.Icone}
          ativo={estaAtivo(caminho, item.rota)}
        />
      ))}

      {/* Busca global soma TODOS os grupos (`todosOsGrupos`), inclusive
          telas pessoais — oferecer isso ao funcionário do balcão contraria
          o próprio princípio de `lib/acesso.ts` ("o menu nunca promete tela
          que a URL recusaria"), então ela nem aparece nesse papel. */}
      {!apenasLoja && <GatilhoBuscaPaginas variant="trilho" />}

      <div className="mt-auto flex w-full flex-col items-center gap-1">
        {/* "Mais" (nível 2) não existe pro funcionário: as 4 telas do balcão
            já são a lista inteira dele, não há um "resto" atrás de um botão. */}
        {!apenasLoja && <MenuMais grupos={grupos} caminho={caminho} />}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              aria-label="Perfil"
              className="toque flex w-full flex-col items-center gap-1 rounded-2xl px-1 py-2 text-[color:var(--texto-2)] transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
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
              <span className="text-[12px] font-medium leading-none">Perfil</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="end" className="w-48">
            <DropdownMenuLabel className="truncate">{nome}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {/* Configurações também é tela pessoal — fora do escopo do
                funcionário, que só tem Sair aqui. */}
            {!apenasLoja && (
              <DropdownMenuItem asChild>
                <Link href="/configuracoes">
                  <Settings className="mr-2 size-4" />
                  Configurações
                </Link>
              </DropdownMenuItem>
            )}
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

/** Gaveta do celular: agora só o NÍVEL 2 (Planejar/Dívidas/Analisar/
    Ajustes/Loja) — o núcleo já está sempre visível na barra do polegar,
    não precisa duplicar aqui. */
function Gaveta({ grupos, caminho, aoFechar }: { grupos: GrupoNav[]; caminho: string; aoFechar: () => void }) {
  return (
    <>
      <button
        aria-label="Fechar menu"
        onClick={aoFechar}
        className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm lg:hidden"
      />
      <aside className="fixed inset-y-0 left-0 z-50 flex w-[280px] max-w-[85vw] flex-col border-r border-pauta bg-papel-3 backdrop-blur-vidro-forte backdrop-saturate-[1.7] lg:hidden">
        <header className="flex h-14 items-center gap-2 border-b border-pauta px-3">
          <TinoMascote estado="tranquilo" animado={false} className="size-7" />
          <span className="font-display text-[15px] font-semibold">Mais</span>
          <button onClick={aoFechar} aria-label="Fechar menu" className="toque ml-auto text-muted-fg">
            <X className="size-4" />
          </button>
        </header>
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          <ListaDeGrupos grupos={grupos} caminho={caminho} aoNavegar={aoFechar} />
        </nav>
      </aside>
    </>
  )
}

export function Navegacao({
  mei,
  apenasLoja,
  nome,
  avatarUrl,
}: {
  mei?: boolean
  /** Papel FUNCIONARIO_LOJA (ver `layout.tsx`/`lib/acesso.ts`) — troca a
      navegação inteira pelas 4 telas do balcão, sem núcleo pessoal. */
  apenasLoja?: boolean
  nome: string
  avatarUrl?: string | null
}) {
  const caminho = usePathname()
  const [gaveta, setGaveta] = useState(false)
  const grupos = gruposPara(Boolean(mei))

  useEffect(() => {
    setGaveta(false)
  }, [caminho])

  // `NUCLEO` guarda um item por grupo (o resto vive em `<SubAbas>`) — mapear
  // direto preserva ordem e rótulo de grupo sem duplicar a lista aqui.
  // `apenasLoja` usa as telas do balcão no mesmo formato.
  const gruposDoPolegar = apenasLoja
    ? GRUPO_LOJA_FUNCIONARIO.itens.map((item) => ({ chave: item.rota, titulo: item.rotulo, item }))
    : NUCLEO.map((grupo) => ({ chave: grupo.chave, titulo: grupo.titulo, item: grupo.itens[0] }))

  return (
    <>
      <TrilhoLateral nome={nome} avatarUrl={avatarUrl ?? null} mei={Boolean(mei)} apenasLoja={Boolean(apenasLoja)} />

      {/* ── Cabeçalho móvel: hambúrguer (abre o nível 2) + busca, só até o
          tablet. Nenhum dos dois existe pro funcionário — mesmo motivo do
          trilho: sem nível 2 e sem busca global nesse papel. */}
      {!apenasLoja && (
        <div className="flex items-center gap-2 pb-2 pt-1 lg:hidden">
          <button
            onClick={() => setGaveta(true)}
            aria-label="Abrir menu"
            className="toque grid place-items-center rounded-2xl text-[color:var(--texto-2)]"
          >
            <PanelLeftOpen className="size-[18px]" />
          </button>
          <GatilhoBuscaPaginas />
        </div>
      )}

      {gaveta && !apenasLoja && <Gaveta grupos={grupos} caminho={caminho} aoFechar={() => setGaveta(false)} />}

      {/* ── Barra do polegar: os itens do NÚCLEO (ou, pro funcionário, as
          telas do balcão) com ícone E rótulo, e o "+" no MEIO — anatomia da
          PARTE 4.2 do spec, copiada da referência. Duas mudanças desta
          rodada: o "+" saiu de botão flutuante no canto (onde tapava
          conteúdo e não lia como navegação) para o centro da barra, e
          "Mais" saiu daqui — o nível 2 continua a um toque pelo hambúrguer
          do cabeçalho móvel logo acima, e cinco alvos numa barra de 44px
          deixavam cada um estreito demais.

          O funcionário não ganha "+": não existe lançamento pessoal rápido
          pra esse papel, e main (de onde `apenasLoja` veio) também nunca
          teve um botão central nesse modo — decisão preservada, não
          inventada aqui.

          Rótulo em 12px (era 10px): é o número do spec, e 10px em barra de
          navegação é o tamanho em que o rótulo existe sem ser lido. */}
      <nav className="ios-card safe-bottom fixed inset-x-3 bottom-3 z-40 lg:hidden">
        <div className="flex items-stretch justify-around">
          {gruposDoPolegar.map((grupo, indice) => {
            const ativo = estaAtivo(caminho, grupo.item.rota)
            const { Icone } = grupo.item
            return (
              <Fragment key={grupo.chave}>
                {!apenasLoja && indice === 2 && (
                  <div className="flex w-16 shrink-0 items-center justify-center">
                    <FabAdicionar ancorado />
                  </div>
                )}
                <Link
                  href={grupo.item.rota}
                  aria-current={ativo ? "page" : undefined}
                  className={cn(
                    "flex min-h-[44px] flex-1 flex-col items-center justify-center gap-1 py-2 text-[12px] font-medium transition-colors",
                    ativo ? "text-acao" : "text-muted-fg",
                  )}
                >
                  <Icone className="size-5" />
                  <span className="w-full truncate px-0.5 text-center leading-none">{grupo.titulo}</span>
                </Link>
              </Fragment>
            )
          })}
        </div>
      </nav>
    </>
  )
}
