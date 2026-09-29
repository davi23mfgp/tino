"use client"

import { useCallback, useEffect, useState, type CSSProperties } from "react"
import Link from "next/link"
import { Bell, ChevronRight, Mail, Send, Share2, X } from "lucide-react"

import { buscar, enviar } from "@/lib/cliente"
import { formatarMoeda } from "@/lib/dinheiro"
import { cn } from "@/lib/utils"
import { useMarca } from "@/components/identidades-visuais"
import { LigarAvisoDoBanco } from "@/components/ligar-aviso-do-banco"
import { showToast } from "@/components/ui/toast"
import { DitarGasto } from "@/components/ditar-gasto"
import { CanalTelegram } from "@/components/canal-telegram"
import { SeletorCategoria, type CategoriaSelecionavel } from "@/components/seletor-categoria"
import { EsqueletoLinhas } from "@/components/ui/skeleton"
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import estilos from "./capturas.module.css"

/**
 * Anotar (Davi, 28/09: opção B do canvas — uma compra de cada vez).
 *
 * A fila vem como um cartão só, grande: a compra, o valor, a conta, a
 * categoria e as duas decisões. Antes cada compra da fila tinha três linhas de
 * controles e a lista inteira aberta; conferir uma de cada vez é o que a
 * pessoa faz de fato, e a próxima sobe sozinha. Ao lado (ou embaixo, no
 * celular) ficam as que vêm depois, o campo de anotar e os jeitos de ligar o
 * celular — esses, que se configuram uma vez, viram quatro botões que abrem
 * as instruções, em vez de ocupar metade da tela.
 */

interface Captura {
  id: string
  origem: string
  status: string
  textoBruto: string
  valorCentavos: number | null
  estabelecimento: string | null
  data: string | null
  cartaoFinal: string | null
  instituicao: string | null
  contaId: string | null
  categoriaId: string | null
  confianca: number
  criadoEm: string
}

interface Chave {
  id: string
  nome: string
  sufixo: string
  origem: string
  ativa: boolean
  ultimoUso: string | null
  usos: number
  /** Já existe conversa ligada a esta chave. O número em si não vem para cá. */
  conectada: boolean
}

interface Conta {
  id: string
  nome: string
}

type Categoria = CategoriaSelecionavel
type Jeito = "compartilhar" | "aviso" | "telegram"

const ORIGEM: Record<string, string> = {
  NOTIFICACAO: "aviso do banco",
  COMPARTILHAMENTO: "compartilhado do celular",
  WHATSAPP: "WhatsApp",
  TELEGRAM: "Telegram",
  ATALHO: "atalho do celular",
  EMAIL: "e-mail",
  MANUAL: "anotado aqui",
}
/// Cor da inicial quando o estabelecimento não tem logo cadastrado. Vem do
/// nome, para a mesma loja ter sempre a mesma cor.
const CORES = ["oklch(0.62 0.2 25)", "oklch(0.68 0.14 70)", "oklch(0.6 0.16 250)", "oklch(0.62 0.16 300)", "oklch(0.6 0.14 160)", "oklch(0.62 0.12 200)"]
const DICAS = ["Uber 18", "farmácia 38,90", "almoço 45"]

