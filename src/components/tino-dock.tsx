"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Briefcase, Send } from "lucide-react"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"

import { cn } from "@/lib/utils"
import { buscar } from "@/lib/cliente"
import { FRASE, TinoMarca, estadoPorAlertas } from "@/components/tino-mascote"
import type { EstadoTino } from "@/components/tino-mascote"
import { usarAlertas } from "@/components/alertas-provider"
import { DitarGasto } from "@/components/ditar-gasto"

interface Turno {
  papel: "USUARIO" | "ASSISTENTE"
  texto: string
  /** A dúvida passou do que a regra escrita responde: o Tino diz que é caso de contador. */
  contador?: boolean
}

const SUGESTOES = [
  "Quanto eu tenho hoje?",
  "Onde foi meu dinheiro este mês?",
  "Quando eu saio do vermelho?",
  "Vale a pena pegar 10 mil em 24x a 2,5%?",
]

/**
 * Conversa com o Tino, presente em todas as telas.
 *
 * A resposta chega em streaming quando vem do modelo e de uma vez quando vem do
 * motor de regras. O componente trata os dois casos pelo Content-Type: JSON é
 * resposta pronta, texto puro é fluxo.
 */
/** Dúvidas do MEI (passo 49, opção C): a conversa da conta MEI responde pelo catálogo de regras. */
export const SUGESTOES_MEI = ["Quanto é o meu DAS?", "E se eu passar do limite?", "Preciso emitir nota fiscal?", "Posso contratar alguém?"]

