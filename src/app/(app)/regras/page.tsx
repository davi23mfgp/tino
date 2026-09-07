"use client"

import { useCallback, useEffect, useState } from "react"
import { MoreHorizontal, Plus, Power, RefreshCw, Trash2 } from "lucide-react"

import { buscar, enviar } from "@/lib/cliente"
import { Cartao, Metrica, Vazio } from "@/components/ui/painel"
import { showToast } from "@/components/ui/toast"
import { Checkbox } from "@/components/ui/checkbox"
import { TagsSelector } from "@/components/ui/tags-selector"
import { EsqueletoLinhas } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

/**
 * O que o Tino aprendeu.
 *
 * A tela existe porque categorização automática sem lugar para inspecionar vira
 * caixa-preta: quando erra, o usuário não sabe onde corrigir e passa a
 * desconfiar de todos os números. Aqui dá para ver a regra, quantas vezes ela
 * pegou, desligar e reprocessar o histórico.
 */

interface Regra {
  id: string
  padrao: string
  regex: boolean
  categoriaId: string
  renomearPara: string | null
  prioridade: number
  ativa: boolean
  acertos: number
  criadoEm: string
  categoria: { nome: string; cor: string; icone: string }
}

const campo = "w-full rounded-[var(--raio-campo)] border border-pauta bg-background px-3.5 py-2.5 text-[13px] outline-none focus:border-acao/50"

