"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Send } from "lucide-react"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"

import { cn } from "@/lib/utils"
import { buscar } from "@/lib/cliente"
import { estadoPorAlertas, FRASE, TinoMascote } from "@/components/tino-mascote"
import type { EstadoTino } from "@/components/tino-mascote"

interface Turno {
  papel: "USUARIO" | "ASSISTENTE"
  texto: string
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
export function TinoDock() {
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
  const lerEstado = useCallback(async () => {
    try {
      const alertas = await buscar<{ severidade: string }[]>("/api/tino/alertas")
      setEstado(estadoPorAlertas(alertas))
    } catch {
      /* mantém o estado anterior */
    }
  }, [])

  useEffect(() => {
    lerEstado()
  }, [lerEstado])

  async function perguntar(texto: string) {
    if (!texto.trim() || pensando) return

    setTurnos((atual) => [...atual, { papel: "USUARIO", texto }])
    setPergunta("")
    setPensando(true)

    try {
      const resposta = await fetch("/api/tino/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pergunta: texto, conversaId: conversaId.current }),
      })

      const idDaConversa = resposta.headers.get("X-Conversa-Id")
      if (idDaConversa) conversaId.current = idDaConversa

      if (resposta.headers.get("Content-Type")?.includes("application/json")) {
        const dados = await resposta.json()
        if (dados.conversaId) conversaId.current = dados.conversaId
        setTurnos((atual) => [...atual, { papel: "ASSISTENTE", texto: dados.texto ?? dados.erro }])
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
        <button aria-label="Falar com o Tino" className="grid size-11 place-items-center rounded-full border border-pauta">
          <TinoMascote estado={estado} className="size-8" />
        </button>
      </DialogTrigger>
      <DialogContent className="flex h-[min(640px,85dvh)] flex-col overflow-hidden">
        <DialogHeader><DialogTitle>Tino</DialogTitle><DialogDescription>{FRASE[estado]}</DialogDescription></DialogHeader>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {turnos.length === 0 && (
          <div>
            <p className="text-[13px] text-[color:var(--texto-2)]">
              Trabalho com os seus números. Pergunte à vontade:
            </p>
            {/* Pílulas que quebram linha, não botões de largura cheia
                empilhados. Em bloco, quatro sugestões pareciam um menu de
                quatro opções e escondiam o campo de escrever; em pílula elas
                lêem como exemplo do que dá para perguntar, que é o que são. */}
            <div className="mt-3 flex flex-wrap gap-2">
              {SUGESTOES.map((sugestao) => (
                <button
                  key={sugestao}
                  onClick={() => perguntar(sugestao)}
                  className="ios-tap rounded-[var(--raio-pilula)] bg-foreground/[0.06] px-3.5 py-2 text-left text-[13px] leading-snug transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  {sugestao}
                </button>
              ))}
            </div>
          </div>
        )}

        {turnos.map((turno, indice) => (
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

        {pensando && <p className="text-[12px] text-muted-fg">Tino está calculando…</p>}
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
          placeholder="Pergunte sobre suas finanças…"
          className="min-w-0 w-full rounded-full border border-pauta bg-background px-4 py-2.5 text-sm outline-none focus:border-acao/50"
        />
        <button type="submit" disabled={pensando || !pergunta.trim()} aria-label="Enviar pergunta" className="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"><Send className="size-4" /></button>
      </form>
      </DialogContent>
    </Dialog>
  )
}
