"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Bell,
  ChevronRight,
  CreditCard,
  Download,
  EyeOff,
  Home,
  LifeBuoy,
  Moon,
  Palette,
  Pencil,
  Plus,
  Smartphone,
  Sun,
  Tags,
  Wand2,
  Wallet,
  Landmark,
} from "lucide-react"

import { buscar, enviar } from "@/lib/cliente"
import { formatarMoeda } from "@/lib/dinheiro"
import { encontrarBanco } from "@/lib/bancos-perfil"
import { showToast } from "@/components/ui/toast"
import { RelatarProblema } from "@/components/relatar-problema"
import { VigiasConfig } from "@/components/vigias-config"
import { ConfigAtalhoLancar } from "@/components/config-atalho-lancar"
import { MeusDados } from "@/components/meus-dados"
import { FotoDePerfil } from "@/components/foto-de-perfil"
import { CORES_DE_TEMA, useTheme } from "@/components/theme-provider"
import { useValoresOcultos } from "@/components/ocultar-valores"
import { IdentidadeBanco } from "@/components/banco-perfil"
import { CadastroDeConta } from "@/components/cadastro-de-conta"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody } from "@/components/ui/dialog"

import estilos from "./perfil.module.css"

interface Conta {
  id: string
  nome: string
  tipo: string
  instituicao: string | null
  saldoCentavos: number
  limiteCentavos: number | null
  diaVencimento: number | null
}

interface Conexao {
  id: string
  instituicao: string
  status: string
  ultimaSync: string | null
  diasParaExpirar: number | null
}

interface Usuario {
  nome: string
  email: string
  avatarUrl: string | null
  lar: { nome: string; tipo: "SOLO" | "CASAL" | "FAMILIA" } | null
}

const TIPOS_CONTA = [
  { valor: "CORRENTE", rotulo: "Conta corrente" },
  { valor: "POUPANCA", rotulo: "Poupança" },
  { valor: "CARTAO_CREDITO", rotulo: "Cartão de crédito" },
  { valor: "DINHEIRO", rotulo: "Dinheiro" },
  { valor: "INVESTIMENTO", rotulo: "Investimento" },
  { valor: "PJ_MEI", rotulo: "Conta do CNPJ (MEI)" },
]

const TIPO_DO_LAR = { SOLO: "sozinho", CASAL: "casal", FAMILIA: "família" } as const

/// A amostra de cada cor é o tom claro dela (o mesmo de `cores-de-tema.css`).
/// Fica duplicada aqui porque o `data-cor` só pinta a cor ESCOLHIDA: as outras
/// onze bolinhas precisam do próprio tom sem depender do atributo.
const AMOSTRA: Record<string, string> = {
  verde: "0.85 0.24 145",
  menta: "0.86 0.15 170",
  turquesa: "0.84 0.13 200",
  azul: "0.78 0.14 245",
  indigo: "0.74 0.15 280",
  lilas: "0.80 0.13 310",
  rosa: "0.80 0.15 350",
  coral: "0.79 0.15 35",
  vinho: "0.72 0.15 15",
  dourado: "0.86 0.14 85",
  laranja: "0.80 0.16 60",
  grafite: "0.88 0.01 250",
}

/**
 * Fundo do cartão em miniatura. Banco conhecido usa a cor da marca (é por ela
 * que a pessoa reconhece o cartão antes de ler o nome); o resto usa a cor de
 * tema girada um pouco a cada cartão, para dois cartões vizinhos sem banco
 * não saírem idênticos.
 */
function fundoDoCartao(conta: Conta, indice: number) {
  const cor = encontrarBanco(conta.instituicao ?? "")?.cor
  // O escurecimento é o "véu" que o `corDoBanco` promete: sem ele o amarelo
  // do Banco do Brasil deixa o texto branco ilegível.
  if (cor) return `linear-gradient(135deg, color-mix(in oklab, ${cor}, black 22%), color-mix(in oklab, ${cor}, black 62%))`
  const giro = indice * 38
  return `linear-gradient(135deg, oklch(0.55 0.13 calc(var(--matiz) + ${giro})), oklch(0.3 0.08 calc(var(--matiz) + ${giro + 30})))`
}