export default function Regras() {
  const [regras, setRegras] = useState<Regra[]>([])
  const [categorias, setCategorias] = useState<{ id: string; nome: string }[]>([])
  const [nova, setNova] = useState({ padrao: "", categoriaId: "", renomearPara: "" })
  const [abrir, setAbrir] = useState(false)
  const [incluirCategorizados, setIncluirCategorizados] = useState(false)
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [carregando, setCarregando] = useState(true)

  const carregar = useCallback(async () => {
    const [lista, listaCategorias] = await Promise.all([
      buscar<Regra[]>("/api/regras"),
      buscar<{ id: string; nome: string }[]>("/api/categorias"),
    ])
    setRegras(lista)
    setCategorias(listaCategorias)
    setNova((atual) => ({ ...atual, categoriaId: atual.categoriaId || listaCategorias[0]?.id || "" }))
    setCarregando(false)
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  async function criar(evento: React.FormEvent) {
    evento.preventDefault()
    setOcupado(true)
    try {
      await enviar("/api/regras", {
        padrao: nova.padrao,
        categoriaId: nova.categoriaId,
        renomearPara: nova.renomearPara || undefined,
      })
      setNova({ padrao: "", categoriaId: categorias[0]?.id ?? "", renomearPara: "" })
      setAbrir(false)
      await carregar()
    } finally {
      setOcupado(false)
    }
  }

  async function alternar(regra: Regra) {
    await enviar("/api/regras", { id: regra.id, ativa: !regra.ativa }, "PATCH")
    await carregar()
  }

  /**
   * "Desfazer em vez de confirmar" — mesmo padrão de `/recorrencias`. A
   * regra some da lista na hora; o DELETE de verdade só sai depois de 5s
   * sem ninguém desfazer.
   */
  function remover(regra: Regra) {
    setRegras((atual) => atual.filter((r) => r.id !== regra.id))

    let desfeito = false
    showToast(`Regra "${regra.padrao}" removida`, {
      action: {
        label: "Desfazer",
        onClick: () => {
          desfeito = true
          setRegras((atual) => (atual.some((r) => r.id === regra.id) ? atual : [...atual, regra]))
        },
      },
    })

    setTimeout(async () => {
      if (desfeito) return
      await buscar(`/api/regras?id=${regra.id}`, { method: "DELETE" })
    }, 5000)
  }

  /**
   * Reprocessa o histórico. Por padrão só toca no que está sem categoria —
   * recategorizar em massa o que o usuário classificou à mão apagaria o
   * trabalho dele sem aviso.
   */
  async function reprocessar() {
    setOcupado(true)
    setMensagem(null)
    try {
      const resultado = await enviar<{ analisadas: number; atualizadas: number }>(
        "/api/regras",
        { incluirJaCategorizados: incluirCategorizados },
        "PUT",
      )
      setMensagem(
        `${resultado.atualizadas} de ${resultado.analisadas} lançamento(s) foram reclassificados.`,
      )
      await carregar()
    } catch (erro) {
      setMensagem(erro instanceof Error ? erro.message : "Falha ao reprocessar.")
    } finally {
      setOcupado(false)
    }
  }

  const ativas = regras.filter((regra) => regra.ativa)
  const totalAcertos = regras.reduce((soma, regra) => soma + regra.acertos, 0)

  return (
    <div className="space-y-4">
      <Cartao
        titulo="O que o Tino aprendeu"
        acao={
          <Dialog open={abrir} onOpenChange={setAbrir}>
            <DialogTrigger asChild>
              <button className="flex items-center gap-1.5">
                <Plus className="size-3.5" /> nova regra
              </button>
            </DialogTrigger>
            {/* Formulário que era inline (aparecia empurrando o resto do
                cartão para baixo) virou modal — mapeamento do `dialog` do
                21st.dev (ver docs/REDESIGN-EM-CURSO.md). Criar regra é uma
                ação pontual, não algo que a pessoa deixa aberto enquanto lê
                o resto da tela. */}
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova regra</DialogTitle>
              </DialogHeader>
              <form id="form-nova-regra" onSubmit={criar}>
                <DialogBody className="grid gap-3">
                  <input
                    value={nova.padrao}
                    onChange={(evento) => setNova({ ...nova, padrao: evento.target.value })}
                    placeholder="texto procurado (ex.: IFOOD)"
                    required
                    autoFocus
                    className={campo}
                  />
                  <div>
                    <p className="mb-1.5 text-[12px] text-muted-fg">categoria</p>
                    <TagsSelector
                      opcoes={categorias}
                      valor={nova.categoriaId || null}
                      aoEscolher={(id) => setNova({ ...nova, categoriaId: id ?? "" })}
                      rotuloSemEscolha="escolher…"
                    />
                  </div>
                  <input
                    value={nova.renomearPara}
                    onChange={(evento) => setNova({ ...nova, renomearPara: evento.target.value })}
                    placeholder="renomear para (opcional)"
                    className={campo}
                  />
                </DialogBody>
                <DialogFooter>
                  <button
                    disabled={ocupado || !nova.categoriaId}
                    className="rounded-[var(--raio-pilula)] bg-primary px-4 py-2.5 text-[13px] font-medium text-primary-foreground disabled:opacity-40"
                  >
                    Criar regra
                  </button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <Metrica rotulo="Regras ativas" valor={String(ativas.length)} />
          <Metrica rotulo="Desligadas" valor={String(regras.length - ativas.length)} />
          <Metrica rotulo="Lançamentos classificados" valor={String(totalAcertos)} tom="positivo" />
        </div>

        <p className="mt-3 text-[12px] leading-relaxed text-muted-fg">
          Toda vez que você corrige a categoria de um lançamento, o Tino cria uma regra aqui. Quanto mais regras, menos
          trabalho no mês seguinte.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            onClick={reprocessar}
            disabled={ocupado}
            className="flex items-center gap-1.5 rounded-full border border-pauta px-4 py-2 text-[12px] transition hover:border-acao/40 hover:text-acao disabled:opacity-40"
          >
            <RefreshCw className={cn("size-3.5", ocupado && "animate-spin")} />
            aplicar nas transações antigas
          </button>

          <Checkbox
            checked={incluirCategorizados}
            onChange={(evento) => setIncluirCategorizados(evento.target.checked)}
            rotulo={<span className="text-muted-fg">incluir as que já têm categoria</span>}
          />
        </div>

        {incluirCategorizados && (
          <p className="mt-2 rounded-2xl border border-atencao/40 bg-atencao/10 p-3 text-[12px] text-atencao">
            Isso sobrescreve categorias que você escolheu à mão.
          </p>
        )}

        {mensagem && <p className="mt-3 text-[12px] text-acao">{mensagem}</p>}
      </Cartao>

      <Cartao titulo="Regras">
        {carregando && <EsqueletoLinhas linhas={3} />}

        {!carregando && regras.length === 0 && (
          <Vazio
            titulo="Nenhuma regra ainda"
            texto="Corrija a categoria de um lançamento em Transações e a primeira regra nasce sozinha."
          />
        )}

        <div className="space-y-2">
          {regras.map((regra) => (
            <div
              key={regra.id}
              className={cn(
                "flex flex-wrap items-center gap-3 rounded-2xl border p-3",
                regra.ativa ? "border-pauta" : "border-pauta opacity-50",
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px]">
                  <code className="rounded bg-papel-2 px-1.5 py-0.5 text-[12px]">{regra.padrao}</code>
                  <span className="mx-2 text-muted-fg">vira</span>
                  {regra.categoria.nome}
                </p>
                <p className="text-[11px] text-muted-fg">
                  {regra.acertos > 0 ? `${regra.acertos} lançamento(s) classificados` : "ainda não pegou nenhum"}
                  {regra.renomearPara && ` · renomeia para "${regra.renomearPara}"`}
                  {regra.regex && " · expressão regular"}
                  {regra.prioridade >= 100 && " · criada por você"}
                </p>
              </div>

              {/* Duas ações separadas viraram um menu "⋯" — mapeamento do
                  `dropdown-menu` do 21st.dev, mesmo padrão do menu de perfil
                  em `components/navegacao.tsx`. */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    aria-label="Ações da regra"
                    className="rounded-full p-1.5 text-muted-fg transition hover:bg-foreground/[0.06] hover:text-foreground"
                  >
                    <MoreHorizontal className="size-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => alternar(regra)}>
                    <Power className="mr-2 size-4" />
                    {regra.ativa ? "Desligar" : "Ligar"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => remover(regra)} className="text-negativo focus:text-negativo">
                    <Trash2 className="mr-2 size-4" />
                    Remover
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      </Cartao>
    </div>
  )
}
