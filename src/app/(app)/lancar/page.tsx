"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { ArrowRight, Check } from "lucide-react"

import { enviar } from "@/lib/cliente"
import { DitarGasto } from "@/components/ditar-gasto"
import { Abertura } from "@/components/abertura"
import { Pilula } from "@/components/ui/painel"

/**
 * Lançar em uma tela só.
 *
 * É o destino do atalho fixo na notificação do celular: quem toca ali quer
 * registrar um gasto em cinco segundos e voltar para o que estava fazendo.
 * Por isso a tela não tem filtro, não tem lista e não tem navegação — campo,
 * microfone, e a confirmação de que entrou.
 *
 * `?modo=voz` já abre gravando: é o caminho de quem tocou em "Ditar" na
 * notificação e não quer procurar o botão do microfone.
 *
 * O lançamento entra na fila de conferência, não no saldo. Entre a fala e o
 * número existe uma transcrição, e transcrição erra — a decisão de produto de
 * 14/09 vale aqui igual.
 */
export default function Lancar() {
  // `useSearchParams` exige fronteira de suspense no App Router.
  return (
    <Suspense fallback={null}>
      <TelaDeLancar />
    </Suspense>
  )
}

function TelaDeLancar() {
  const modo = useSearchParams().get("modo")
  const [texto, setTexto] = useState("")
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [feitos, setFeitos] = useState<string[]>([])
  const campo = useRef<HTMLInputElement>(null)

  useEffect(() => {
    campo.current?.focus()
  }, [])

  async function anotar(frase: string) {
    const limpo = frase.trim()
    if (!limpo || ocupado) return

    setOcupado(true)
    setErro(null)
    try {
      await enviar("/api/capturas/rapida", { texto: limpo })
      setFeitos((atual) => [limpo, ...atual])
      setTexto("")
      campo.current?.focus()
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não consegui anotar.")
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-lg space-y-4">
      <Abertura
        rotulo="Anotar"
        titulo={feitos.length > 0 ? <>Anotado. Quer lançar <em>mais um</em>?</> : <>O que você gastou?</>}
        apoio="Escreva ou fale. Fica esperando sua conferência antes de entrar no saldo."
      >
        <form
          className="flex w-full min-w-0 items-center gap-2"
          onSubmit={(evento) => {
            evento.preventDefault()
            void anotar(texto)
          }}
        >
          <input
            ref={campo}
            value={texto}
            onChange={(evento) => setTexto(evento.target.value)}
            placeholder="mercado 52,30"
            aria-label="O que você gastou"
            enterKeyHint="done"
            className="min-h-[52px] min-w-0 flex-1 rounded-[var(--raio-campo)] border border-pauta bg-papel-2 px-4 text-[calc(16px*var(--escala-letra))] outline-none focus:border-acao"
          />
          <DitarGasto aoTranscrever={(falado) => void anotar(falado)} iniciarSozinho={modo === "voz"} />
          <button
            type="submit"
            disabled={ocupado || !texto.trim()}
            aria-label="Anotar"
            className="grid size-[52px] shrink-0 place-items-center rounded-full bg-acao text-background disabled:opacity-40"
          >
            <ArrowRight className="size-5" />
          </button>
        </form>
      </Abertura>

      {erro && <p className="px-1 text-[calc(13px*var(--escala-letra))] text-negativo">{erro}</p>}

      {feitos.length > 0 && (
        <div className="space-y-2 px-1">
          {feitos.map((linha, indice) => (
            <p key={`${linha}-${indice}`} className="flex items-center gap-2 text-[calc(14px*var(--escala-letra))]">
              <Check className="size-4 shrink-0 text-positivo" />
              <span className="min-w-0 flex-1 truncate">{linha}</span>
            </p>
          ))}
          <div className="flex flex-wrap gap-2 pt-1">
            <Link href="/capturas" className="text-[calc(13px*var(--escala-letra))] font-medium text-acao underline-offset-4 hover:underline">
              Conferir a fila
            </Link>
            <Pilula>{feitos.length} {feitos.length === 1 ? "anotado" : "anotados"} agora</Pilula>
          </div>
        </div>
      )}
    </div>
  )
}
