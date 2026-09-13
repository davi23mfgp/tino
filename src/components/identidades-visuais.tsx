"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { Plus, Store } from "lucide-react"

import { buscar, enviar } from "@/lib/cliente"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Cartao } from "@/components/ui/painel"
import { SeletorEmoji } from "@/components/ui/seletor-emoji"

interface Identidade {
  id: string
  nome: string
  logoUrl: string | null
  emoji: string | null
}

const Contexto = createContext<{ lista: Identidade[]; recarregar: () => void }>({ lista: [], recarregar: () => {} })

export function IdentidadesProvider({ children }: { children: React.ReactNode }) {
  const [lista, setLista] = useState<Identidade[]>([])
  function recarregar() {
    buscar<Identidade[]>("/api/identidades").then(setLista).catch(() => {})
  }
  useEffect(recarregar, [])
  return <Contexto.Provider value={{ lista, recarregar }}>{children}</Contexto.Provider>
}

const SEM_ACENTO = new RegExp("[\\u0300-\\u036f]", "g")
const normalizar = (texto: string) => texto.normalize("NFD").replace(SEM_ACENTO, "").toLowerCase()

export function useIdentidadeVisual(nome: string) {
  const { lista } = useContext(Contexto)
  return [...lista]
    .sort((a, b) => b.nome.length - a.nome.length)
    .find((item) => normalizar(nome).includes(normalizar(item.nome)))
}

export function MarcaPersonalizada({ nome }: { nome: string }) {
  const encontrada = useIdentidadeVisual(nome)
  if (!encontrada) return null
  if (encontrada.logoUrl)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={encontrada.logoUrl} alt={encontrada.nome} className="size-9 shrink-0 rounded-[10px] object-contain" />
  return (
    <span aria-label={encontrada.nome} className="grid size-9 shrink-0 place-items-center text-xl">
      {encontrada.emoji ?? encontrada.nome.slice(0, 2).toUpperCase()}
    </span>
  )
}

/**
 * Logos e estabelecimentos.
 *
 * Era um FORMULÁRIO sempre aberto no topo do cartão: quatro campos visíveis
 * mesmo para quem só queria conferir o que já tinha associado, um campo de
 * largura inteira para caber um emoji, e o seletor de arquivo nativo em
 * inglês ("Choose File / No file chosen"). A lista do que existe vinha
 * depois, sem destaque.
 *
 * Agora a LISTA é a tela. O formulário aparece ao tocar em "Adicionar" ou
 * "Editar", e some ao salvar.
 */
