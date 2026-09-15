"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

import { EditorIdentidades } from "@/components/identidades-visuais"
import { buscar, enviar } from "@/lib/cliente"
import { Cartao } from "@/components/ui/painel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SelectNative } from "@/components/ui/select-native"
import { SeletorEmoji } from "@/components/ui/seletor-emoji"
import { SimboloCategoria, GRUPOS_CATEGORIA, type CategoriaSelecionavel } from "@/components/seletor-categoria"

/**
 * Suas categorias.
 *
 * Era uma pilha de FORMULÁRIOS: cada uma das 24 linhas trazia rótulo "Nome",
 * um campo de texto de largura inteira, um campo "Emoji" que mostrava a
 * palavra "circle" (identificador de ícone guardado no banco, não conteúdo
 * de ninguém) e um botão "Salvar" próprio. Vinte e quatro botões Salvar numa
 * tela é o retrato do que Davi rejeitou em 13/09.
 *
 * Agora é uma LISTA: emoji, nome, grupo e "Editar". O formulário existe só
 * na linha aberta, uma por vez.
 */

/** Emoji é texto; identificador do Lucide guardado no banco não é. */
const EH_EMOJI = new RegExp("\\p{Extended_Pictographic}|\\p{Regional_Indicator}", "u")
const SEM_ACENTO = new RegExp("[\\u0300-\\u036f]", "g")

/** Uma linha fechada: só leitura, 48px, sem nenhum campo. */
function LinhaCategoria({ categoria, aoAbrir }: { categoria: CategoriaSelecionavel; aoAbrir: () => void }) {
  const grupo = GRUPOS_CATEGORIA[categoria.grupo ?? "OUTROS"] ?? "Outros"

  return (
    <div className="flex min-h-12 items-center gap-3 border-b border-pauta py-1.5 last:border-b-0">
      <SimboloCategoria categoria={categoria} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{categoria.nome}</span>
        <span className="block text-xs text-muted-fg">{grupo}</span>
      </span>
      <Button variant="ghost" size="sm" onClick={aoAbrir} className="shrink-0">
        Editar
      </Button>
    </div>
  )
}

/** A mesma linha, aberta: nome, emoji e as duas ações. */
function EdicaoCategoria({
  categoria,
  aoSalvar,
  aoFechar,
}: {
  categoria: CategoriaSelecionavel
  aoSalvar: (categoria: CategoriaSelecionavel) => void
  aoFechar: () => void
}) {
  // O banco guarda "circle" e outros nomes de ícone de versões antigas. Isso
  // nunca é emoji, então entra vazio no seletor em vez de virar texto visível.
  const emojiInicial = EH_EMOJI.test(categoria.icone ?? "") ? (categoria.icone as string) : ""
  const [icone, setIcone] = useState(emojiInicial)
  const [nome, setNome] = useState(categoria.nome)
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState("")

  const mudou = nome !== categoria.nome || icone !== emojiInicial

  async function salvar(evento: React.FormEvent) {
    evento.preventDefault()
    if (!nome.trim()) {
      setErro("Informe o nome da categoria.")
      return
    }
    setOcupado(true)
    setErro("")
    try {
      const atualizada = await enviar<CategoriaSelecionavel>(
        `/api/categorias/${categoria.id}`,
        { nome: nome.trim(), icone: icone || "circle" },
        "PATCH",
      )
      aoSalvar(atualizada)
      aoFechar()
    } catch {
      setErro("Não foi possível salvar. Tente novamente.")
    } finally {
      setOcupado(false)
    }
  }

  return (
    <form onSubmit={salvar} className="border-b border-pauta py-3 last:border-b-0">
      <div className="flex flex-wrap items-center gap-2">
        <SeletorEmoji valor={icone} aoMudar={setIcone} desabilitado={ocupado} />
        <Input
          value={nome}
          onChange={(evento) => setNome(evento.target.value)}
          disabled={ocupado}
          maxLength={80}
          autoFocus
          aria-label={`Nome de ${categoria.nome}`}
          className="min-w-0 flex-1 basis-40"
        />
        <div className="flex shrink-0 gap-1">
          <Button type="submit" size="sm" disabled={ocupado || !mudou}>
            {ocupado ? "Salvando…" : "Salvar"}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={aoFechar} disabled={ocupado}>
            Cancelar
          </Button>
        </div>
      </div>
      {erro && (
        <p role="alert" className="mt-2 text-sm text-negativo">
          {erro}
        </p>
      )}
    </form>
  )
}

