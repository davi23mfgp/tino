"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Mic, Square } from "lucide-react"

import { cn } from "@/lib/utils"

/** Usa o reconhecimento disponível no navegador. O navegador pode processar
 * áudio em um serviço próprio; o Tino recebe apenas o texto reconhecido. */

/** O tipo não está no lib padrão do TypeScript; só o que este componente usa. */
interface ReconhecimentoDeFala extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  start(): void
  stop(): void
  onresult: ((evento: { results: { transcript: string }[][] & { length: number } }) => void) | null
  onerror: ((evento: { error: string }) => void) | null
  onend: (() => void) | null
}

function construtorDeFala(): (new () => ReconhecimentoDeFala) | null {
  if (typeof window === "undefined") return null
  const janela = window as unknown as {
    SpeechRecognition?: new () => ReconhecimentoDeFala
    webkitSpeechRecognition?: new () => ReconhecimentoDeFala
  }
  return janela.SpeechRecognition ?? janela.webkitSpeechRecognition ?? null
}

export function DitarGasto({
  aoTranscrever,
  className,
}: {
  /** Recebe o texto falado. Quem chama decide o que fazer com ele. */
  aoTranscrever: (texto: string) => void
  className?: string
}) {
  const [suportado, setSuportado] = useState(false)
  const [ouvindo, setOuvindo] = useState(false)
  const [parcial, setParcial] = useState("")
  const [erro, setErro] = useState<string | null>(null)
  const textoReconhecido = useRef("")
  const motor = useRef<ReconhecimentoDeFala | null>(null)

  useEffect(() => {
    setSuportado(construtorDeFala() !== null)
    return () => motor.current?.stop()
  }, [])

  const parar = useCallback(() => {
    motor.current?.stop()
    setOuvindo(false)
  }, [])

  async function ouvir() {
    if (ouvindo) return
    if (!window.isSecureContext) { setErro("Abra o Tino por HTTPS para usar o microfone."); return }
    const Construtor = construtorDeFala()
    if (!Construtor) return

    setErro(null)
    setParcial("")
    textoReconhecido.current = ""

    const reconhecimento = new Construtor()
    reconhecimento.lang = "pt-BR"
    reconhecimento.continuous = false
    // O parcial aparece enquanto a pessoa fala: sem ele, o botão fica mudo por
    // segundos e parece travado.
    reconhecimento.interimResults = true

    reconhecimento.onresult = (evento) => {
      let texto = ""
      for (let i = 0; i < evento.results.length; i += 1) texto += evento.results[i][0].transcript
      textoReconhecido.current = texto
      setParcial(texto)
    }

    reconhecimento.onerror = (evento) => {
      setErro(
        evento.error === "not-allowed"
          ? "Microfone bloqueado. Abra as permissões deste site, permita o microfone e tente novamente."
          : "Não consegui ouvir. Tente de novo, ou escreva.",
      )
      setOuvindo(false)
    }

    reconhecimento.onend = () => {
      setOuvindo(false)
      const texto = textoReconhecido.current.trim()
      textoReconhecido.current = ""
      setParcial("")
      if (texto) aoTranscrever(texto)
    }

    motor.current = reconhecimento
    try {
      const permissao = await navigator.mediaDevices.getUserMedia({ audio: true })
      permissao.getTracks().forEach(faixa => faixa.stop())
      reconhecimento.start()
      setOuvindo(true)
    } catch { setErro("Não foi possível iniciar o microfone. Confira a permissão do site e o dispositivo selecionado.") }
  }

  if (!suportado) return null

  return (
    <div className={className}>
      <button
        type="button"
        onClick={ouvindo ? parar : ouvir}
        aria-label={ouvindo ? "Parar de gravar" : "Ditar um gasto"}
        className={cn(
          "toque flex items-center gap-2 rounded-full border px-4 py-2.5 text-[calc(13px*var(--escala-letra))] transition-colors",
          ouvindo
            ? "border-negativo bg-negativo/10 text-negativo"
            : "border-pauta text-muted-fg hover:border-positivo/50 hover:text-foreground",
        )}
      >
        {ouvindo ? <Square className="size-4" /> : <Mic className="size-4" />}
        {ouvindo ? "ouvindo… toque para parar" : "ditar"}
      </button>

      {parcial && <p className="mt-2 text-[calc(13px*var(--escala-letra))] italic text-muted-fg">“{parcial}”</p>}
      {erro && <p role="alert" className="mt-2 text-[calc(13px*var(--escala-letra))] text-negativo">{erro}</p>}
    </div>
  )
}
