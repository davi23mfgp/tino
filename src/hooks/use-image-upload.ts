"use client"

import { useCallback, useRef, useState } from "react"

/**
 * useImageUpload — inspirado no hook `use-image-upload` do originui
 * (21st.dev).
 *
 * Mapeado para "foto de perfil": o campo `Usuario.avatarUrl` já existia no
 * banco (schema.prisma) mas nenhuma tela gravava nele — `BarraTopo` e o
 * menu de perfil em `navegacao.tsx` sempre mostravam só a inicial do nome.
 * Isto fecha essa lacuna.
 *
 * Sem serviço de arquivo no projeto (nem S3, nem disco persistente entre
 * deploys), a imagem é reduzida no navegador para um quadrado de 128px e
 * comprimida como JPEG antes de virar `data:` URL — cabe folgado no campo de
 * texto do banco e nunca chega perto do limite da API.
 */

const LADO = 128
const QUALIDADE = 0.82

function reduzirImagem(arquivo: File): Promise<string> {
  return new Promise((resolver, rejeitar) => {
    const leitor = new FileReader()
    leitor.onerror = () => rejeitar(new Error("Não consegui ler o arquivo."))
    leitor.onload = () => {
      const imagem = new Image()
      imagem.onerror = () => rejeitar(new Error("Arquivo não é uma imagem válida."))
      imagem.onload = () => {
        const lado = Math.min(imagem.width, imagem.height)
        const canvas = document.createElement("canvas")
        canvas.width = LADO
        canvas.height = LADO
        const contexto = canvas.getContext("2d")
        if (!contexto) return rejeitar(new Error("Não consegui processar a imagem."))

        // Corta o quadrado central e reduz para 128×128 — igual foto de
        // perfil de qualquer app, sem depender do usuário já mandar quadrada.
        contexto.drawImage(
          imagem,
          (imagem.width - lado) / 2,
          (imagem.height - lado) / 2,
          lado,
          lado,
          0,
          0,
          LADO,
          LADO,
        )
        resolver(canvas.toDataURL("image/jpeg", QUALIDADE))
      }
      imagem.src = leitor.result as string
    }
    leitor.readAsDataURL(arquivo)
  })
}

export function useImageUpload(inicial: string | null = null) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(inicial)
  const [processando, setProcessando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  /** Retorna a data URL resultante — quem chama decide o que fazer com ela (ex.: salvar no servidor). */
  const handleFileChange = useCallback(async (evento: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = evento.target.files?.[0]
    evento.target.value = ""
    if (!arquivo) return null

    if (!arquivo.type.startsWith("image/")) {
      setErro("Escolha um arquivo de imagem.")
      return null
    }

    setErro(null)
    setProcessando(true)
    try {
      const url = await reduzirImagem(arquivo)
      setPreviewUrl(url)
      return url
    } catch (excecao) {
      setErro(excecao instanceof Error ? excecao.message : "Não consegui processar a imagem.")
      return null
    } finally {
      setProcessando(false)
    }
  }, [])

  const handleRemove = useCallback(() => {
    setPreviewUrl(null)
    setErro(null)
    if (inputRef.current) inputRef.current.value = ""
  }, [])

  const openFileDialog = useCallback(() => inputRef.current?.click(), [])

  return {
    previewUrl,
    processando,
    erro,
    inputRef,
    handleFileChange,
    handleRemove,
    openFileDialog,
    /** Ajusta a prévia sem passar por arquivo nenhum — usado ao carregar o valor que já veio do servidor. */
    definir: setPreviewUrl,
  }
}
