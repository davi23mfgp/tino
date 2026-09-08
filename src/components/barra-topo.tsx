"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  Check,
  Info,
  LogOut,
  Settings,
  ShieldCheck,
} from "lucide-react"

import { buscar, enviar } from "@/lib/cliente"
import { formatarData } from "@/lib/datas"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ThemeToggle } from "@/components/theme-toggle"
import { GatilhoBuscaPaginas } from "@/components/buscar-paginas"

interface Alerta {
  id: string
  titulo: string
  texto: string
  severidade: "INFO" | "ATENCAO" | "CRITICO"
  acaoRota: string | null
  /** Persistido de verdade (`Alerta.lido` no banco, desde a migration
      inicial) — não é estado local. `PATCH /api/tino/alertas` já existia
      sem nenhuma tela chamar. */
  lido: boolean
  criadoEm: string
}

/**
 * Ícone por SEVERIDADE, não por cor — chroma continua zero (decisão
 * registrada em `docs/REDESIGN-EM-CURSO.md`: a referência usa cor para
 * distinguir estado, o Tino usa ícone/peso/tom de cinza).
 */
const ICONE_SEVERIDADE: Record<Alerta["severidade"], typeof AlertTriangle> = {
  CRITICO: AlertTriangle,
  ATENCAO: AlertCircle,
  INFO: Info,
}

/** Chave do "Limpar tudo" local — ver comentário completo perto do uso. */
const CHAVE_DISPENSADOS = "tino:alertas-dispensados"

/**
 * `admin` chega do layout, que já leu o banco. Ele controla só o atalho: a
 * proteção de verdade está na rota, e um atalho escondido nunca foi segurança.
 */
