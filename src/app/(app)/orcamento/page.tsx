"use client"

import { useCallback, useEffect, useState } from "react"
import { Sparkles, Trash2 } from "lucide-react"

import { buscar, enviar } from "@/lib/cliente"
import { competenciaAtual, rotuloCompetencia, ultimasCompetencias, competenciaMaisMeses } from "@/lib/datas"
import { formatarMoeda, paraCentavos } from "@/lib/dinheiro"
import { Barra, Cartao, Metrica, Vazio } from "@/components/ui/painel"
import { SimboloCategoria } from "@/components/seletor-categoria"
import { cn } from "@/lib/utils"

/**
 * Orçamento por categoria.
 *
 * O limite é editado direto na linha, sem tela de cadastro à parte: orçamento
 * que exige navegar para outro lugar para ajustar um valor não é revisado, e
 * orçamento não revisado deixa de valer em duas semanas.
 */

interface Categoria {
  id: string
  nome: string
  grupo: string
}

interface Linha {
  id: string
  categoriaId: string
  categoria: Categoria
  limiteCentavos: number
  gastoCentavos: number
  restanteCentavos: number
  percentual: number
  estourou: boolean
}

interface Orcamento {
  competencia: string
  linhas: Linha[]
  semOrcamento: { categoria: Categoria; gastoCentavos: number }[]
  limiteTotalCentavos: number
  gastoTotalCentavos: number
}

const campo = "min-h-11 w-32 rounded-xl border border-pauta bg-background px-3 py-1.5 text-right text-sm tabular-nums outline-none focus:border-acao/50"