export function EditorIdentidades() {
  const { lista, recarregar } = useContext(Contexto)
  const [editando, setEditando] = useState<Identidade | "nova" | null>(null)
  const [nome, setNome] = useState("")
  const [emoji, setEmoji] = useState("")
  const [foto, setFoto] = useState<string | null>(null)
  const [nomeArquivo, setNomeArquivo] = useState("")
  const [erro, setErro] = useState("")
  const [ocupado, setOcupado] = useState(false)

  function abrir(identidade: Identidade | "nova") {
    setEditando(identidade)
    setErro("")
    setNomeArquivo("")
    if (identidade === "nova") {
      setNome("")
      setEmoji("")
      setFoto(null)
    } else {
      setNome(identidade.nome)
      setEmoji(identidade.emoji ?? "")
      setFoto(identidade.logoUrl)
    }
  }

  function fechar() {
    setEditando(null)
    setErro("")
  }

  async function salvar(evento: React.FormEvent) {
    evento.preventDefault()
    setOcupado(true)
    setErro("")
    try {
      await enviar("/api/identidades", { nome, emoji, logoUrl: foto }, "PUT")
      recarregar()
      fechar()
    } catch (excecao) {
      setErro(excecao instanceof Error ? excecao.message : "Não foi possível salvar.")
    } finally {
      setOcupado(false)
    }
  }

  async function ler(arquivo?: File) {
    if (!arquivo) return
    if (!["image/png", "image/jpeg", "image/webp"].includes(arquivo.type) || arquivo.size > 500 * 1024) {
      setErro("Use PNG, JPG ou WebP de até 500 KB.")
      return
    }
    setNomeArquivo(arquivo.name)
    const leitor = new FileReader()
    leitor.onload = () => setFoto(String(leitor.result))
    leitor.readAsDataURL(arquivo)
  }

  return (
    <Cartao
      titulo="Logos e estabelecimentos"
      acao={
        !editando && (
          <Button size="sm" variant="ghost" onClick={() => abrir("nova")}>
            <Plus aria-hidden className="size-4" />
            Adicionar
          </Button>
        )
      }
    >
      {editando ? (
        <form onSubmit={salvar} className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <label className="text-sm">
              Nome encontrado na compra
              <Input
                required
                maxLength={80}
                value={nome}
                onChange={(evento) => setNome(evento.target.value)}
                placeholder="Ex.: Uber, Posto Ipiranga"
                autoFocus
                className="mt-1"
              />
            </label>
            <div className="text-sm">
              Emoji
              <div className="mt-1">
                <SeletorEmoji valor={emoji} aoMudar={setEmoji} desabilitado={ocupado} />
              </div>
            </div>
          </div>

          {/* O seletor nativo mostra "Choose File / No file chosen", em inglês
              e sem controle nosso. O input fica escondido atrás de um botão
              com texto em português e o nome do arquivo ao lado. */}
          <div className="text-sm">
            Logo (até 500 KB)
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {foto && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={foto} alt="Prévia do logo" className="size-11 rounded-[10px] object-contain" />
              )}
              <label className="inline-flex min-h-11 cursor-pointer items-center rounded-[12px] border border-pauta bg-papel-2 px-3 text-sm hover:bg-papel-3">
                Escolher imagem
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(evento) => void ler(evento.target.files?.[0])}
                  className="sr-only"
                />
              </label>
              <span className="min-w-0 truncate text-xs text-muted-fg">
                {nomeArquivo || (foto ? "Imagem salva" : "Nenhuma imagem escolhida")}
              </span>
              {foto && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setFoto(null)
                    setNomeArquivo("")
                  }}
                >
                  Remover
                </Button>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={ocupado || !nome.trim()}>
              {ocupado ? "Salvando…" : "Salvar"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={fechar} disabled={ocupado}>
              Cancelar
            </Button>
          </div>

          {erro && (
            <p role="alert" className="text-sm text-negativo">
              {erro}
            </p>
          )}
        </form>
      ) : (
        <>
          <p className="mb-2 text-sm text-muted-fg">
            O logo aparece no extrato quando o nome da compra bate com o que você associou aqui.
          </p>

          {lista.length === 0 ? (
            <p className="flex items-center gap-2 py-4 text-sm text-muted-fg">
              <Store aria-hidden className="size-4" />
              Nenhuma associação ainda.
            </p>
          ) : (
            <div>
              {lista.map((identidade) => (
                <div
                  key={identidade.id}
                  className="flex min-h-12 items-center gap-3 border-b border-pauta py-1.5 last:border-b-0"
                >
                  <MarcaPersonalizada nome={identidade.nome} />
                  <span className="min-w-0 flex-1 truncate text-sm">{identidade.nome}</span>
                  <Button size="sm" variant="ghost" onClick={() => abrir(identidade)}>
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      try {
                        await enviar("/api/identidades", { id: identidade.id }, "DELETE")
                        recarregar()
                      } catch {
                        setErro("Não foi possível remover.")
                      }
                    }}
                  >
                    Remover
                  </Button>
                </div>
              ))}
            </div>
          )}

          {erro && (
            <p role="alert" className="mt-2 text-sm text-negativo">
              {erro}
            </p>
          )}
        </>
      )}
    </Cartao>
  )
}
