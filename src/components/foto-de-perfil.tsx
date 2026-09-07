"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Camera, Loader2, Trash2 } from "lucide-react"

import { buscar, enviar } from "@/lib/cliente"
import { useImageUpload } from "@/hooks/use-image-upload"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { showToast } from "@/components/ui/toast"

/**
 * Foto de perfil — mapeamento do hook `use-image-upload` do originui
 * (21st.dev). Ver o comentário em `hooks/use-image-upload.ts` para o porquê
 * de reduzir a imagem no navegador antes de mandar.
 *
 * Busca o próprio nome/avatar (em vez de receber por prop) porque
 * `/configuracoes` é a única tela que precisa disso — passar pelo layout do
 * servidor até aqui só para esta caixinha não valeria a rota extra.
 */
export function FotoDePerfil() {
  const router = useRouter()
  const [nome, setNome] = useState("")
  const { previewUrl, processando, erro, inputRef, handleFileChange, handleRemove, openFileDialog, definir } =
    useImageUpload()
  const salvando = useRef(false)

  useEffect(() => {
    buscar<{ nome: string; avatarUrl: string | null }>("/api/usuario").then((usuario) => {
      setNome(usuario.nome)
      definir(usuario.avatarUrl)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function salvar(avatarUrl: string | null) {
    if (salvando.current) return
    salvando.current = true
    try {
      await enviar("/api/usuario", { avatarUrl }, "PATCH")
      // Atualiza a inicial no cabeçalho e no menu de perfil, que vêm do
      // servidor (ver `(app)/layout.tsx`).
      router.refresh()
    } catch (excecao) {
      showToast("Não consegui salvar a foto", {
        description: excecao instanceof Error ? excecao.message : undefined,
        variant: "error",
      })
    } finally {
      salvando.current = false
    }
  }

  async function aoEscolher(evento: React.ChangeEvent<HTMLInputElement>) {
    const url = await handleFileChange(evento)
    if (url) await salvar(url)
  }

  async function aoRemover() {
    handleRemove()
    await salvar(null)
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <Avatar className="size-16 border border-pauta">
          {previewUrl && <AvatarImage src={previewUrl} alt="" />}
          <AvatarFallback className="bg-primary text-[20px] font-semibold text-primary-foreground">
            {nome.trim().charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        {processando && (
          <span className="absolute inset-0 grid place-items-center rounded-full bg-background/70">
            <Loader2 className="size-4 animate-spin text-acao" />
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={openFileDialog}
            className="flex items-center gap-1.5 rounded-full border border-pauta px-4 py-2 text-[12px] transition hover:border-acao/40"
          >
            <Camera className="size-3.5" />
            {previewUrl ? "Trocar foto" : "Adicionar foto"}
          </button>
          {previewUrl && (
            <button
              type="button"
              onClick={aoRemover}
              className="flex items-center gap-1.5 rounded-full border border-pauta px-3 py-2 text-[12px] text-muted-fg transition hover:border-negativo/40 hover:text-negativo"
            >
              <Trash2 className="size-3.5" />
            </button>
          )}
        </div>
        <p className="text-[11px] text-muted-fg">JPG ou PNG. Recorta e reduz para um quadrado pequeno sozinho.</p>
        {erro && <p className="text-[11px] text-negativo">{erro}</p>}
      </div>

      <input ref={inputRef} type="file" accept="image/*" className="sr-only" onChange={aoEscolher} />
    </div>
  )
}
