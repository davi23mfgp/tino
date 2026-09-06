"use client"

import { useCallback, useEffect, useState } from "react"
import { Plus, RefreshCw, Trash2 } from "lucide-react"

import { buscar, enviar } from "@/lib/cliente"
import { Cartao, Metrica, Vazio } from "@/components/ui/painel"
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

  const carregar = useCallback(async () => {
    const [lista, listaCategorias] = await Promise.all([
      buscar<Regra[]>("/api/regras"),
      buscar<{ id: string; nome: string }[]>("/api/categorias"),
    ])
    setRegras(lista)
    setCategorias(listaCategorias)
    setNova((atual) => ({ ...atual, categoriaId: atual.categoriaId || listaCategorias[0]?.id || "" }))
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

  async function remover(id: string) {
    await buscar(`/api/regras?id=${id}`, { method: "DELETE" })
    await carregar()
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
          <button onClick={() => setAbrir((atual) => !atual)} className="flex items-center gap-1.5">
            <Plus className="size-3.5" /> nova regra
          </button>
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

          <label className="flex items-center gap-2 text-[12px] text-muted-fg">
            <input
              type="checkbox"
              checked={incluirCategorizados}
              onChange={(evento) => setIncluirCategorizados(evento.target.checked)}
            />
            incluir as que já têm categoria
          </label>
        </div>

        {incluirCategorizados && (
          <p className="mt-2 rounded-2xl border border-atencao/40 bg-atencao/10 p-3 text-[12px] text-atencao">
            Isso sobrescreve categorias que você escolheu à mão.
          </p>
        )}

        {mensagem && <p className="mt-3 text-[12px] text-acao">{mensagem}</p>}

        {abrir && (
          <form onSubmit={criar} className="mt-4 grid gap-2 sm:grid-cols-3">
            <input
              value={nova.padrao}
              onChange={(evento) => setNova({ ...nova, padrao: evento.target.value })}
              placeholder="texto procurado (ex.: IFOOD)"
              required
              className={campo}
            />
            <select
              value={nova.categoriaId}
              onChange={(evento) => setNova({ ...nova, categoriaId: evento.target.value })}
              className={campo}
            >
              {categorias.map((categoria) => (
                <option key={categoria.id} value={categoria.id}>
                  {categoria.nome}
                </option>
              ))}
            </select>
            <input
              value={nova.renomearPara}
              onChange={(evento) => setNova({ ...nova, renomearPara: evento.target.value })}
              placeholder="renomear para (opcional)"
              className={campo}
            />
            <button
              disabled={ocupado}
              className="rounded-[var(--raio-pilula)] bg-primary px-4 py-2.5 text-[13px] font-medium text-primary-foreground disabled:opacity-40 sm:col-span-3"
            >
              Criar regra
            </button>
          </form>
        )}
      </Cartao>

      <Cartao titulo="Regras">
        {regras.length === 0 && (
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

              <button
                onClick={() => alternar(regra)}
                className="rounded-full border border-pauta px-3 py-1.5 text-[11px] text-muted-fg transition hover:text-foreground"
              >
                {regra.ativa ? "desligar" : "ligar"}
              </button>
              <button onClick={() => remover(regra.id)} className="text-muted-fg transition hover:text-negativo">
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      </Cartao>
    </div>
  )
}
