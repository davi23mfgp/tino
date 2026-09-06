"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { X } from "lucide-react"

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
          fim.current?.scrollIntoView({ behavior: "smooth" })
        }
      }
    } catch {
      setTurnos((atual) => [...atual, { papel: "ASSISTENTE", texto: "Não consegui responder agora. Tente de novo." }])
    } finally {
      setPensando(false)
      fim.current?.scrollIntoView({ behavior: "smooth" })
    }
  }

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        className="fixed bottom-[76px] right-4 z-40 flex items-center gap-2 rounded-full border border-pauta bg-papel-1 py-2 pl-2 pr-4 text-[13px] font-medium shadow-alta transition hover:border-positivo/40 sm:bottom-5 sm:right-5"
      >
        <TinoMascote estado={estado} className="h-9 w-9" />
        Falar com o Tino
      </button>
    )
  }

  return (
    <div className="fixed bottom-0 right-0 z-40 flex h-[min(560px,80vh)] w-full flex-col border-l border-t border-pauta bg-papel-1 backdrop-blur-xl sm:bottom-6 sm:right-6 sm:h-[560px] sm:w-[420px] sm:rounded-3xl sm:border">
      <header className="flex items-center justify-between border-b border-pauta px-4 py-3">
        <div className="flex items-center gap-2.5">
          <TinoMascote estado={estado} animado={false} className="h-8 w-8" />
          <div className="leading-tight">
            <p className="text-sm font-medium">Tino</p>
            <p className="text-[11px] text-muted-fg">{FRASE[estado]}</p>
          </div>
        </div>
        <button onClick={() => setAberto(false)} className="text-muted-fg hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {turnos.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-fg">
              Trabalho com os seus números. Pergunte à vontade:
            </p>
            {SUGESTOES.map((sugestao) => (
              <button
                key={sugestao}
                onClick={() => perguntar(sugestao)}
                className="block w-full rounded-[var(--raio-cartao)] border border-pauta px-3 py-2 text-left text-sm transition hover:border-acao/40 hover:text-acao"
              >
                {sugestao}
              </button>
            ))}
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
        className="border-t border-pauta p-3"
      >
        <input
          value={pergunta}
          onChange={(evento) => setPergunta(evento.target.value)}
          placeholder="Pergunte sobre suas finanças…"
          className="w-full rounded-full border border-pauta bg-background px-4 py-2.5 text-sm outline-none focus:border-acao/50"
        />
      </form>
    </div>
  )
}
