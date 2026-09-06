"use client"

import { useCallback, useEffect, useState } from "react"
import { Check, Copy, Plus, Send, Share2, Smartphone, X } from "lucide-react"

import { buscar, enviar } from "@/lib/cliente"
import { formatarMoeda, paraCentavos } from "@/lib/dinheiro"
import { cn } from "@/lib/utils"
import { Cartao, Metrica, Vazio } from "@/components/ui/painel"
import { DitarGasto } from "@/components/ditar-gasto"

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
}

interface Conta {
  id: string
  nome: string
}

interface Categoria {
  id: string
  nome: string
}

const campo = "rounded-xl border border-pauta bg-background px-3 py-2 text-[13px] outline-none focus:border-acao/50"

export default function Capturas() {
  const [capturas, setCapturas] = useState<Captura[]>([])
  const [chaves, setChaves] = useState<Chave[]>([])
  const [contas, setContas] = useState<Conta[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [chaveNova, setChaveNova] = useState<string | null>(null)
  const [rapido, setRapido] = useState("")
  const [copiado, setCopiado] = useState(false)
  const [ocupado, setOcupado] = useState(false)
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
      buscar<{ capturas: Captura[]; chaves: Chave[] }>("/api/capturas"),
      buscar<Conta[]>("/api/contas"),
      buscar<Categoria[]>("/api/categorias"),
    ])
    setCapturas(fila.capturas)
    setChaves(fila.chaves)
    setContas(listaContas)
    setCategorias(listaCategorias)
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

  async function criarChave(origem: "NOTIFICACAO" | "TELEGRAM") {
    const nome = origem === "TELEGRAM" ? "Telegram" : "Meu celular"
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

      <Cartao titulo="Anotar em segundos">
        <form onSubmit={anotarRapido} className="flex gap-2">
          <input
            value={rapido}
            onChange={(evento) => setRapido(evento.target.value)}
            placeholder="mercado 52,30"
            className="flex-1 rounded-[var(--raio-campo)] border border-pauta bg-background px-4 py-3 text-[14px] outline-none focus:border-acao/50"
          />
          <button
            type="submit"
            disabled={ocupado || !rapido.trim()}
            className="rounded-[var(--raio-pilula)] bg-primary px-5 text-[13px] font-medium text-primary-foreground disabled:opacity-40"
          >
            <Send className="size-4" />
          </button>
        </form>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <p className="max-w-md text-[12px] leading-relaxed text-muted-fg">
            Escreva como você falaria: <b>uber 18</b>, <b>farmácia 38,90</b>, <b>almoço 45</b>. O Tino adivinha a
            categoria pelo nome.
          </p>

          {/* Ditar é o caminho para quem está saindo do caixa com a sacola na
              mão. O texto falado entra no mesmo leitor do texto escrito. */}
          <DitarGasto aoTranscrever={(texto) => anotar(texto)} />
        </div>
      </Cartao>

      {pendentes.length > 0 && (
        <Cartao titulo={`${pendentes.length} esperando você`}>
          <div className="mb-3 grid gap-3 sm:grid-cols-2">
            <Metrica rotulo="A confirmar" valor={String(pendentes.length)} />
            <Metrica rotulo="Somam" valor={formatarMoeda(totalPendente)} tom="atencao" />
          </div>

          <div className="space-y-2">
            {pendentes.map((captura) => (
              <div
                key={captura.id}
                className={cn(
                  "rounded-2xl border p-3",
                  captura.confianca >= 70 ? "border-pauta" : "border-atencao/40 bg-atencao/5",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-medium">{captura.estabelecimento ?? "Sem descrição"}</p>
                    <p className="text-[11px] text-muted-fg">
                      {captura.instituicao ?? captura.origem.toLowerCase()}
                      {captura.cartaoFinal && ` · final ${captura.cartaoFinal}`}
                      {captura.confianca < 70 && " · confira o valor"}
                    </p>
                  </div>
                  <span className="whitespace-nowrap text-[16px] font-semibold">
                    {formatarMoeda(captura.valorCentavos ?? 0)}
                  </span>
                </div>

                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <select
                    value={captura.contaId ?? ""}
                    onChange={(evento) =>
                      setCapturas((atual) =>
                        atual.map((linha) =>
                          linha.id === captura.id ? { ...linha, contaId: evento.target.value } : linha,
                        ),
                      )
                    }
                    className={campo}
                  >
                    {contas.map((conta) => (
                      <option key={conta.id} value={conta.id}>
                        {conta.nome}
                      </option>
                    ))}
                  </select>

                  <select
                    value={captura.categoriaId ?? ""}
                    onChange={(evento) =>
                      setCapturas((atual) =>
                        atual.map((linha) =>
                          linha.id === captura.id ? { ...linha, categoriaId: evento.target.value || null } : linha,
                        ),
                      )
                    }
                    className={cn(campo, !captura.categoriaId && "border-atencao/50 text-atencao")}
                  >
                    <option value="">sem categoria</option>
                    {categorias.map((categoria) => (
                      <option key={categoria.id} value={categoria.id}>
                        {categoria.nome}
                      </option>
                    ))}
                  </select>

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
              </div>
            ))}
          </div>
        </Cartao>
      )}

      {pendentes.length === 0 && (
        <Cartao titulo="Fila de conferência">
          <Vazio
            titulo="Nada esperando"
            texto="Quando chegar uma compra do celular ou do Telegram, ela aparece aqui para você confirmar com um toque."
          />
        </Cartao>
      )}

      {naoEntendidas.length > 0 && (
        <Cartao titulo="Não consegui ler">
          <div className="space-y-2">
            {naoEntendidas.map((captura) => (
              <div key={captura.id} className="flex items-start justify-between gap-3 rounded-[var(--raio-cartao)] border border-pauta p-3">
                <p className="min-w-0 flex-1 text-[12px] text-muted-fg">{captura.textoBruto}</p>
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
        <p className="text-[13px] leading-relaxed text-muted-fg">
          A ideia de o app anotar sozinho as notificações do banco funciona — mas um site não consegue ler notificações
          do celular. Quem lê é um aplicativo de automação no seu aparelho, que repassa o texto para cá. Você escolhe
          quais aplicativos podem ser lidos, e revoga quando quiser.
        </p>

        {chaveNova && (
          <div className="mt-4 rounded-2xl border border-acao/40 bg-acao/10 p-3">
            <p className="text-[12px] text-acao">
              Esta chave aparece uma única vez. Copie agora — depois só dá para gerar outra.
            </p>
            <div className="mt-2 flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-xl bg-background px-3 py-2 text-[12px]">{chaveNova}</code>
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

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <div className="rounded-[var(--raio-cartao)] border border-pauta p-4">
            <p className="flex items-center gap-2 text-[14px] font-medium">
              <Share2 className="size-4" /> Compartilhar do celular (Android)
            </p>
            <ol className="mt-2 space-y-1.5 text-[12px] leading-relaxed text-muted-fg">
              <li>1. Instale o Tino na tela de início pelo menu do navegador.</li>
              <li>
                2. Chegou o aviso de compra? Toque em <b>Compartilhar</b> e escolha o Tino.
              </li>
              <li>3. Pronto. A compra cai na fila acima esperando um toque.</li>
            </ol>
            <p className="mt-2 text-[12px] leading-relaxed text-muted-fg">
              Não precisa de chave nem de programa nenhum. Cobra um toque por compra — o jeito abaixo
              captura sozinho, mas só depois de você configurar.
            </p>
          </div>

          <div className="rounded-[var(--raio-cartao)] border border-pauta p-4">
            <p className="flex items-center gap-2 text-[14px] font-medium">
              <Smartphone className="size-4" /> Notificações do banco (Android)
            </p>
            <ol className="mt-2 space-y-1.5 text-[12px] leading-relaxed text-muted-fg">
              <li>1. Instale o MacroDroid (gratuito) ou o Tasker.</li>
              <li>2. Gatilho: <b>Notificação recebida</b>, filtrando o app do seu banco.</li>
              <li>
                3. Ação: <b>Requisição HTTP POST</b> para
                <code className="mx-1 rounded bg-papel-2 px-1.5 py-0.5">{endereco}/api/capturar</code>
                com corpo JSON <code className="rounded bg-papel-2 px-1.5 py-0.5">{`{"titulo":"[app]","texto":"[texto]"}`}</code>
              </li>
              <li>
                4. Cabeçalho <code className="rounded bg-papel-2 px-1.5 py-0.5">Authorization: Bearer SUA_CHAVE</code>.
              </li>
            </ol>
            <button
              onClick={() => criarChave("NOTIFICACAO")}
              className="mt-3 flex items-center gap-1.5 rounded-full border border-acao/40 bg-acao/10 px-4 py-2 text-[12px] text-acao"
            >
              <Plus className="size-3.5" /> gerar chave do celular
            </button>
          </div>

          <div className="rounded-[var(--raio-cartao)] border border-pauta p-4">
            <p className="flex items-center gap-2 text-[14px] font-medium">
              <Send className="size-4" /> Telegram (mandar faturas)
            </p>
            <ol className="mt-2 space-y-1.5 text-[12px] leading-relaxed text-muted-fg">
              <li>1. Gere a chave abaixo.</li>
              <li>
                2. No Telegram, abra o bot do Tino e mande
                <code className="mx-1 rounded bg-papel-2 px-1.5 py-0.5">/conectar SUA_CHAVE</code>
              </li>
              <li>3. Pronto: encaminhe o PDF da fatura, ou escreva o gasto direto na conversa.</li>
            </ol>
            <p className="mt-2 text-[11px] text-muted-fg">
              PDF com senha não vai por aqui — mensagem em chat fica guardada no aparelho e no servidor do mensageiro.
              Para esses, use a tela Importar.
            </p>
            <button
              onClick={() => criarChave("TELEGRAM")}
              className="mt-3 flex items-center gap-1.5 rounded-full border border-acao/40 bg-acao/10 px-4 py-2 text-[12px] text-acao"
            >
              <Plus className="size-3.5" /> gerar chave do Telegram
            </button>
          </div>
        </div>

        {chaves.length > 0 && (
          <div className="mt-4 space-y-2">
            {chaves.map((chave) => (
              <div key={chave.id} className="flex items-center justify-between rounded-[var(--raio-cartao)] border border-pauta p-3">
                <div>
                  <p className="text-[13px]">
                    {chave.nome} <span className="text-muted-fg">···{chave.sufixo}</span>
                  </p>
                  <p className="text-[11px] text-muted-fg">
                    {chave.ativa ? "ativa" : "revogada"} · {chave.usos} envio(s)
                    {chave.ultimoUso && ` · último em ${new Date(chave.ultimoUso).toLocaleString("pt-BR")}`}
                  </p>
                </div>
                {chave.ativa && (
                  <button
                    onClick={async () => {
                      await buscar(`/api/capturas?chaveId=${chave.id}`, { method: "DELETE" })
                      carregar()
                    }}
                    className="rounded-full border border-pauta px-3 py-1.5 text-[11px] text-muted-fg transition hover:border-negativo/40 hover:text-negativo"
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
        "rounded-2xl border p-3 text-[13px] leading-relaxed",
        aviso.atencao ? "border-atencao/40 bg-atencao/10 text-atencao" : "border-pauta text-muted-fg",
      )}
    >
      {aviso.texto}
    </div>
  )
}
