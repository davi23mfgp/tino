"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Mic, Square } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Ditar um gasto.
 *
 * Dois caminhos, e a pessoa não precisa saber qual está usando:
 *
 * 1. **Reconhecimento do navegador**, quando existe. É instantâneo e mostra o
 *    texto aparecendo enquanto se fala. Só que só existe no Chrome — no iPhone
 *    e no Firefox não há nada, e antes disto o botão simplesmente sumia da
 *    tela, justamente no aparelho onde mais se grava recado.
 * 2. **Gravar e mandar para o Tino**, quando não existe. O áudio sobe, volta
 *    entendido, e cai no mesmo lugar.
 *
 * Nos dois casos o Tino recebe texto e a pessoa confere antes de confirmar.
 */

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
  /** Já entra gravando. É o caminho de quem tocou em "Ditar" na notificação
      e não deveria ter de procurar o microfone depois de abrir a tela. */
  iniciarSozinho = false,
}: {
  /** Recebe o texto falado. Quem chama decide o que fazer com ele. */
  aoTranscrever: (texto: string) => void
  className?: string
  iniciarSozinho?: boolean
}) {
  const [suportado, setSuportado] = useState(false)
  const [ouvindo, setOuvindo] = useState(false)
  const [parcial, setParcial] = useState("")
  const [erro, setErro] = useState<string | null>(null)
  const textoReconhecido = useRef("")
  const motor = useRef<ReconhecimentoDeFala | null>(null)
  const gravador = useRef<MediaRecorder | null>(null)
  const pedacos = useRef<Blob[]>([])
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    setSuportado(construtorDeFala() !== null)
    return () => {
      motor.current?.stop()
      if (gravador.current?.state === "recording") gravador.current.stop()
    }
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

  /**
   * Grava e manda para o servidor entender.
   *
   * O formato sai do que o aparelho aceita: o iPhone grava mp4/aac e o resto
   * grava webm. A rota decide a extensão pelo tipo que chega — Whisper recusa
   * arquivo sem extensão reconhecível.
   */
  async function gravar() {
    if (!window.isSecureContext) { setErro("Abra o Tino por HTTPS para usar o microfone."); return }
    setErro(null)

    try {
      const entrada = await navigator.mediaDevices.getUserMedia({ audio: true })
      const gravacao = new MediaRecorder(entrada)
      pedacos.current = []

      gravacao.ondataavailable = (evento) => { if (evento.data.size > 0) pedacos.current.push(evento.data) }

      gravacao.onstop = async () => {
        entrada.getTracks().forEach((faixa) => faixa.stop())
        setOuvindo(false)

        const audio = new Blob(pedacos.current, { type: gravacao.mimeType })
        pedacos.current = []
        if (audio.size === 0) { setErro("Não gravou nada. Tente de novo."); return }

        const formulario = new FormData()
        formulario.append("audio", audio)

        setEnviando(true)
        try {
          const resposta = await fetch("/api/transcrever", { method: "POST", body: formulario })
          const dados = (await resposta.json()) as { texto?: string; erro?: string }
          if (!resposta.ok || !dados.texto) { setErro(dados.erro ?? "Não consegui entender. Tente de novo, ou escreva."); return }
          aoTranscrever(dados.texto)
        } catch {
          setErro("Não consegui mandar o áudio. Confira a conexão.")
        } finally {
          setEnviando(false)
        }
      }

      gravador.current = gravacao
      gravacao.start()
      setOuvindo(true)
    } catch {
      setErro("Microfone bloqueado. Abra as permissões deste site, permita o microfone e tente novamente.")
    }
  }

  function pararGravacao() {
    if (gravador.current?.state === "recording") gravador.current.stop()
  }

  const gravandoNoServidor = !suportado
  const comecar = gravandoNoServidor ? gravar : ouvir
  const terminar = gravandoNoServidor ? pararGravacao : parar

  // Uma vez só: sem a trava, cada re-render pediria o microfone de novo.
  const jaIniciou = useRef(false)
  useEffect(() => {
    if (!iniciarSozinho || jaIniciou.current) return
    jaIniciou.current = true
    comecar()
  }, [iniciarSozinho, comecar])

  return (
    <div className={className}>
      <button
        type="button"
        onClick={ouvindo ? terminar : comecar}
        disabled={enviando}
        aria-label={ouvindo ? "Parar de gravar" : "Ditar um gasto"}
        className={cn(
          "toque flex items-center gap-2 rounded-full border px-4 py-2.5 text-[calc(13px*var(--escala-letra))] transition-colors",
          ouvindo
            ? "border-negativo bg-negativo/10 text-negativo"
            : "border-pauta text-muted-fg hover:border-positivo/50 hover:text-foreground",
        )}
      >
        {ouvindo ? <Square className="size-4" /> : <Mic className="size-4" />}
        {enviando ? "entendendo…" : ouvindo ? "ouvindo… toque para parar" : "ditar"}
      </button>

      {parcial && <p className="mt-2 text-[calc(13px*var(--escala-letra))] italic text-muted-fg">“{parcial}”</p>}
      {erro && <p role="alert" className="mt-2 text-[calc(13px*var(--escala-letra))] text-negativo">{erro}</p>}
    </div>
  )
}