export default function OrcamentoPagina() {
  const [competencia, setCompetencia] = useState(competenciaAtual())
  const [dados, setDados] = useState<Orcamento | null>(null)
  const [rascunho, setRascunho] = useState<Record<string, string>>({})
  const [repetir, setRepetir] = useState(0)
  const [ocupado, setOcupado] = useState(false)
  const [mensagem, setMensagem] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    const resposta = await buscar<Orcamento>(`/api/orcamento?competencia=${competencia}`)
    setDados(resposta)
    setRascunho(
      Object.fromEntries(
        resposta.linhas.map((linha) => [linha.categoriaId, (linha.limiteCentavos / 100).toFixed(2).replace(".", ",")]),
      ),
    )
  }, [competencia])

  useEffect(() => {
    carregar().catch(()=>setMensagem("Não foi possível carregar o orçamento. Recarregue a página."))
  }, [carregar])

  async function salvar() {
    setOcupado(true)
    setMensagem(null)

    try {
      const linhas = Object.entries(rascunho)
        .filter(([, valor]) => valor.trim())
        .map(([categoriaId, valor]) => ({ categoriaId, limiteCentavos: paraCentavos(valor) }))

      const resultado = await enviar<{ mesesAfetados: number }>(
        "/api/orcamento",
        { competencia, linhas, repetirMeses: repetir },
        "PUT",
      )
      setMensagem(
        resultado.mesesAfetados > 1
          ? `Salvo para ${resultado.mesesAfetados} meses.`
          : "Salvo para este mês.",
      )
      await carregar()
    } catch (erro) {
      setMensagem(erro instanceof Error ? erro.message : "Não consegui salvar.")
    } finally {
      setOcupado(false)
    }
  }

  /**
   * Sugestão pela mediana dos últimos 6 meses.
   * Mediana e não média: um mês atípico (viagem, conserto de carro) puxaria a
   * média e inflaria o limite para sempre.
   */
  async function sugerir() {
    setOcupado(true)
    try {
      const resposta = await buscar<{ sugestoes: { categoriaId: string; sugestaoCentavos: number }[] }>(
        `/api/orcamento?competencia=${competencia}`,
        { method: "POST" },
      )

      setRascunho((atual) => {
        const novo = { ...atual }
        for (const sugestao of resposta.sugestoes) {
          novo[sugestao.categoriaId] = (sugestao.sugestaoCentavos / 100).toFixed(2).replace(".", ",")
        }
        return novo
      })

      setMensagem(
        resposta.sugestoes.length > 0
          ? `${resposta.sugestoes.length} limite(s) preenchido(s) pela mediana dos últimos 6 meses. Ajuste e salve.`
          : "Ainda não há histórico suficiente para sugerir.",
      )
    } finally {
      setOcupado(false)
    }
  }

  const limitePlanejado = Object.values(rascunho).reduce((soma, valor) => soma + (valor ? paraCentavos(valor) : 0), 0)
  const gasto = dados?.gastoTotalCentavos ?? 0
  const estourados = dados?.linhas.filter((linha) => linha.estourou).length ?? 0

  return (
    <div className="space-y-4">
      <Cartao
        titulo="Orçamento"
        acao={
          <select
            value={competencia}
            onChange={(evento) => setCompetencia(evento.target.value)}
            className="rounded-full border border-pauta bg-background px-3 py-1.5 text-[12px]"
          >
            {ultimasCompetencias(6)
              .concat([1, 2, 3].map((n) => competenciaMaisMeses(competenciaAtual(), n)))
              .map((mes) => (
                <option key={mes} value={mes}>
                  {rotuloCompetencia(mes)}
                </option>
              ))}
          </select>
        }
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metrica rotulo="Planejado" valor={formatarMoeda(limitePlanejado)} />
          <Metrica rotulo="Gasto" valor={formatarMoeda(gasto)} tom={gasto > limitePlanejado ? "negativo" : "neutro"} />
          <Metrica
            rotulo="Sobra do plano"
            valor={formatarMoeda(limitePlanejado - gasto)}
            tom={limitePlanejado - gasto >= 0 ? "positivo" : "negativo"}
          />
          <Metrica
            rotulo="Categorias estouradas"
            valor={String(estourados)}
            tom={estourados > 0 ? "atencao" : "neutro"}
          />
        </div>

        {limitePlanejado > 0 && (
          <div className="mt-4">
            <Barra percentual={(gasto / limitePlanejado) * 100} />
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            onClick={sugerir}
            disabled={ocupado}
            className="flex items-center gap-1.5 rounded-full border border-pauta px-4 py-2 text-[12px] transition hover:border-acao/40 hover:text-acao disabled:opacity-40"
          >
            <Sparkles className="size-3.5" />
            Usar meu histórico
          </button>

          <label className="flex items-center gap-2 text-[12px] text-muted-fg">
            Repetir por
            <select
              value={repetir}
              onChange={(evento) => setRepetir(Number(evento.target.value))}
              className="rounded-full border border-pauta bg-background px-2.5 py-1.5 text-[12px]"
            >
              {[0, 2, 5, 11].map((n) => (
                <option key={n} value={n}>
                  {n === 0 ? "só este mês" : `${n} meses`}
                </option>
              ))}
            </select>
          </label>

          <button
            onClick={salvar}
            disabled={ocupado}
            className="ml-auto rounded-full bg-primary px-5 py-2 text-[13px] font-medium text-primary-foreground disabled:opacity-40"
          >
            {ocupado ? "Salvando…" : "Salvar orçamento"}
          </button>
        </div>

        {mensagem && <p className="mt-3 text-[12px] text-acao">{mensagem}</p>}
      </Cartao>

      <Cartao titulo="Plano por categoria">
        {dados && dados.linhas.length === 0 && Object.keys(rascunho).length === 0 && (
          <Vazio
            titulo="Nenhum limite definido"
            texto="Use seu histórico ou defina um valor por categoria."
          />
        )}

        <div className="space-y-2">
          {dados?.linhas.map((linha) => (
            <div key={linha.categoriaId} className="rounded-2xl border border-pauta bg-papel-2 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <SimboloCategoria categoria={linha.categoria}/><span className="min-w-0 flex-1 text-sm font-semibold">{linha.categoria.nome}</span>
                <span className={cn("text-sm tabular-nums", linha.estourou ? "text-negativo" : "text-muted-fg")}>
                  {formatarMoeda(linha.gastoCentavos)}
                </span>
                <span className="text-[12px] text-muted-fg">de</span>
                <input
                  aria-label={`Orçamento de ${linha.categoria.nome}`}
                  value={rascunho[linha.categoriaId] ?? ""}
                  onChange={(evento) =>
                    setRascunho((atual) => ({ ...atual, [linha.categoriaId]: evento.target.value }))
                  }
                  className={campo}
                  inputMode="decimal"
                />
                <button
                  onClick={() =>
                    setRascunho((atual) => ({ ...atual, [linha.categoriaId]: "0" }))
                  }
                  className="grid size-11 place-items-center text-muted-fg transition hover:text-negativo"
                  aria-label={`Zerar orçamento de ${linha.categoria.nome}`}
                  title="zerar limite"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>

              <div className="mt-2">
                <Barra percentual={linha.percentual} />
              </div>
              <p className="mt-1 text-[11px] text-muted-fg">
                {linha.estourou
                  ? `Passou ${formatarMoeda(-linha.restanteCentavos)} do limite.`
                  : `Restam ${formatarMoeda(linha.restanteCentavos)}. ${linha.percentual}% usado.`}
              </p>
            </div>
          ))}
        </div>

        {dados && dados.semOrcamento.length > 0 && (
          <div className="mt-5">
            <p className="text-[11px] uppercase tracking-widest text-muted-fg">
              Gastou e não estava no plano
            </p>
            <div className="mt-2 space-y-2">
              {dados.semOrcamento.map((linha) => (
                <div
                  key={linha.categoria.id}
                  className="flex flex-wrap items-center gap-3 rounded-2xl border border-dashed border-pauta p-3"
                >
                  <SimboloCategoria categoria={linha.categoria}/><span className="min-w-0 flex-1 text-sm font-semibold">{linha.categoria.nome}</span>
                  <span className="text-sm tabular-nums text-atencao">
                    {formatarMoeda(linha.gastoCentavos)}
                  </span>
                  <input
                    value={rascunho[linha.categoria.id] ?? ""}
                    onChange={(evento) =>
                      setRascunho((atual) => ({ ...atual, [linha.categoria.id]: evento.target.value }))
                    }
                    placeholder="definir limite"
                    className={cn(campo, "w-32")}
                    inputMode="decimal"
                  />
                </div>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-muted-fg">
              São as categorias em que o estouro nasce: dinheiro saiu sem limite definido.
            </p>
          </div>
        )}
      </Cartao>
    </div>
  )
}
