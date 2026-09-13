"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Camera, Loader2, Trash2 } from "lucide-react"

import { buscar, enviar } from "@/lib/cliente"
import { useImageUpload } from "@/hooks/use-image-upload"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
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
  const [ocupado, setOcupado] = useState(false)
  const [perfilCarregado, setPerfilCarregado] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [erroLocal, setErroLocal] = useState<string | null>(null)
  const fotoSalva = useRef<string | null>(null)

  useEffect(() => {
    let ativo = true
    buscar<{ nome: string; avatarUrl: string | null }>("/api/usuario").then((usuario) => {
      if (!ativo) return
      setPerfilCarregado(true)
      fotoSalva.current = usuario.avatarUrl
      setNome(usuario.nome)
      definir(usuario.avatarUrl)
    }).catch(() => { if (ativo) setErroLocal("Não consegui carregar seu perfil. Atualize a página.") }).finally(() => { if (ativo) setCarregando(false) })
    return () => { ativo = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function salvar(avatarUrl: string | null) {
    if (salvando.current) return
    salvando.current = true
    setOcupado(true)
    try {
      await enviar("/api/usuario", { avatarUrl }, "PATCH")
      fotoSalva.current = avatarUrl
      showToast(avatarUrl ? "Foto atualizada" : "Foto removida")
      // Atualiza a inicial no cabeçalho e no menu de perfil, que vêm do
      // servidor (ver `(app)/layout.tsx`).
      router.refresh()
    } catch (excecao) {
      definir(fotoSalva.current)
      showToast("Não consegui salvar a foto", {
        description: excecao instanceof Error ? excecao.message : undefined,
        variant: "error",
      })
    } finally {
      salvando.current = false
      setOcupado(false)
    }
  }

  async function aoEscolher(evento: React.ChangeEvent<HTMLInputElement>) {
    if (salvando.current || processando || carregando) return
    const arquivo = evento.target.files?.[0]
    if (!arquivo) return
    setErroLocal(null)
    if (!["image/jpeg", "image/png", "image/webp"].includes(arquivo.type) || arquivo.size > 10 * 1024 * 1024) {
      setErroLocal("Escolha JPG, PNG ou WebP de até 10 MB.")
      evento.target.value = ""
      return
    }
    const url = await handleFileChange(evento)
    if (url) await salvar(url)
  }

  async function aoRemover() {
    if (salvando.current || processando || carregando) return
    setErroLocal(null)
    handleRemove()
    await salvar(null)
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="relative">
        <Avatar className="size-16 border border-pauta">
          {previewUrl && <AvatarImage src={previewUrl} alt="" />}
          <AvatarFallback className="bg-primary text-[20px] font-semibold text-primary-foreground">
            {nome.trim().charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        {(processando || ocupado) && (
          <span className="absolute inset-0 grid place-items-center rounded-full bg-background/70">
            <Loader2 className="size-4 animate-spin text-acao" />
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-medium">{nome}</p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline" size="sm" disabled={!perfilCarregado || carregando || processando || ocupado}
            onClick={openFileDialog}
          >
            <Camera data-icon="inline-start" />
            {previewUrl ? "Trocar foto" : "Adicionar foto"}
          </Button>
          {previewUrl && (
            <Button
              type="button"
              variant="ghost" size="icon" aria-label="Remover foto" disabled={!perfilCarregado || carregando || processando || ocupado}
              onClick={aoRemover}
              >
              <Trash2 />
            </Button>
          )}
        </div>
        <p className="text-[11px] text-muted-fg">JPG, PNG ou WebP. Até 10 MB.</p>
        {(erroLocal || erro) && <p className="text-[11px] text-negativo" role="alert">{erroLocal || erro}</p>}
      </div>

      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" disabled={!perfilCarregado || carregando || processando || ocupado} aria-label="Escolher foto de perfil" className="sr-only" onChange={aoEscolher} />
    </div>
  )
}