export default function CategoriasPagina() {
  const [categorias, setCategorias] = useState<CategoriaSelecionavel[]>([])
  const [busca, setBusca] = useState("")
  const [grupo, setGrupo] = useState("")
  const [abertaId, setAbertaId] = useState<string | null>(null)
  const [erro, setErro] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [tentativa, setTentativa] = useState(0)

  useEffect(() => {
    const controle = new AbortController()
    setCarregando(true)
    setErro(false)
    buscar<CategoriaSelecionavel[]>("/api/categorias", { signal: controle.signal })
      .then((lista) => {
        if (!controle.signal.aborted) setCategorias(lista)
      })
      .catch(() => {
        if (!controle.signal.aborted) setErro(true)
      })
      .finally(() => {
        if (!controle.signal.aborted) setCarregando(false)
      })
    return () => controle.abort()
  }, [tentativa])

  const normalizar = (texto: string) => texto.normalize("NFD").replace(SEM_ACENTO, "").toLowerCase()
  const visiveis = categorias.filter(
    (categoria) => (!grupo || categoria.grupo === grupo) && normalizar(categoria.nome).includes(normalizar(busca)),
  )

  return (
    <div className="space-y-5">
      <EditorIdentidades />

      <Cartao titulo="Suas categorias">
        {/* Busca e grupo lado a lado a partir do `sm`, como a referência. */}
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_200px]">
          <Input
            aria-label="Buscar categorias"
            placeholder="Buscar categoria"
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
          />
          <SelectNative
            aria-label="Grupo de categorias"
            value={grupo}
            onChange={(evento) => setGrupo(evento.target.value)}
          >
            <option value="">Todos os grupos</option>
            {Object.entries(GRUPOS_CATEGORIA).map(([id, nome]) => (
              <option key={id} value={id}>
                {nome}
              </option>
            ))}
          </SelectNative>
        </div>

        {carregando ? (
          <p role="status" className="py-6 text-sm">
            Carregando categorias…
          </p>
        ) : erro ? (
          <div role="alert" className="py-6">
            <p className="mb-2 text-sm">Não foi possível carregar as categorias.</p>
            <Button size="sm" onClick={() => setTentativa((numero) => numero + 1)}>
              Tentar novamente
            </Button>
          </div>
        ) : (
          <>
            <p role="status" className="mt-3 text-xs text-muted-fg">
              {visiveis.length} {visiveis.length === 1 ? "categoria" : "categorias"}
            </p>
            <div className="mt-1">
              {visiveis.map((categoria) =>
                abertaId === categoria.id ? (
                  <EdicaoCategoria
                    key={categoria.id}
                    categoria={categoria}
                    aoFechar={() => setAbertaId(null)}
                    aoSalvar={(atualizada) =>
                      setCategorias((lista) =>
                        lista.map((item) => (item.id === atualizada.id ? atualizada : item)),
                      )
                    }
                  />
                ) : (
                  <LinhaCategoria
                    key={categoria.id}
                    categoria={categoria}
                    aoAbrir={() => setAbertaId(categoria.id)}
                  />
                ),
              )}
              {visiveis.length === 0 && (
                <p className="py-6 text-sm text-muted-fg">Nenhuma categoria com esse filtro.</p>
              )}
            </div>
          </>
        )}

        <Button asChild variant="link" className="mt-3 px-0">
          <Link href="/transacoes">Voltar ao extrato</Link>
        </Button>
      </Cartao>
    </div>
  )
}