export function TinoDock({
  comoItem = false,
  /** "botao": a pílula "Pergunte ao Tino" dentro de uma tela, como na MEI e DAS.
      "topo": o leão redondo ao lado do sino (passo 53, opção C, 08/10/2026). */
  gatilho,
  /** A conta MEI não tem o panorama pessoal: pergunta em `/api/mei/pergunta`. */
  rota = "/api/tino/chat",
  sugestoes = SUGESTOES,
  descricao,
  classeTopo = "border-pauta",
}: { comoItem?: boolean; gatilho?: "botao" | "topo"; rota?: string; sugestoes?: string[]; descricao?: string; classeTopo?: string } = {}) {
  const [aberto, setAberto] = useState(false)
  const [estado, setEstado] = useState<EstadoTino>("tranquilo")
  const [turnos, setTurnos] = useState<Turno[]>([])
  const [pergunta, setPergunta] = useState("")
  const [pensando, setPensando] = useState(false)
  const conversaId = useRef<string | null>(null)
  const fim = useRef<HTMLDivElement>(null)

  /**
   * A cara do Tino vem dos alertas abertos, não de humor aleatório.
   *
   * Se falhar a busca, ele fica como está em vez de assumir "tranquilo": um
   * mascote sorrindo por falta de dado mentiria sobre a situação, que é o
   * defeito que esta base mais evita.
   */
  // Os alertas vêm do provedor — era a terceira requisição igual na mesma
  // tela. Sem dado nenhum o estado anterior fica de pé, que é a regra deste
  // componente: mascote sorrindo por falta de dado mentiria.
  const { alertas, carregando } = usarAlertas()

  useEffect(() => {
    if (carregando) return
    setEstado(estadoPorAlertas(alertas))
  }, [alertas, carregando])

  async function perguntar(texto: string) {
    if (!texto.trim() || pensando) return

    setTurnos((atual) => [...atual, { papel: "USUARIO", texto }])
    setPergunta("")
    setPensando(true)

    try {
      const resposta = await fetch(rota, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rota === "/api/tino/chat" ? { pergunta: texto, conversaId: conversaId.current } : { pergunta: texto }),
      })

      const idDaConversa = resposta.headers.get("X-Conversa-Id")
      if (idDaConversa) conversaId.current = idDaConversa

      if (resposta.headers.get("Content-Type")?.includes("application/json")) {
        const dados = await resposta.json()
        if (dados.conversaId) conversaId.current = dados.conversaId
        setTurnos((atual) => [...atual, { papel: "ASSISTENTE", texto: dados.texto ?? dados.erro, contador: dados.chave === "contador" }])
      } else if (resposta.body) {
        // O turno do Tino entra vazio e vai crescendo: assim o texto aparece
        // conforme chega, em vez de a tela ficar parada até o fim.
        setTurnos((atual) => [...atual, { papel: "ASSISTENTE", texto: "" }])
        const leitor = resposta.body.getReader()
        const decodificador = new TextDecoder()

        for (;;) {
          const { done, value } = await leitor.read()
          if (done) break
          const pedaco = decodificador.decode(value, { stream: true })
          setTurnos((atual) => {
            const copia = [...atual]
            copia[copia.length - 1] = { papel: "ASSISTENTE", texto: copia[copia.length - 1].texto + pedaco }
            return copia
          })
          fim.current?.scrollIntoView({ behavior: "auto", block: "nearest" })
        }
      }
    } catch {
      setTurnos((atual) => [...atual, { papel: "ASSISTENTE", texto: "Não consegui responder agora. Tente de novo." }])
    } finally {
      setPensando(false)
      fim.current?.scrollIntoView({ behavior: "auto", block: "nearest" })
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        {gatilho === "topo" ? (
          // Antes o leão flutuava sobre o conteúdo e cobria a ponta direita dos
          // valores; no topo ele divide a linha com o sino e a conta, e nada
          // fica por cima do que a pessoa lê. Só no celular: no computador o
          // assistente já é um item da barra lateral.
          <button aria-label="Falar com o Tino" className={`grid size-11 place-items-center rounded-full border lg:hidden ${classeTopo}`}><TinoMarca className="size-5" /></button>
        ) : gatilho === "botao" ? (
          <button className="inline-flex min-h-11 items-center gap-2 rounded-full border border-pauta px-4 text-[calc(13.5px*var(--escala-letra))] font-semibold"><TinoMarca className="size-5" />Pergunte ao Tino</button>
        ) : comoItem ? (
          // Na barra lateral ele é um item de navegação como os outros, e o
          // que aparece ali é o leão da marca — a mesma arte do topo, a traço,
          // que herda a cor de quem a usa. O mascote colorido ao lado de
          // ícones de traço lia como adesivo colado na lista.
          <button className="app-nav-item"><TinoMarca className="size-5 shrink-0" /><span>Seu assistente Tino</span></button>
        ) : (
          // O leão da marca, não o porquinho (Davi, 29/09/2026: "a imagem do
          // porquinho tem que sair e entrar o leão"). O porquinho era o mascote
          // de antes da troca de marca e destoava do topo, que já é o leão.
          <button aria-label="Falar com o Tino" className="superficie-flutuante grid size-12 place-items-center rounded-full border border-pauta text-foreground">
            <TinoMarca className="size-7" />
          </button>
        )}
      </DialogTrigger>
      {/* Cantinho direito no desktop, nao no centro da tela: o assistente
          acompanha a leitura dos numeros, e um modal centralizado tapava
          justamente o que a pessoa quer conferir enquanto pergunta. O
          `ml-auto`/`mt-auto` vence o alinhamento do envolucro do Dialog sem
          reposicionar por `fixed`, que quebraria a area segura do celular.
          No celular continua subindo de baixo, ocupando a largura toda. */}
      <DialogContent className="flex h-[min(640px,85dvh)] flex-col overflow-hidden sm:ml-auto sm:mt-auto sm:max-w-[420px]">
        <DialogHeader><DialogTitle>Tino</DialogTitle><DialogDescription>{descricao ?? FRASE[estado]}</DialogDescription></DialogHeader>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {turnos.length === 0 && (
          <div>
            <p className="text-[calc(13px*var(--escala-letra))] text-[color:var(--texto-2)]">
              {rota === "/api/tino/chat" ? "Trabalho com os seus números. Pergunte à vontade:" : "Respondo com a regra, a fonte e a data, e com os números do seu MEI. O que passar disso é caso de contador."}
            </p>
            {/* Pílulas que quebram linha, não botões de largura cheia
                empilhados. Em bloco, quatro sugestões pareciam um menu de
                quatro opções e escondiam o campo de escrever; em pílula elas
                lêem como exemplo do que dá para perguntar, que é o que são. */}
            <div className="mt-3 flex flex-wrap gap-2">
              {sugestoes.map((sugestao) => (
                <button
                  key={sugestao}
                  onClick={() => perguntar(sugestao)}
                  className="ios-tap rounded-[var(--raio-pilula)] bg-foreground/[0.06] px-3.5 py-2 text-left text-[calc(13px*var(--escala-letra))] leading-snug transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  {sugestao}
                </button>
              ))}
            </div>
          </div>
        )}

        {turnos.map((turno, indice) => turno.contador ? (
          // O "caso de contador" não é uma resposta qualquer: é o Tino dizendo
          // que não chuta. Fica destacado, com o caminho para o resumo do ano.
          <div key={indice} className="max-w-[88%] space-y-2 rounded-2xl border border-[color:color-mix(in_oklab,var(--atencao),transparent_55%)] px-3 py-3 text-sm leading-relaxed">
            <p className="flex items-center gap-2 font-semibold text-[color:var(--atencao)]"><Briefcase className="size-4" aria-hidden />É caso de contador</p>
            <p className="whitespace-pre-wrap">{turno.texto}</p>
            <Link href="/mei" onClick={() => setAberto(false)} className="inline-flex min-h-10 items-center rounded-full border border-pauta px-3 text-[calc(13px*var(--escala-letra))] font-semibold">Ver o resumo do ano</Link>
          </div>
        ) : (
          <div
            key={indice}
            className={cn(
              "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed",
              turno.papel === "USUARIO"
                ? "ml-auto bg-acao/15 text-acao"
                : "bg-papel-2 text-foreground",
            )}
          >
            {turno.texto || "…"}
          </div>
        ))}

        {pensando && <p className="text-[calc(12px*var(--escala-letra))] text-muted-fg">Tino está calculando…</p>}
        <div ref={fim} />
      </div>

      <form
        onSubmit={(evento) => {
          evento.preventDefault()
          perguntar(pergunta)
        }}
        className="flex shrink-0 items-center gap-2 border-t border-pauta p-3"
      >
        <input
          value={pergunta}
          onChange={(evento) => setPergunta(evento.target.value)}
          aria-label="Pergunta para o Tino"
          disabled={pensando}
          placeholder="Pergunte ou fale…"
          className="min-w-0 w-full rounded-full border border-pauta bg-background px-4 py-2.5 text-sm outline-none focus:border-acao/50"
        />

        {/* Perguntar falando. Reaproveita o mesmo `DitarGasto` do lançamento —
            ele já resolve os dois caminhos (reconhecimento do navegador quando
            existe, gravar e transcrever quando não) e já pede a permissão do
            microfone uma vez só. O que chega aqui é texto, e a pessoa confere
            antes de enviar: transcrição erra, e enviar sozinho faria o Tino
            responder uma pergunta que ninguém fez. */}
        <DitarGasto compacto rotulo="a pergunta" aoTranscrever={(falado) => setPergunta((atual) => (atual ? `${atual} ${falado}` : falado))} />
        <button type="submit" disabled={pensando || !pergunta.trim()} aria-label="Enviar pergunta" className="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"><Send className="size-4" /></button>
      </form>
      </DialogContent>
    </Dialog>
  )
}
