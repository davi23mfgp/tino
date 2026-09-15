"use client"
import { MarcaPersonalizada } from "@/components/identidades-visuais"

import { useCallback, useEffect, useState } from "react"
import { Check, Copy, Plus, Receipt, Send, Share2, X } from "lucide-react"

import { buscar, enviar } from "@/lib/cliente"
import { formatarMoeda, paraCentavos } from "@/lib/dinheiro"
import { cn } from "@/lib/utils"
import { Cartao, Metrica, Vazio } from "@/components/ui/painel"
import { Abertura } from "@/components/abertura"
import { LigarAvisoDoBanco } from "@/components/ligar-aviso-do-banco"
import { showToast } from "@/components/ui/toast"
import { DitarGasto } from "@/components/ditar-gasto"
import { CanalWhatsApp } from "@/components/canal-whatsapp"
import { SelectNative } from "@/components/ui/select-native"
import { SeletorCategoria, type CategoriaSelecionavel } from "@/components/seletor-categoria"
import { EsqueletoLinhas } from "@/components/ui/skeleton"

/**
 * Captura rápida.
 *
 * Duas metades: a fila do que chegou do celular esperando um toque, e os canais
 * de entrada. A fila vem primeiro porque é o que o usuário abre todo dia; a
 * configuração é feita uma vez e some da vista.
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

export default function Capturas() {
  const [capturas, setCapturas] = useState<Captura[]>([])
  const [chaves, setChaves] = useState<Chave[]>([])
  const [canais, setCanais] = useState<{ whatsapp: boolean; telegram: boolean }>({ whatsapp: false, telegram: false })
  const [contas, setContas] = useState<Conta[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [chaveNova, setChaveNova] = useState<string | null>(null)
  const [rapido, setRapido] = useState("")
  const [copiado, setCopiado] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [carregando, setCarregando] = useState(true)
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
      buscar<{ capturas: Captura[]; chaves: Chave[]; canais: { whatsapp: boolean; telegram: boolean } }>("/api/capturas"),
      buscar<Conta[]>("/api/contas"),
      buscar<Categoria[]>("/api/categorias"),
    ])
    setCapturas(fila.capturas)
    setChaves(fila.chaves)
  setCanais(fila.canais)
    setContas(listaContas)
    setCategorias(listaCategorias)
    setCarregando(false)
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

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
      await carregar()
    } finally {
      setOcupado(false)
    }
  }

  async function descartar(id: string) {
    await enviar("/api/capturas", { capturaId: id }, "PATCH")
    carregar()
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

  async function criarChave(origem: "NOTIFICACAO" | "TELEGRAM" | "WHATSAPP") {
    const nome = origem === "WHATSAPP" ? "WhatsApp" : origem === "TELEGRAM" ? "Telegram" : "Meu celular"
    const resposta = await enviar<{ chave: string }>("/api/capturas", { nome, origem }, "PUT")
    setChaveNova(resposta.chave)
    setCopiado(false)
    carregar()
  }

  const pendentes = capturas.filter((captura) => captura.status === "PENDENTE")
  const naoEntendidas = capturas.filter((captura) => captura.status === "NAO_ENTENDIDA")
  const totalPendente = pendentes.reduce((soma, captura) => soma + (captura.valorCentavos ?? 0), 0)

  return (
    <div className="space-y-4">
      {compartilhado && <AvisoCompartilhado resultado={compartilhado} />}

      {/* Quantos esperam por você, antes do campo de anotar: a fila é o motivo
          de alguém abrir esta tela. */}
      <Abertura
        rotulo="Conferência"
        titulo={
          pendentes.length > 0 ? (
            <><em>{pendentes.length}</em> {pendentes.length === 1 ? "lançamento espera" : "lançamentos esperam"} sua conferência.</>
          ) : (
            <>Nada esperando conferência.</>
          )
        }
        apoio={pendentes.length > 0 ? <>Somam <b>{formatarMoeda(totalPendente)}</b>, e só entram no saldo depois que você confirmar.</> : undefined}
      />

      <Cartao titulo="Anotar em segundos">
        <form onSubmit={anotarRapido} className="flex gap-2">
          <input
            aria-label="Descreva o gasto ou recebimento"
            value={rapido}
            onChange={(evento) => setRapido(evento.target.value)}
            placeholder="mercado 52,30"
            className="min-w-0 flex-1 rounded-[var(--raio-campo)] border border-pauta bg-background px-4 py-3 text-[calc(14px*var(--escala-letra))] outline-none focus:border-acao/50"
          />
          <button
            type="submit"
            disabled={ocupado || !rapido.trim()}
            className="rounded-[var(--raio-pilula)] bg-primary px-5 text-[calc(13px*var(--escala-letra))] font-medium text-primary-foreground disabled:opacity-40"
          >
            <Send className="size-4" />
          </button>
        </form>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <p className="max-w-md text-[calc(12px*var(--escala-letra))] leading-relaxed text-muted-fg">
            Informe nome e valor: <b>Uber 18</b>, <b>farmácia 38,90</b> ou <b>almoço 45</b>. Confira a categoria sugerida.
          </p>

          {/* Ditar é o caminho para quem está saindo do caixa com a sacola na
              mão. O texto falado entra no mesmo leitor do texto escrito. */}
          <DitarGasto aoTranscrever={(texto) => anotar(texto)} />
        </div>
      </Cartao>

      {carregando && (
        <Cartao titulo="Fila de conferência">
          <EsqueletoLinhas linhas={3} />
        </Cartao>
      )}

      {!carregando && pendentes.length > 0 && (
        <Cartao titulo={`${pendentes.length} esperando você`}>
          <p className="mb-4 flex flex-wrap items-baseline gap-x-2 gap-y-1 border-b border-pauta pb-3 text-[calc(13px*var(--escala-letra))] text-muted-fg">
            <b className="numero valor-sensivel text-[calc(22px*var(--escala-letra))] font-semibold tracking-tight text-foreground">{formatarMoeda(totalPendente)}</b>
            em {pendentes.length} {pendentes.length === 1 ? "compra ainda fora do saldo" : "compras ainda fora do saldo"}
          </p>

          <div className="space-y-2">
            {pendentes.map((captura) => (
              <div
                key={captura.id}
                className={cn(
                  "rounded-2xl p-3 transition-colors",
                  captura.confianca >= 70 ? "border-b border-pauta last:border-b-0 hover:bg-papel-2" : "border border-atencao/40 bg-atencao/5",
                )}
              >
                <div className="flex items-center gap-3">
                  {/* Círculo de ícone, igual às outras listas (PARTE 4.3). A
                      captura ainda não tem categoria — é justamente o que
                      falta confirmar — então o ícone vem do tipo. */}
                  <span
                    aria-hidden
                    className="grid size-10 shrink-0 place-items-center rounded-full bg-foreground/[0.07] text-[color:var(--texto-2)]"
                  >
                    <Receipt className="size-[18px]" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <MarcaPersonalizada nome={captura.estabelecimento??""}/><p className="truncate text-[calc(14px*var(--escala-letra))] font-medium">{captura.estabelecimento ?? "Sem descrição"}</p>
                    <p className="text-[calc(11px*var(--escala-letra))] text-muted-fg">
                      {captura.instituicao ?? captura.origem.toLowerCase()}
                      {captura.cartaoFinal && ` · final ${captura.cartaoFinal}`}
                      {captura.confianca < 70 && " · confira o valor"}
                    </p>
                  </div>
                  <span className="whitespace-nowrap text-[calc(16px*var(--escala-letra))] font-semibold">
                    {formatarMoeda(captura.valorCentavos ?? 0)}
                  </span>
                </div>

                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <SelectNative
                    tamanho="pilula"
                    value={captura.contaId ?? ""}
                    onChange={(evento) =>
                      setCapturas((atual) =>
                        atual.map((linha) =>
                          linha.id === captura.id ? { ...linha, contaId: evento.target.value } : linha,
                        ),
                      )
                    }
                    className="w-auto text-[calc(13px*var(--escala-letra))]"
                  >
                    {contas.map((conta) => (
                      <option key={conta.id} value={conta.id}>
                        {conta.nome}
                      </option>
                    ))}
                  </SelectNative>

                  <div className="ml-auto flex gap-2">
                    <button
                      onClick={() => descartar(captura.id)}
                      className="rounded-full border border-pauta p-2 text-muted-fg transition hover:border-negativo/40 hover:text-negativo"
                      title="descartar"
                    >
                      <X className="size-4" />
                    </button>
                    <button
                      onClick={() => confirmar(captura)}
                      disabled={ocupado}
                      className="rounded-full bg-primary p-2 text-primary-foreground disabled:opacity-40"
                      title="lançar"
                    >
                      <Check className="size-4" />
                    </button>
                  </div>
                </div>

                {/* A busca agrupada mantém a fila compacta mesmo com muitas categorias. */}
                <SeletorCategoria desabilitado={ocupado} rotulo="Categoria da captura"
                  className="mt-2"
                  opcoes={categorias}
                  valor={captura.categoriaId}
                  aoMudar={(id) =>
                    setCapturas((atual) =>
                      atual.map((linha) => (linha.id === captura.id ? { ...linha, categoriaId: id } : linha)),
                    )
                  }
                />
              </div>
            ))}
          </div>
        </Cartao>
      )}

      {!carregando && pendentes.length === 0 && (
        <Cartao titulo="Fila de conferência">
          <Vazio
            titulo="Nada esperando"
            texto="Quando chegar uma compra do celular ou do WhatsApp, ela aparece aqui para você confirmar com um toque."
          />
        </Cartao>
      )}

      {naoEntendidas.length > 0 && (
        <Cartao titulo="Não consegui ler">
          <div className="space-y-2">
            {naoEntendidas.map((captura) => (
              <div key={captura.id} className="flex items-start justify-between gap-3 rounded-[var(--raio-cartao)] border border-pauta p-3">
                <p className="min-w-0 flex-1 text-[calc(12px*var(--escala-letra))] text-muted-fg">{captura.textoBruto}</p>
                <button
                  onClick={() => descartar(captura.id)}
                  className="shrink-0 text-muted-fg transition hover:text-negativo"
                >
                  <X className="size-4" />
                </button>
              </div>
            ))}
          </div>
        </Cartao>
      )}

      <Cartao titulo="Ligar o celular ao Tino">
        <p className="text-[calc(13px*var(--escala-letra))] leading-relaxed text-muted-fg">
          A ideia de o app anotar sozinho as notificações do banco funciona — mas um site não consegue ler notificações
          do celular. Quem lê é um aplicativo de automação no seu aparelho, que repassa o texto para cá. Você escolhe
          quais aplicativos podem ser lidos, e revoga quando quiser.
        </p>

        {chaveNova && (
          <div className="mt-4 rounded-2xl border border-acao/40 bg-acao/10 p-3">
            <p className="text-[calc(12px*var(--escala-letra))] text-acao">
              Esta chave aparece uma única vez. Copie agora — depois só dá para gerar outra.
            </p>
            <div className="mt-2 flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-xl bg-background px-3 py-2 text-[calc(12px*var(--escala-letra))]">{chaveNova}</code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(chaveNova)
                  setCopiado(true)
                }}
                className="rounded-xl border border-pauta p-2 transition hover:border-acao/40"
              >
                {copiado ? <Check className="size-4 text-positivo" /> : <Copy className="size-4" />}
              </button>
            </div>
          </div>
        )}

        <div className="mt-4 grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-2">
          <CanalWhatsApp
            disponivel={canais.whatsapp}
            chaves={chaves}
            chaveNova={chaveNova}
            aoGerar={() => criarChave("WHATSAPP")}
          />

          <div className="rounded-[var(--raio-cartao)] border border-pauta p-4">
            <p className="flex items-center gap-2 text-[calc(14px*var(--escala-letra))] font-medium">
              <Share2 className="size-4" /> Compartilhar do celular (Android)
            </p>
            <ol className="mt-2 space-y-1.5 text-[calc(12px*var(--escala-letra))] leading-relaxed text-muted-fg">
              <li>1. Instale o Tino na tela de início pelo menu do navegador.</li>
              <li>
                2. Chegou o aviso de compra? Toque em <b>Compartilhar</b> e escolha o Tino.
              </li>
              <li>3. Pronto. A compra cai na fila acima esperando um toque.</li>
            </ol>
            <p className="mt-2 text-[calc(12px*var(--escala-letra))] leading-relaxed text-muted-fg">
              Não precisa de chave nem de programa nenhum. Cobra um toque por compra — o jeito abaixo
              captura sozinho, mas só depois de você configurar.
            </p>
          </div>

          <LigarAvisoDoBanco
            endereco={endereco}
            chaveNova={chaveNova}
            aoGerar={() => criarChave("NOTIFICACAO")}
          />

          <div className="rounded-2xl border border-pauta bg-papel-2 p-4"><h3 className="font-semibold">Faturas por e-mail</h3><p className="mt-2 text-sm text-muted-fg">Receba a fatura diretamente no Tino e confira antes de importar.</p><a href="/cartoes" className="mt-3 inline-flex min-h-11 items-center font-medium text-acao">Configurar no cartão</a></div>
        </div>

        {chaves.length > 0 && (
          <div className="mt-4 space-y-2">
            {chaves.map((chave) => (
              <div key={chave.id} className="flex items-center justify-between rounded-[var(--raio-cartao)] border border-pauta p-3">
                <div>
                  <p className="text-[calc(13px*var(--escala-letra))]">
                    {chave.nome} <span className="text-muted-fg">···{chave.sufixo}</span>
                  </p>
                  <p className="text-[calc(11px*var(--escala-letra))] text-muted-fg">
                    {chave.ativa ? "ativa" : "revogada"} · {chave.usos} envio(s)
                    {chave.ultimoUso && ` · último em ${new Date(chave.ultimoUso).toLocaleString("pt-BR")}`}
                  </p>
                </div>
                {chave.ativa && (
                  <button
                    onClick={() => revogarChave(chave)}
                    className="rounded-full border border-pauta px-3 py-1.5 text-[calc(11px*var(--escala-letra))] text-muted-fg transition hover:border-negativo/40 hover:text-negativo"
                  >
                    revogar
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </Cartao>
    </div>
  )
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
      texto: "Compra guardada e já lançada — a leitura veio com confiança alta.",
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