function Quadro({ cor, children }: { cor: string; children: React.ReactNode }) {
  return (
    <span className={estilos.quadro} style={{ "--q": cor } as React.CSSProperties} aria-hidden>
      {children}
    </span>
  )
}

export default function Configuracoes() {
  const router = useRouter()
  const { theme, setTheme, cor, setCor } = useTheme()
  const [oculto, alternarOculto] = useValoresOcultos()

  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [contas, setContas] = useState<Conta[] | null>(null)
  const [contagens, setContagens] = useState<{ categorias: number; regras: number; avisos: number; totalAvisos: number } | null>(null)
  const [openFinance, setOpenFinance] = useState<{ provedor: string; sandbox: boolean; conexoes: Conexao[] } | null>(null)

  const [dialogo, setDialogo] = useState<null | "perfil" | "contas" | "nova" | "avisos" | "atalho" | "dados" | "suporte" | "banco">(null)
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [salvandoConta, setSalvandoConta] = useState(false)
  const [completando, setCompletando] = useState(false)
  const [saindo, setSaindo] = useState(false)

  async function recarregarContas() {
    const [lista, of] = await Promise.all([
      buscar<Conta[]>("/api/contas"),
      buscar<{ provedor: string; sandbox: boolean; conexoes: Conexao[] }>("/api/open-finance"),
    ])
    setContas(lista)
    setOpenFinance(of)
  }

  async function recarregarContagens() {
    const [categorias, regras, vigias] = await Promise.all([
      buscar<unknown[]>("/api/categorias"),
      buscar<unknown[]>("/api/regras"),
      buscar<{ ativo: boolean }[]>("/api/vigias"),
    ])
    setContagens({
      categorias: categorias.length,
      regras: regras.length,
      avisos: vigias.filter((vigia) => vigia.ativo).length,
      totalAvisos: vigias.length,
    })
  }

  useEffect(() => {
    buscar<Usuario>("/api/usuario").then(setUsuario).catch(() => undefined)
    recarregarContas().catch(() => setMensagem("Não consegui carregar suas contas. Atualize a página."))
    recarregarContagens().catch(() => undefined)
  }, [])

  function fecharDialogo(aberto: boolean) {
    if (aberto || salvandoConta) return
    // Ao fechar, recarrega o que o diálogo pode ter mudado: a foto no
    // perfil, quantos avisos ficaram ligados.
    if (dialogo === "perfil") buscar<Usuario>("/api/usuario").then(setUsuario).catch(() => undefined)
    if (dialogo === "avisos") recarregarContagens().catch(() => undefined)
    setDialogo(null)
  }

  async function sincronizar(conexaoId: string) {
    setMensagem("Sincronizando…")
    try {
      const resultado = await enviar<{ transacoesNovas: number }>("/api/open-finance", { conexaoId }, "PUT")
      setMensagem(`${resultado.transacoesNovas} lançamento(s) novo(s).`)
      await recarregarContas()
    } catch (erro) {
      setMensagem(erro instanceof Error ? erro.message : "Falha na sincronização.")
    }
  }

  /**
   * "Desfazer em vez de confirmar" — mesmo padrão de `/recorrencias`. A
   * conexão some da lista na hora; o DELETE de verdade (que só revoga,
   * sem apagar a conexão) sai depois de 5s sem ninguém desfazer.
   */
  function revogarConexao(conexao: Conexao) {
    setOpenFinance((atual) => (atual ? { ...atual, conexoes: atual.conexoes.filter((c) => c.id !== conexao.id) } : atual))

    let desfeito = false
    showToast(`Conexão com ${conexao.instituicao} revogada`, {
      action: {
        label: "Desfazer",
        onClick: () => {
          desfeito = true
          setOpenFinance((atual) =>
            atual && !atual.conexoes.some((c) => c.id === conexao.id) ? { ...atual, conexoes: [...atual.conexoes, conexao] } : atual,
          )
        },
      },
    })

    setTimeout(async () => {
      if (desfeito) return
      await buscar(`/api/open-finance?conexaoId=${conexao.id}`, { method: "DELETE" })
    }, 5000)
  }

  async function completarPerfil() {
    if (completando) return
    setCompletando(true)
    try {
      await buscar("/api/onboarding", { method: "DELETE" })
      router.push("/bem-vindo")
    } catch (erro) {
      setCompletando(false)
      showToast(erro instanceof Error ? erro.message : "Não consegui abrir seu perfil.", { variant: "error" })
    }
  }

  async function sair() {
    if (saindo) return
    setSaindo(true)
    try {
      await enviar("/api/auth/logout", {})
      router.push("/login")
      router.refresh()
    } catch {
      setSaindo(false)
      showToast("Não consegui sair. Tente de novo.", { variant: "error" })
    }
  }

  const conexoes = openFinance?.conexoes ?? []
  const inicial = usuario?.nome.trim().charAt(0).toUpperCase() ?? ""
  const rotuloTipo = (tipo: string) => TIPOS_CONTA.find((item) => item.valor === tipo)?.rotulo ?? tipo

  return (
    <div className={estilos.pagina}>
      <div className={estilos.coluna}>
        {/* Cartão de identidade. Os números que ficavam debaixo da foto
            (contas, categorias, avisos) saíram a pedido do Davi: repetiam o
            que as linhas ao lado já dizem. */}
        <section className={estilos.identidade} aria-label="Seu perfil">
          <button type="button" className={estilos.editar} onClick={() => setDialogo("perfil")} aria-label="Editar perfil">
            <Pencil aria-hidden />
          </button>
          <span className={estilos.anel}>
            <span className={estilos.foto}>
              {usuario?.avatarUrl ? <img src={usuario.avatarUrl} alt="" /> : inicial}
            </span>
          </span>
          <strong>{usuario?.nome ?? " "}</strong>
          <span>{usuario?.email ?? " "}</span>
          {usuario?.lar && (
            <span className={estilos.pilula}>
              <Home aria-hidden />
              {usuario.lar.nome} · {TIPO_DO_LAR[usuario.lar.tipo]}
            </span>
          )}
        </section>

        <section className={estilos.bloco} aria-labelledby="titulo-contas">
          <div className={estilos.cabecalho}>
            <Quadro cor="oklch(0.62 0.16 250)">
              <Wallet />
            </Quadro>
            <h2 id="titulo-contas">Contas e cartões</h2>
            <button type="button" className={estilos.adicionar} onClick={() => setDialogo("nova")}>
              <Plus aria-hidden />
              Adicionar
            </button>
          </div>

          {contas === null ? (
            <p className={estilos.vazio}>{mensagem ?? "Carregando…"}</p>
          ) : contas.length === 0 ? (
            <p className={estilos.vazio}>Nenhuma conta cadastrada. Cadastre a primeira para o Tino acompanhar saldo e fatura.</p>
          ) : (
            <>
              <div className={estilos.trilho}>
                {contas.map((conta, indice) => (
                  <button
                    key={conta.id}
                    type="button"
                    className={estilos.mini}
                    style={{ "--fundo-cartao": fundoDoCartao(conta, indice) } as React.CSSProperties}
                    onClick={() => setDialogo("contas")}
                  >
                    <span>{conta.nome}</span>
                    <small>{conta.instituicao ?? rotuloTipo(conta.tipo)}</small>
                    <b className="valor-sensivel">{formatarMoeda(conta.saldoCentavos)}</b>
                  </button>
                ))}
              </div>
              <button type="button" className={estilos.verTodas} onClick={() => setDialogo("contas")}>
                Ver todas ({contas.length})
              </button>
            </>
          )}
        </section>
      </div>

      <div className={estilos.coluna}>
        <section className={estilos.bloco} aria-label="Aparência">
          <div className={estilos.linha}>
            <Quadro cor="oklch(0.55 0.16 285)">{theme === "light" ? <Sun /> : <Moon />}</Quadro>
            <span>
              <strong>Tema</strong>
            </span>
            <div className={estilos.segmento} role="group" aria-label="Tema">
              <button type="button" aria-pressed={theme === "light"} onClick={() => setTheme("light")}>
                <Sun aria-hidden />
                Claro
              </button>
              <button type="button" aria-pressed={theme !== "light"} onClick={() => setTheme("dark")}>
                <Moon aria-hidden />
                Escuro
              </button>
            </div>
          </div>

          <div className={estilos.linha}>
            <Quadro cor="oklch(var(--lch-brilho))">
              <Palette />
            </Quadro>
            <span>
              <strong>Cor do tema</strong>
              <small>Entrada continua verde e gasto vermelho em qualquer cor</small>
            </span>
          </div>
          <div className={estilos.cores} role="group" aria-label="Cor do tema">
            {CORES_DE_TEMA.map((opcao) => (
              <button key={opcao.valor} type="button" aria-pressed={cor === opcao.valor} onClick={() => setCor(opcao.valor)}>
                <i style={{ "--bolinha": `oklch(${AMOSTRA[opcao.valor]})` } as React.CSSProperties} />
                {opcao.nome}
              </button>
            ))}
          </div>

          <div className={estilos.linha}>
            <Quadro cor="oklch(0.55 0.02 250)">
              <EyeOff />
            </Quadro>
            <span>
              <strong>Esconder valores</strong>
              <small>Para abrir o app perto de outras pessoas</small>
            </span>
            <button type="button" role="switch" aria-checked={oculto} aria-label="Esconder valores" className={estilos.interruptor} onClick={alternarOculto}>
              <i />
            </button>
          </div>

          <button type="button" className={estilos.linha} onClick={() => setDialogo("avisos")}>
            <Quadro cor="oklch(0.68 0.17 60)">
              <Bell />
            </Quadro>
            <span>
              <strong>Avisos do Tino</strong>
              <small>O que ele observa e avisa sem você pedir</small>
            </span>
            {contagens && (
              <em>
                {contagens.avisos} de {contagens.totalAvisos} ligados
              </em>
            )}
            <ChevronRight aria-hidden />
          </button>
        </section>

        <section className={estilos.bloco} aria-label="Ajustes">
          <Link href="/categorias" className={estilos.linha}>
            <Quadro cor="oklch(0.62 0.17 330)">
              <Tags />
            </Quadro>
            <span>
              <strong>Categorias e logos</strong>
              <small>Nome, ícone e logo das lojas</small>
            </span>
            {contagens && <em>{contagens.categorias}</em>}
            <ChevronRight aria-hidden />
          </Link>
          <Link href="/regras" className={estilos.linha}>
            <Quadro cor="oklch(0.6 0.14 195)">
              <Wand2 />
            </Quadro>
            <span>
              <strong>Regras de categorização</strong>
              <small>Como o Tino decide a categoria sozinho</small>
            </span>
            {contagens && <em>{contagens.regras}</em>}
            <ChevronRight aria-hidden />
          </Link>
          <button type="button" className={estilos.linha} onClick={() => setDialogo("atalho")}>
            <Quadro cor="oklch(0.6 0.15 150)">
              <Smartphone />
            </Quadro>
            <span>
              <strong>Atalho no celular</strong>
              <small>Notificação fixa para anotar ou ditar um gasto</small>
            </span>
            <ChevronRight aria-hidden />
          </button>
          <Link href="/assinatura" className={estilos.linha}>
            <Quadro cor="oklch(0.7 0.14 85)">
              <CreditCard />
            </Quadro>
            <span>
              <strong>Assinatura</strong>
              <small>Plano, cobrança e cancelamento</small>
            </span>
            <ChevronRight aria-hidden />
          </Link>
          {/* O Open Finance saiu do produto em 28/09/2026. Quem ainda tem
              conexão viva continua vendo a dela para revogar — esconder
              conexão ativa seria pior do que mostrar. */}
          {conexoes.length > 0 && (
            <button type="button" className={estilos.linha} onClick={() => setDialogo("banco")}>
              <Quadro cor="oklch(0.5 0.08 250)">
                <Landmark />
              </Quadro>
              <span>
                <strong>Conexão com o banco</strong>
                <small>{conexoes.length} conectada(s)</small>
              </span>
              <ChevronRight aria-hidden />
            </button>
          )}
          <button type="button" className={estilos.linha} onClick={() => setDialogo("dados")}>
            <Quadro cor="oklch(0.55 0.12 260)">
              <Download />
            </Quadro>
            <span>
              <strong>Meus dados</strong>
              <small>Baixar tudo, ou apagar a conta de vez</small>
            </span>
            <ChevronRight aria-hidden />
          </button>
          <button type="button" className={estilos.linha} onClick={() => setDialogo("suporte")}>
            <Quadro cor="oklch(0.6 0.16 25)">
              <LifeBuoy />
            </Quadro>
            <span>
              <strong>Falar com o suporte</strong>
              <small>Relatar um problema ou pedir ajuda</small>
            </span>
            <ChevronRight aria-hidden />
          </button>
        </section>

        <button type="button" className={estilos.sair} onClick={sair} disabled={saindo}>
          {saindo ? "Saindo…" : "Sair da conta"}
        </button>
      </div>

      <Dialog open={dialogo !== null} onOpenChange={fecharDialogo}>
        <DialogContent className={`${estilos.dialogo} ${dialogo === "nova" ? "sm:max-w-[620px]" : "sm:max-w-[520px]"}`}>
          {dialogo === "perfil" && (
            <>
              <DialogHeader>
                <DialogTitle>Seu perfil</DialogTitle>
                <DialogDescription>Foto e nome que aparecem no app.</DialogDescription>
              </DialogHeader>
              <DialogBody>
                <FotoDePerfil />
                <Button variant="ghost" size="sm" className="mt-3" onClick={completarPerfil} disabled={completando}>
                  {completando ? "Abrindo…" : "Completar perfil"}
                </Button>
              </DialogBody>
            </>
          )}

          {dialogo === "contas" && (
            <>
              <DialogHeader>
                <DialogTitle>Contas e cartões</DialogTitle>
                <DialogDescription>
                  {contas?.length ?? 0} {contas?.length === 1 ? "cadastrada" : "cadastradas"}
                </DialogDescription>
              </DialogHeader>
              <DialogBody>
                <div className="divide-y divide-pauta">
                  {contas?.map((conta) => (
                    <div key={conta.id} className="flex items-center gap-3 py-2.5">
                      <IdentidadeBanco instituicao={conta.instituicao} nome={conta.nome} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">{conta.nome}</p>
                        <p className="truncate text-[calc(12px*var(--escala-letra))] text-muted-fg">
                          {rotuloTipo(conta.tipo)}
                          {conta.instituicao && ` · ${conta.instituicao}`}
                          {conta.limiteCentavos ? ` · limite ${formatarMoeda(conta.limiteCentavos)}` : ""}
                        </p>
                      </div>
                      <span
                        className={`valor-sensivel shrink-0 whitespace-nowrap text-sm font-semibold tabular-nums ${conta.saldoCentavos < 0 ? "text-negativo" : ""}`}
                      >
                        {formatarMoeda(conta.saldoCentavos)}
                      </span>
                    </div>
                  ))}
                </div>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => setDialogo("nova")}>
                  Adicionar conta ou cartão
                </Button>
              </DialogBody>
            </>
          )}

          {dialogo === "nova" && (
            <>
              <DialogHeader>
                <DialogTitle>Adicionar conta ou cartão</DialogTitle>
                <DialogDescription>Toque no seu banco.</DialogDescription>
              </DialogHeader>
              <DialogBody>
                <CadastroDeConta
                  nomesExistentes={(contas ?? []).flatMap((conta) => (conta.instituicao ? [conta.instituicao] : []))}
                  aoMudarSalvando={setSalvandoConta}
                  aoCancelar={() => setDialogo(null)}
                  aoCriar={() => {
                    setDialogo(null)
                    recarregarContas().catch(() => setMensagem("Conta salva. Atualize a página para recarregar."))
                  }}
                />
              </DialogBody>
            </>
          )}

          {dialogo === "avisos" && (
            <>
              <DialogHeader>
                <DialogTitle>Avisos do Tino</DialogTitle>
                <DialogDescription>O que ele observa e avisa sem você pedir.</DialogDescription>
              </DialogHeader>
              <DialogBody>
                <VigiasConfig semMoldura />
              </DialogBody>
            </>
          )}

          {dialogo === "atalho" && (
            <>
              <DialogHeader>
                <DialogTitle>Atalho no celular</DialogTitle>
                <DialogDescription>Uma notificação fixa para anotar ou ditar um gasto.</DialogDescription>
              </DialogHeader>
              <DialogBody>
                <ConfigAtalhoLancar />
              </DialogBody>
            </>
          )}

          {dialogo === "dados" && (
            <>
              <DialogHeader>
                <DialogTitle>Meus dados</DialogTitle>
                <DialogDescription>Baixar tudo, ou apagar a conta de vez.</DialogDescription>
              </DialogHeader>
              <DialogBody>
                <MeusDados />
              </DialogBody>
            </>
          )}

          {dialogo === "suporte" && (
            <>
              <DialogHeader>
                <DialogTitle>Falar com o suporte</DialogTitle>
                <DialogDescription>Relatar um problema ou pedir ajuda.</DialogDescription>
              </DialogHeader>
              <DialogBody>
                <RelatarProblema semMoldura />
              </DialogBody>
            </>
          )}

          {dialogo === "banco" && (
            <>
              <DialogHeader>
                <DialogTitle>Conexão com o banco</DialogTitle>
                <DialogDescription>A autenticação acontece no site do banco; o app nunca recebe sua senha.</DialogDescription>
              </DialogHeader>
              <DialogBody>
                {openFinance?.sandbox && (
                  <p className="mb-3 rounded-[12px] border border-atencao/40 bg-atencao/10 p-3 text-xs text-atencao">
                    Modo de demonstração: os dados desta conexão são fictícios.
                  </p>
                )}
                <div className="space-y-2">
                  {conexoes.map((conexao) => (
                    <div key={conexao.id} className="flex items-center justify-between gap-2 rounded-[12px] border border-pauta p-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm">{conexao.instituicao}</p>
                        <p className="truncate text-[calc(12px*var(--escala-letra))] text-muted-fg">
                          {conexao.status.toLowerCase()}
                          {conexao.ultimaSync && ` · sincronizado ${new Date(conexao.ultimaSync).toLocaleDateString("pt-BR")}`}
                          {conexao.diasParaExpirar !== null && ` · expira em ${conexao.diasParaExpirar} dias`}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button size="sm" variant="ghost" onClick={() => sincronizar(conexao.id)}>
                          Sincronizar
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => revogarConexao(conexao)}>
                          Revogar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                {mensagem && <p className="mt-2 text-[calc(13px*var(--escala-letra))] text-muted-fg">{mensagem}</p>}
              </DialogBody>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