export function BarraTopo({
  nome,
  admin,
  avatarUrl,
  competencia,
}: {
  nome: string
  admin?: boolean
  avatarUrl?: string | null
  /** Vem do servidor para bater com o mês que o painel mostra. Calcular aqui
      usaria o relógio do navegador, e na virada do mês a barra diria um mês e
      o painel outro. */
  competencia?: string
}) {
  const router = useRouter()
  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [carregado, setCarregado] = useState(false)
  const [aberto, setAberto] = useState(false)
  const [aba, setAba] = useState<"todas" | "nao-lidas">("todas")
  // "Limpar tudo" não tem rota de exclusão (e esta rodada não cria uma —
  // fora de escopo pra uma skin). Isto é só "sumir da lista NESTE
  // navegador": guardado em localStorage pra sobreviver a um F5, mas nunca
  // sincroniza entre aparelhos e nunca apaga nada do banco. O real "lido"
  // (abaixo) é persistido de verdade.
  const [dispensados, setDispensados] = useState<Set<string>>(new Set())

  // O painel precisa ir por PORTAL (`createPortal` pro `<body>`), não como
  // filho posicionado dentro do próprio `<header>`. Achado verificando ao
  // vivo no navegador: `.ios-card` (a classe do `<header>`) tem
  // `overflow: hidden` — necessário pra cortar o blur/vidro no raio da
  // borda — e isso CORTA qualquer painel `position: absolute` que
  // ultrapasse a altura do próprio cabeçalho. O dropdown antigo (menor)
  // possivelmente já sofria disso; o painel novo, mais alto (abas + lista +
  // rodapé), ficava com só o título "Notificações" visível e o resto
  // invisível — bug real, não captura de tela pela metade.
  const botaoAlertaRef = useRef<HTMLButtonElement>(null)
  const [posicaoPainel, setPosicaoPainel] = useState<{ top: number; right: number } | null>(null)

  useEffect(() => {
    if (!aberto) return
    function atualizarPosicao() {
      const rect = botaoAlertaRef.current?.getBoundingClientRect()
      if (!rect) return
      setPosicaoPainel({ top: rect.bottom + 8, right: window.innerWidth - rect.right })
    }
    atualizarPosicao()
    window.addEventListener("resize", atualizarPosicao)
    window.addEventListener("scroll", atualizarPosicao, true)
    return () => {
      window.removeEventListener("resize", atualizarPosicao)
      window.removeEventListener("scroll", atualizarPosicao, true)
    }
  }, [aberto])

  useEffect(() => {
    // Falha ao carregar alerta não pode quebrar a barra inteira: o resto da tela
    // continua útil mesmo sem eles.
    buscar<Alerta[]>("/api/tino/alertas")
      .then(setAlertas)
      .catch(() => setAlertas([]))
      .finally(() => setCarregado(true))

    try {
      const salvos = localStorage.getItem(CHAVE_DISPENSADOS)
      if (salvos) setDispensados(new Set(JSON.parse(salvos) as string[]))
    } catch {
      // Privado/bloqueado: segue sem "lembrar" o que foi limpo antes.
    }
  }, [])

  function persistirDispensados(novo: Set<string>) {
    setDispensados(novo)
    try {
      localStorage.setItem(CHAVE_DISPENSADOS, JSON.stringify([...novo]))
    } catch {
      // Mesma tolerância acima — perder a lembrança não pode quebrar a tela.
    }
  }

  async function marcarLido(id: string) {
    setAlertas((atual) => atual.map((a) => (a.id === id ? { ...a, lido: true } : a)))
    try {
      await enviar("/api/tino/alertas", { ids: [id] }, "PATCH")
    } catch {
      setAlertas((atual) => atual.map((a) => (a.id === id ? { ...a, lido: false } : a)))
    }
  }

  async function marcarTodasLidas() {
    const idsAntes = alertas.filter((a) => !a.lido).map((a) => a.id)
    if (idsAntes.length === 0) return
    setAlertas((atual) => atual.map((a) => ({ ...a, lido: true })))
    try {
      // Sem `ids`: a rota marca todo mundo do lar como lido.
      await enviar("/api/tino/alertas", {}, "PATCH")
    } catch {
      setAlertas((atual) => atual.map((a) => (idsAntes.includes(a.id) ? { ...a, lido: false } : a)))
    }
  }

  function limparTudo() {
    // Marca como lido de verdade (persiste) e some da lista neste navegador
    // (local). Se a condição do alerta continuar valendo, ele pode voltar a
    // aparecer na próxima checagem do Tino — isso é correto, não é bug.
    void marcarTodasLidas()
    persistirDispensados(new Set([...dispensados, ...alertas.map((a) => a.id)]))
  }

  const visiveis = alertas.filter((alerta) => !dispensados.has(alerta.id))
  const naoLidos = visiveis.filter((alerta) => !alerta.lido)
  const listaExibida = aba === "nao-lidas" ? naoLidos : visiveis
  const criticos = naoLidos.filter((alerta) => alerta.severidade === "CRITICO").length

  async function sair() {
    await enviar("/api/auth/logout", {})
    router.push("/login")
    router.refresh()
  }

  return (
    // Painel flutuando (`.ios-card`), não mais faixa full-bleed: cantos
    // arredondados nos quatro lados e fundo visível ao redor, como o resto
    // da skin. Continua grudando no topo (`sticky`, com respiro de 12px):
    // numa tela longa como a Visão geral, a saudação e o resumo do mês somem
    // na rolagem, e é justamente onde a pessoa confere em que mês está.
    <header className="ios-card sticky top-3 z-20 mb-4 flex items-start justify-between gap-4 px-4 py-5 sm:px-6">
      <div>
        <p className="text-[11px] uppercase tracking-[0.08em] text-[color:var(--texto-3)]">Tino</p>
        {/* 22px com tracking de -0,025em, medido no protótipo. Estava em 26px
            e crescia para 30px no desktop, o que empurrava a linha de resumo
            para longe do título e quebrava o par. */}
        <h1 className="mt-0.5 text-[22px] font-semibold tracking-[-0.025em]">
          Olá, {nome.split(" ")[0]}
        </h1>
        {/* A linha de resumo só aparece depois que os alertas chegam. Antes
            disso ela diria "contas em ordem" sem ter conferido nada — e
            afirmar que está tudo certo por falta de dado é o defeito que esta
            base mais evita. */}
        {carregado && (
          <p className="mt-1 text-[13px] text-[color:var(--texto-2)]">
            {/* `first-letter` e não `capitalize`: o segundo maiusculiza TODA
                palavra e escrevia "Setembro De 2026". */}
            {competencia && <span className="first-letter:uppercase">{competencia}</span>}
            {competencia && " · "}
            {criticos > 0
              ? criticos === 1
                ? "1 decisão esperando você"
                : `${criticos} decisões esperando você`
              : naoLidos.length > 0
                ? "tem coisa para olhar"
                : "contas em ordem"}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Pista visual de busca — o gatilho compacto (ícone só) já existe
            no trilho lateral e no cabeçalho móvel (`navegacao.tsx`); este é
            o mesmo diálogo/atalho, só com o campo "Buscar..." + "Ctrl K"
            visíveis, como a referência. Escondido abaixo de `lg` pra não
            duplicar o ícone que a barra do celular já mostra ao lado do
            hambúrguer. */}
        <div className="hidden lg:block">
          <GatilhoBuscaPaginas variant="barra" />
        </div>

        <div className="relative">
          <button
            ref={botaoAlertaRef}
            onClick={() => setAberto((atual) => !atual)}
            className="relative grid size-11 place-items-center rounded-full border border-pauta transition hover:border-acao/40"
            aria-label="Alertas"
          >
            <Bell className="h-4 w-4" />
            {/* Ponto, não número, como no protótipo. A quantidade exata de
                avisos não muda o que a pessoa faz — ela abre a lista de
                qualquer jeito. O que o ponto precisa dizer é "tem coisa
                aqui", e a cor dele diz se é urgente. A contagem continua
                anunciada para leitor de tela, onde ela é a única pista. */}
            {naoLidos.length > 0 && (
              <>
                <span
                  aria-hidden
                  className={cn(
                    "absolute right-1.5 top-1.5 size-2 rounded-full ring-2 ring-[var(--papel-1)]",
                    criticos > 0 ? "bg-negativo" : "bg-atencao",
                  )}
                />
                <span className="sr-only">
                  {naoLidos.length} {naoLidos.length === 1 ? "aviso não lido" : "avisos não lidos"}
                </span>
              </>
            )}
          </button>

          {/* Painel de notificações — antes era um dropdown pequeno sem aba,
              sem "lido" e sem "limpar". Redesenhado pra chegar perto da
              referência que Davi mandou (painel maior, abas Todas/Não
              lidas, ícone circular por item, check pra marcar lido, rodapé
              com ações em massa) só que ancorado no sino, sem virar modal
              full-screen — não pedido, e o app não tem esse padrão em
              nenhum outro lugar. */}
          {aberto &&
            posicaoPainel &&
            createPortal(
              <>
                {/* Catch-all invisível pra fechar ao clicar fora — mesmo
                    princípio da `Gaveta` do celular (`navegacao.tsx`), só
                    que sem escurecer a tela (isto é um painel de leitura
                    rápida, não uma gaveta full-screen). */}
                <button
                  aria-label="Fechar notificações"
                  onClick={() => setAberto(false)}
                  className="fixed inset-0 z-40 cursor-default"
                />
                <div
                  className="vidro-menu fixed z-50 flex w-[min(420px,92vw)] flex-col overflow-hidden rounded-[var(--raio-cartao)] p-0"
                  // A altura máxima é o que SOBRA da janela abaixo do sino,
                  // menos 12px de respiro. Sem isso, em janela baixa o painel
                  // desenhava os 360px da lista mais cabeçalho, abas e rodapé
                  // para fora da tela, onde não há como rolar: quem rolaria
                  // seria a página, e página não move painel `fixed`.
                  style={{
                    top: posicaoPainel.top,
                    right: posicaoPainel.right,
                    maxHeight: `calc(100vh - ${posicaoPainel.top + 12}px)`,
                  }}
                >
                  <div className="flex items-center justify-between px-4 pb-1 pt-3.5">
                    <h2 className="text-[15px] font-semibold">Notificações</h2>
                  </div>

                  <Tabs
                    value={aba}
                    onValueChange={(valor) => setAba(valor === "nao-lidas" ? "nao-lidas" : "todas")}
                    className="px-3 pt-2"
                  >
                    <TabsList className="grid w-full grid-cols-2 bg-papel-2">
                      <TabsTrigger value="todas">Todas</TabsTrigger>
                      <TabsTrigger value="nao-lidas">
                        Não lidas{naoLidos.length > 0 && ` · ${naoLidos.length}`}
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>

                  {/* `min-h-0 flex-1` para a lista encolher dentro do teto de
                      altura do painel; `max-h` sozinho ignorava o teto. */}
                  <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 py-2 [max-height:360px]">
                    {listaExibida.length === 0 && (
                      <p className="px-3 py-8 text-center text-sm text-muted-fg">
                        {aba === "nao-lidas" ? "Tudo em dia por aqui." : "Nada por aqui ainda."}
                      </p>
                    )}

                    {listaExibida.map((alerta) => {
                      const Icone = ICONE_SEVERIDADE[alerta.severidade]
                      return (
                        <div
                          key={alerta.id}
                          className="flex items-start gap-3 rounded-xl px-2 py-2.5 transition hover:bg-foreground/[0.04]"
                        >
                          <span
                            aria-hidden
                            className="grid size-8 shrink-0 place-items-center rounded-full border border-pauta bg-papel-2 text-[color:var(--texto-2)]"
                          >
                            <Icone className="size-4" />
                          </span>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p
                                className={cn(
                                  "text-[13px] leading-snug",
                                  alerta.lido
                                    ? "font-medium text-[color:var(--texto-2)]"
                                    : "font-semibold text-foreground",
                                )}
                              >
                                {alerta.titulo}
                              </p>
                              <span className="shrink-0 text-[11px] text-muted-fg">
                                {formatarData(new Date(alerta.criadoEm))}
                              </span>
                            </div>
                            <p className="mt-0.5 text-[12px] leading-relaxed text-[color:var(--texto-2)]">
                              {alerta.texto}
                            </p>
                            {alerta.acaoRota && (
                              <Link
                                href={alerta.acaoRota}
                                onClick={() => setAberto(false)}
                                className="mt-1.5 inline-block text-[12px] underline underline-offset-4"
                              >
                                Ver
                              </Link>
                            )}
                          </div>

                          {!alerta.lido && (
                            <button
                              onClick={() => marcarLido(alerta.id)}
                              aria-label={`Marcar "${alerta.titulo}" como lida`}
                              title="Marcar como lida"
                              className="grid size-6 shrink-0 place-items-center rounded-full border border-pauta text-muted-fg transition hover:border-acao/40 hover:text-foreground"
                            >
                              <Check className="size-3.5" />
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  <footer className="flex items-center justify-between gap-2 border-t border-pauta px-3 py-2.5">
                    <button
                      onClick={() => void marcarTodasLidas()}
                      disabled={naoLidos.length === 0}
                      className="text-[12px] font-medium text-[color:var(--texto-2)] transition hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                    >
                      Marcar todas lidas
                    </button>
                    <button
                      onClick={limparTudo}
                      disabled={visiveis.length === 0}
                      className="text-[12px] font-medium text-[color:var(--texto-2)] transition hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                    >
                      Limpar tudo
                    </button>
                  </footer>
                </div>
              </>,
              document.body,
            )}
        </div>

        {admin && (
          <Link
            href="/admin"
            className="grid size-11 place-items-center rounded-full border border-pauta transition hover:border-acao/40"
            aria-label="Administração"
          >
            <ShieldCheck className="h-4 w-4" />
          </Link>
        )}

        {/* Alternador de tema claro/escuro — único lugar com lógica nova
            desta rodada de skin, pedido explicitamente por Davi ("opção
            white e black" de verdade). `ThemeToggle` já existia sem estar
            montado em nenhuma tela; este é o lugar visível de sempre.
            `useTheme`/`ThemeProvider` viraram implementação própria (ver
            theme-provider.tsx) — o `next-themes` injetava um <script> que
            este Next recusa em dev e derrubava a página. */}
        <ThemeToggle />

        <Link
          href="/configuracoes"
          className="grid size-11 place-items-center rounded-full border border-pauta transition hover:border-acao/40"
          aria-label="Configurações"
        >
          <Settings className="h-4 w-4" />
        </Link>

        <button
          onClick={sair}
          className="grid size-11 place-items-center rounded-full border border-pauta transition hover:border-negativo/40"
          aria-label="Sair"
        >
          <LogOut className="h-4 w-4" />
        </button>

        {/* A pessoa logada, como no protótipo. O nome some no celular, onde a
            largura vale mais que a confirmação de quem está logado — a
            inicial já resolve isso. Foto de perfil (Configurações → Sua
            foto) substitui a inicial quando existe; ver `ui/avatar.tsx`,
            que existia no projeto sem nenhuma tela usar. */}
        <div className="ml-1 flex items-center gap-2 rounded-[var(--raio-pilula)] bg-papel-2 py-1 pl-1 pr-1 sm:pr-3">
          <Avatar className="size-7 shrink-0" aria-hidden>
            {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
            <AvatarFallback className="bg-primary text-[12px] font-semibold text-primary-foreground">
              {nome.trim().charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="hidden text-[13px] font-medium sm:inline">{nome.split(" ")[0]}</span>
        </div>
      </div>
    </header>
  )
}