function quando(captura: Captura) {
  const data = new Date(captura.data ?? captura.criadoEm)
  const hoje = new Date()
  const ontem = new Date(Date.now() - 86_400_000)
  const mesmoDia = (a: Date, b: Date) => a.toDateString() === b.toDateString()
  const dia = mesmoDia(data, hoje) ? "hoje" : mesmoDia(data, ontem) ? "ontem" : data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
  // A data da compra quase sempre vem sem hora: só a chegada tem hora certa.
  return captura.data ? dia : `${dia}, ${data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
}

export default function Capturas() {
  const [capturas, setCapturas] = useState<Captura[]>([])
  const [chaves, setChaves] = useState<Chave[]>([])
  const [canais, setCanais] = useState<{ telegram: boolean; telegramUsuario: string | null }>({ telegram: false, telegramUsuario: null })
  const [contas, setContas] = useState<Conta[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [maisUsadas, setMaisUsadas] = useState<string[]>([])
  const [chaveNova, setChaveNova] = useState<string | null>(null)
  const [rapido, setRapido] = useState("")
  const [ocupado, setOcupado] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [emConferencia, setEmConferencia] = useState<string | null>(null)
  const [jeito, setJeito] = useState<Jeito | null>(null)
  // O endereço só existe no navegador. Lê-lo direto no corpo do componente faz
  // o servidor renderizar vazio e o cliente renderizar a URL — o React acusa
  // divergência de hidratação e descarta a árvore inteira.
  const [endereco, setEndereco] = useState("")
  // Como a pessoa chegou aqui: `/compartilhar` redireciona para cá com o
  // resultado da captura na busca. Lido pelo `window` e não pelo
  // `useSearchParams` porque este é o único uso, e o hook obrigaria a página
  // inteira a entrar num limite de Suspense por causa da renderização estática.
  const [compartilhado, setCompartilhado] = useState<string | null>(null)

  useEffect(() => {
    setEndereco(window.location.origin)

    const veio = new URLSearchParams(window.location.search).get("compartilhado")
    if (!veio) return
    setCompartilhado(veio)
    // Tira o parâmetro do endereço: recarregar a página não deve repetir o
    // aviso de uma compra que já foi guardada.
    window.history.replaceState(null, "", window.location.pathname)
  }, [])

  const carregar = useCallback(async () => {
    const [fila, listaContas, listaCategorias] = await Promise.all([
      buscar<{ capturas: Captura[]; chaves: Chave[]; canais: { telegram: boolean; telegramUsuario: string | null }; maisUsadas: string[] }>("/api/capturas"),
      buscar<Conta[]>("/api/contas"),
      buscar<Categoria[]>("/api/categorias"),
    ])
    setCapturas(fila.capturas)
    setChaves(fila.chaves)
    setCanais(fila.canais)
    setMaisUsadas(fila.maisUsadas ?? [])
    setContas(listaContas)
    setCategorias(listaCategorias)
    setCarregando(false)
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  const pendentes = capturas.filter((captura) => captura.status === "PENDENTE")
  const naoEntendidas = capturas.filter((captura) => captura.status === "NAO_ENTENDIDA")
  const totalPendente = pendentes.reduce((soma, captura) => soma + (captura.valorCentavos ?? 0), 0)
  // A escolhida continua na tela até sair da fila; depois, a primeira que sobrou.
  const atual = pendentes.find((captura) => captura.id === emConferencia) ?? pendentes[0]
  const depois = pendentes.filter((captura) => captura !== atual)

  function mudar(id: string, mudanca: Partial<Captura>) {
    setCapturas((lista) => lista.map((linha) => (linha.id === id ? { ...linha, ...mudanca } : linha)))
  }

  async function confirmar(captura: Captura) {
    setOcupado(true)
    try {
      await enviar("/api/capturas", {
        capturaId: captura.id,
        contaId: captura.contaId ?? contas[0]?.id,
        categoriaId: captura.categoriaId,
        valorCentavos: captura.valorCentavos ?? undefined,
        descricao: captura.estabelecimento ?? undefined,
        // A categoria escolhida vira regra: da próxima vez o mesmo
        // estabelecimento chega já classificado.
        criarRegra: Boolean(captura.categoriaId),
      })
      showToast(`${captura.estabelecimento ?? "Compra"} lançada`, { description: formatarMoeda(captura.valorCentavos ?? 0) })
      setEmConferencia(null)
      await carregar()
    } catch (erro) {
      showToast("Não consegui lançar", { description: erro instanceof Error ? erro.message : "Tente de novo.", variant: "error" })
    } finally {
      setOcupado(false)
    }
  }

  async function descartar(id: string) {
    setOcupado(true)
    try {
      await enviar("/api/capturas", { capturaId: id }, "PATCH")
      setEmConferencia(null)
      await carregar()
    } finally {
      setOcupado(false)
    }
  }

  /**
   * Anota um texto solto.
   *
   * O mesmo leitor do celular roda aqui: "mercado 52,30" funciona igual no app,
   * no bot e ditado por voz. Um leitor só significa que melhorar o
   * reconhecimento melhora os três de uma vez.
   */
  async function anotar(texto: string) {
    if (!texto.trim()) return

    setOcupado(true)
    try {
      await enviar("/api/capturas/rapida", { texto })
      setRapido("")
      await carregar()
    } finally {
      setOcupado(false)
    }
  }

  async function anotarRapido(evento: React.FormEvent) {
    evento.preventDefault()
    await anotar(rapido)
  }

  /**
   * "Desfazer em vez de confirmar" — mesmo padrão de `/recorrencias`. A
   * chave vira "revogada" na hora; o DELETE de verdade (que só desativa,
   * não apaga a linha) sai depois de 5s sem ninguém desfazer.
   */
  function revogarChave(chave: Chave) {
    setChaves((atual) => atual.map((c) => (c.id === chave.id ? { ...c, ativa: false } : c)))

    let desfeito = false
    showToast(`Chave "${chave.nome}" revogada`, {
      action: {
        label: "Desfazer",
        onClick: () => {
          desfeito = true
          setChaves((atual) => atual.map((c) => (c.id === chave.id ? { ...c, ativa: true } : c)))
        },
      },
    })

    setTimeout(async () => {
      if (desfeito) return
      await buscar(`/api/capturas?chaveId=${chave.id}`, { method: "DELETE" })
    }, 5000)
  }

  async function criarChave(origem: "NOTIFICACAO" | "TELEGRAM") {
    const nome = origem === "TELEGRAM" ? "Telegram" : "Meu celular"
    const resposta = await enviar<{ chave: string }>("/api/capturas", { nome, origem }, "PUT")
    setChaveNova(resposta.chave)
    carregar()
  }

  const ligado = (origem: string) => chaves.some((chave) => chave.origem === origem && chave.ativa && chave.usos > 0)
  const usadas = maisUsadas.map((id) => categorias.find((categoria) => categoria.id === id)).filter((categoria): categoria is Categoria => Boolean(categoria))

  return (
    <div className={estilos.pagina}>
      {compartilhado && <AvisoCompartilhado resultado={compartilhado} />}

      <div className={estilos.corpo}>
        <div className={estilos.coluna}>
          {carregando ? (
            <section className={estilos.bloco}><EsqueletoLinhas linhas={4} /></section>
          ) : atual ? (
            <section className={cn(estilos.bloco, estilos.cartao)} aria-label="Compra em conferência">
              <div className={estilos.progresso}>
                {/* Pontos até oito; mais que isso vira só o número. */}
                {pendentes.length <= 8 ? <span className={estilos.pontos} aria-hidden>{pendentes.map((captura) => <i key={captura.id} data-atual={captura === atual || undefined} />)}</span> : <span />}
                <span>{pendentes.indexOf(atual) + 1} de {pendentes.length} para conferir · <span className="valor-sensivel">{formatarMoeda(totalPendente)}</span> fora do saldo</span>
              </div>
              <div className={estilos.quem}>
                <Marca nome={atual.estabelecimento ?? "?"} />
                <span style={{ minWidth: 0 }}>
                  <strong>{atual.estabelecimento ?? "Sem descrição"}</strong>
                  <small>{ORIGEM[atual.origem] ?? atual.origem.toLowerCase()} · {quando(atual)}{atual.cartaoFinal ? ` · final ${atual.cartaoFinal}` : ""}</small>
                </span>
              </div>
              <Valor centavos={atual.valorCentavos ?? 0} />
              {/* Leitura com pouca certeza: o valor pode ter vindo errado, e
                  isso é o que a pessoa precisa conferir antes de tudo. */}
              {atual.confianca < 70 && <p className={estilos.confira}>Confira o valor: a leitura do aviso não teve certeza. Texto que chegou: “{atual.textoBruto}”</p>}

              <label className={estilos.campo}>
                <span>Conta</span>
                <select value={atual.contaId ?? contas[0]?.id ?? ""} onChange={(evento) => mudar(atual.id, { contaId: evento.target.value })} disabled={ocupado}>
                  {contas.map((conta) => <option key={conta.id} value={conta.id}>{conta.nome}</option>)}
                </select>
                <ChevronRight aria-hidden />
              </label>
              <div className={estilos.campo} data-vazio={!atual.categoriaId || undefined}>
                <span>Categoria</span>
                <SeletorCategoria desabilitado={ocupado} rotulo="Categoria da compra" vazio="escolher" opcoes={categorias} valor={atual.categoriaId} aoMudar={(id) => mudar(atual.id, { categoriaId: id })} />
                <ChevronRight aria-hidden />
              </div>
              {usadas.length > 0 && (
                <div className={estilos.atalhos}>
                  {usadas.map((categoria) => <button key={categoria.id} type="button" aria-pressed={atual.categoriaId === categoria.id} onClick={() => mudar(atual.id, { categoriaId: atual.categoriaId === categoria.id ? null : categoria.id })}>{categoria.nome}</button>)}
                  <span>suas mais usadas</span>
                </div>
              )}

              <div className={estilos.decisao}>
                {/* "Não foi compra" e não "descartar": o aviso que não vira
                    lançamento é compra negada, estorno ou pré-autorização. */}
                <button type="button" disabled={ocupado} onClick={() => void descartar(atual.id)}>Não foi compra</button>
                <button type="button" disabled={ocupado} onClick={() => void confirmar(atual)}>Confirmar</button>
              </div>
            </section>
          ) : (
            <section className={estilos.bloco}>
              <div className={estilos.vazio}>
                <strong>Nada para conferir</strong>
                <p className={estilos.apoio}>Quando chegar uma compra do celular, ela aparece aqui para você confirmar com um toque. Só entra no saldo depois disso.</p>
              </div>
            </section>
          )}
        </div>

        <div className={estilos.coluna}>
          {depois.length > 0 && (
            <section className={estilos.bloco}>
              {/* Era "Depois" (Davi, 28/09: "seria o quê? não ficou intuitivo").
                  Diz o que é e o que o toque faz. */}
              <header className={estilos.cabecalho}><h2>Mais {depois.length} na fila</h2><small>toque para conferir</small></header>
              <ul className={estilos.fila}>
                {depois.map((captura) => <li key={captura.id}>
                  <button type="button" onClick={() => setEmConferencia(captura.id)}>
                    <Marca nome={captura.estabelecimento ?? "?"} pequena />
                    <span>{captura.estabelecimento ?? "Sem descrição"}</span>
                    <b className="valor-sensivel">{formatarMoeda(captura.valorCentavos ?? 0)}</b>
                  </button>
                </li>)}
              </ul>
            </section>
          )}

          {naoEntendidas.length > 0 && (
            <section className={estilos.bloco}>
              <h2>Não consegui ler</h2>
              <div>
                {naoEntendidas.map((captura) => <div key={captura.id} className={estilos.ilegivel}>
                  <p>{captura.textoBruto}</p>
                  <button type="button" aria-label="Apagar" onClick={() => void descartar(captura.id)}><X className="size-4" /></button>
                </div>)}
              </div>
            </section>
          )}

          <section className={estilos.bloco}>
            <h2>{atual ? "Anotar outro" : "Anotar um gasto"}</h2>
            <form onSubmit={anotarRapido} className={estilos.compositor}>
              <input aria-label="Descreva o gasto ou recebimento" value={rapido} onChange={(evento) => setRapido(evento.target.value)} placeholder="mercado 52,30" />
              {/* Ditar é o caminho para quem está saindo do caixa com a sacola
                  na mão. O texto falado entra no mesmo leitor do escrito. */}
              <DitarGasto compacto className={estilos.ditar} aoTranscrever={(texto) => anotar(texto)} />
              <button type="submit" className={estilos.enviar} disabled={ocupado || !rapido.trim()} aria-label="Anotar"><Send /></button>
            </form>
            <div className={estilos.dicas}>
              {DICAS.map((dica) => <button key={dica} type="button" onClick={() => setRapido(dica)}>{dica}</button>)}
              <span>nome e valor</span>
            </div>
          </section>

          <p className={estilos.rotulo}>Jeitos de anotar sozinho</p>
          <div className={estilos.jeitos}>
            <button type="button" onClick={() => setJeito("compartilhar")}><Share2 aria-hidden />Compartilhar</button>
            <button type="button" onClick={() => setJeito("aviso")}>{ligado("NOTIFICACAO") && <em aria-label="ligado" />}<Bell aria-hidden />Aviso do banco</button>
            <button type="button" onClick={() => setJeito("telegram")} data-fora={!canais.telegram || undefined}>{ligado("TELEGRAM") && <em aria-label="ligado" />}<Send aria-hidden />Telegram</button>
            <Link href="/cartoes"><Mail aria-hidden />E-mail</Link>
          </div>
        </div>
      </div>

      <Dialog open={jeito !== null} onOpenChange={(aberto) => { if (!aberto) setJeito(null) }}>
        <DialogContent className={estilos.dialogo}>
          <DialogHeader>
            <DialogTitle>{jeito === "compartilhar" ? "Compartilhar do celular" : jeito === "aviso" ? "Compras pelo aviso do banco" : "Telegram"}</DialogTitle>
            <DialogDescription>
              {jeito === "compartilhar" ? "Android. Não precisa de chave nem de programa: um toque por compra." : jeito === "aviso" ? "Um aplicativo de automação no celular lê o aviso do banco e repassa para cá. Você escolhe quais apps podem ser lidos e revoga quando quiser." : "Mande a compra numa mensagem para o Tino no Telegram, por escrito, em áudio ou o arquivo da fatura, e ela cai na fila."}
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            {jeito === "compartilhar" && (
              <ol className={estilos.passos}>
                <li>Instale o Tino na tela de início pelo menu do navegador.</li>
                <li>Chegou o aviso de compra? Toque em <b>Compartilhar</b> e escolha o Tino.</li>
                <li>Pronto. A compra cai na fila esperando um toque.</li>
              </ol>
            )}
            {jeito === "aviso" && <LigarAvisoDoBanco semCabecalho endereco={endereco} chaveNova={chaveNova} aoGerar={() => criarChave("NOTIFICACAO")} />}
            {jeito === "telegram" && <CanalTelegram semCabecalho disponivel={canais.telegram} usuarioDoBot={canais.telegramUsuario} chaves={chaves} chaveNova={chaveNova} aoGerar={() => criarChave("TELEGRAM")} />}
            {jeito !== "compartilhar" && jeito && <Chaves chaves={chaves.filter((chave) => chave.origem === (jeito === "aviso" ? "NOTIFICACAO" : "TELEGRAM"))} aoRevogar={revogarChave} />}
          </DialogBody>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/** O valor grande com os centavos pequenos, como na fatura do cartão. */
function Valor({ centavos }: { centavos: number }) {
  const [inteiro, fracao] = formatarMoeda(centavos).split(",")
  return <p className={cn(estilos.valor, "valor-sensivel")}>{inteiro}<small>,{fracao}</small></p>
}

/** Logo da loja (o associado ou o da lista de conhecidas), ou a inicial numa cor que vem do nome. */
function Marca({ nome, pequena = false }: { nome: string; pequena?: boolean }) {
  const marca = useMarca(nome)
  const [falhou, setFalhou] = useState(false)
  const cor = CORES[[...nome].reduce((soma, letra) => soma + letra.charCodeAt(0), 0) % CORES.length]
  const logo = marca?.logoUrl && !falhou ? marca.logoUrl : null
  return <span aria-hidden className={cn(estilos.marca, pequena && estilos.marcaPequena)} style={logo ? undefined : ({ background: cor } as CSSProperties)}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    {logo ? <img src={logo} alt="" onError={() => setFalhou(true)} /> : marca?.emoji ?? nome.trim().charAt(0).toUpperCase()}
  </span>
}

function Chaves({ chaves, aoRevogar }: { chaves: Chave[]; aoRevogar: (chave: Chave) => void }) {
  if (chaves.length === 0) return null
  return <div className={estilos.chaves}>
    {chaves.map((chave) => <div key={chave.id}>
      <p>{chave.nome} <span className="text-muted-fg">···{chave.sufixo}</span>
        <small>{chave.ativa ? "ativa" : "revogada"} · {chave.usos} envio(s){chave.ultimoUso && ` · último em ${new Date(chave.ultimoUso).toLocaleString("pt-BR")}`}</small>
      </p>
      {chave.ativa && <button type="button" onClick={() => aoRevogar(chave)}>revogar</button>}
    </div>)}
  </div>
}

/**
 * O que aconteceu com a compra que a pessoa acabou de compartilhar.
 *
 * Ela vem de fora do app, tocou uma vez e caiu aqui: precisa saber em uma
 * linha se o gasto entrou, e o que fazer se não entrou. Cada caso diz o que
 * houve e qual é o próximo passo — nenhum pede desculpa, e nenhum é vago.
 *
 * Só os dois casos que exigem ação da pessoa levam cor. Captura guardada é o
 * caminho normal e não gasta token de cor: o que ela precisa ver a seguir é a
 * fila, logo abaixo.
 */
function AvisoCompartilhado({ resultado }: { resultado: string }) {
  const avisos: Record<string, { texto: string; atencao: boolean }> = {
    pendente: {
      texto: "Compra guardada. Confira na fila abaixo antes de virar lançamento.",
      atencao: false,
    },
    confirmada: {
      texto: "Compra guardada e já lançada: a leitura veio com confiança alta.",
      atencao: false,
    },
    descartada: {
      texto:
        "Esse aviso não era gasto: compra negada, estorno ou pré-autorização de posto. Não lancei nada.",
      atencao: false,
    },
    nao_entendida: {
      texto: "Não achei um valor nesse texto. Guardei do jeito que chegou, na fila abaixo.",
      atencao: true,
    },
    vazio: {
      texto: "O compartilhamento chegou sem texto. Compartilhe o aviso do banco, não a imagem da tela.",
      atencao: true,
    },
  }

  const aviso = avisos[resultado]
  if (!aviso) return null

  return (
    <div
      role="status"
      className={cn(
        "rounded-2xl border p-3 text-[calc(13px*var(--escala-letra))] leading-relaxed",
        aviso.atencao ? "border-atencao/40 bg-atencao/10 text-atencao" : "border-pauta text-muted-fg",
      )}
    >
      {aviso.texto}
    </div>
  )
}
