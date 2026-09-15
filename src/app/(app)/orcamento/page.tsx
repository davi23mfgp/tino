"use client"

import { useCallback, useEffect, useState } from "react"
import { Sparkles, Trash2 } from "lucide-react"

import { buscar, enviar } from "@/lib/cliente"
import { competenciaAtual, rotuloCompetencia, ultimasCompetencias, competenciaMaisMeses } from "@/lib/datas"
import { formatarMoeda, paraCentavos } from "@/lib/dinheiro"
import { Barra, Cartao, Metrica, Vazio } from "@/components/ui/painel"
import { Abertura } from "@/components/abertura"
import { SelectNative } from "@/components/ui/select-native"
import { SimboloCategoria } from "@/components/seletor-categoria"
import { OrcamentoCasal } from "@/components/orcamento-casal"
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
  const estourados = dados?.linhas.filter((linha) => linha.estourou) ?? []
  const usado = limitePlanejado > 0 ? Math.round((gasto / limitePlanejado) * 100) : 0
  // A categoria que mais passou do limite, em reais — é ela que responde
  // "onde está o problema", não a contagem de quantas estouraram.
  const pior = [...estourados].sort((a, b) => (b.gastoCentavos - b.limiteCentavos) - (a.gastoCentavos - a.limiteCentavos))[0]
  const diasQueFaltam = (() => {
    const [ano, mes] = competencia.split("-").map(Number)
    const hoje = new Date()
    const mesmoMes = hoje.getFullYear() === ano && hoje.getMonth() + 1 === mes
    if (!mesmoMes) return null
    return new Date(ano, mes, 0).getDate() - hoje.getDate()
  })()

  return (
    <div className="space-y-4">
      {/* A tela abria pelo seletor de competência: filtro antes de resposta.
          Agora ela diz quanto do plano já foi embora e onde está o estouro —
          o seletor continua, no lugar de controle do cartão abaixo. */}
      <Abertura
        rotulo={`Orçamento de ${rotuloCompetencia(competencia)}`}
        titulo={
          limitePlanejado === 0 ? (
            <>Você ainda não definiu um orçamento para este mês.</>
          ) : diasQueFaltam !== null ? (
            <>Você usou <em>{usado}%</em> do orçamento com {diasQueFaltam} {diasQueFaltam === 1 ? "dia" : "dias"} pela frente.</>
          ) : (
            <>Você usou <em>{usado}%</em> do orçamento deste mês.</>
          )
        }
        apoio={
          pior ? (
            <><b>{pior.categoria.nome}</b> passou {formatarMoeda(pior.gastoCentavos - pior.limiteCentavos)} do limite.</>
          ) : limitePlanejado > 0 ? (
            <>Nenhuma categoria estourou. Sobram {formatarMoeda(limitePlanejado - gasto)} do plano.</>
          ) : undefined
        }
      />

      <Cartao
        titulo="Orçamento"
        acao={
          <select
            value={competencia}
            onChange={(evento) => setCompetencia(evento.target.value)}
            className="rounded-full border border-pauta bg-background px-3 py-1.5 text-[calc(12px*var(--escala-letra))]"
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
            valor={String(estourados.length)}
            tom={estourados.length > 0 ? "atencao" : "neutro"}
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
            className="flex min-h-11 items-center gap-2 rounded-full border border-pauta px-5 text-[calc(14px*var(--escala-letra))] font-medium transition hover:border-acao/40 hover:text-acao disabled:opacity-40"
          >
            <Sparkles className="size-3.5" />
            Usar meu histórico
          </button>

          <label className="flex min-h-11 items-center gap-2 text-[calc(14px*var(--escala-letra))] text-muted-fg">
            Repetir por
            <SelectNative
              tamanho="pilula"
              value={String(repetir)}
              onChange={(evento) => setRepetir(Number(evento.target.value))}
              className="w-auto min-w-[150px] text-[calc(14px*var(--escala-letra))]"
            >
              {[0, 2, 5, 11].map((n) => (
                <option key={n} value={n}>
                  {n === 0 ? "só este mês" : `${n} meses`}
                </option>
              ))}
            </SelectNative>
          </label>

          <button
            onClick={salvar}
            disabled={ocupado}
            className="ml-auto rounded-full bg-primary px-5 py-2 text-[calc(13px*var(--escala-letra))] font-medium text-primary-foreground disabled:opacity-40"
          >
            {ocupado ? "Salvando…" : "Salvar orçamento"}
          </button>
        </div>

        {mensagem && <p className="mt-3 text-[calc(12px*var(--escala-letra))] text-acao">{mensagem}</p>}
      </Cartao>

      <OrcamentoCasal gastoComumCentavos={dados?.linhas.reduce((soma, linha) => soma + linha.gastoCentavos, 0) ?? 0} />

      <Cartao titulo="Plano por categoria">
        {dados && dados.linhas.length === 0 && Object.keys(rascunho).length === 0 && (
          <Vazio
            titulo="Nenhum limite definido"
            texto="Use seu histórico ou defina um valor por categoria."
          />
        )}

        <div className="space-y-2">
          {dados?.linhas.map((linha) => (
            <div key={linha.categoriaId} className="vidro-menu rounded-2xl p-3">
              {/* Era um flex de cinco itens que embaralhava no celular: nome e
                  valor se sobrepunham e a lixeira caia sozinha numa linha.
                  Agora e grade: identidade em cima, numeros embaixo. */}
              <div className="flex items-center gap-2.5">
                <SimboloCategoria categoria={linha.categoria} />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{linha.categoria.nome}</span>
                <button
                  onClick={() => setRascunho((atual) => ({ ...atual, [linha.categoriaId]: "0" }))}
                  className="grid size-8 shrink-0 place-items-center rounded-full text-muted-fg transition hover:text-negativo"
                  aria-label={`Zerar orçamento de ${linha.categoria.nome}`}
                  title="zerar limite"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>

              <div className="mt-2 flex items-center gap-3">
                <span className="min-w-0 flex-1">
                  <b className={cn("numero block text-[calc(15px*var(--escala-letra))] font-semibold", linha.estourou && "text-negativo")}>
                    {formatarMoeda(linha.gastoCentavos)}
                  </b>
                  <small className="text-[calc(12px*var(--escala-letra))] text-muted-fg">gastos</small>
                </span>
                <label className="flex shrink-0 items-center gap-1 rounded-full border border-pauta bg-background px-3 focus-within:border-acao">
                  <span className="text-[max(10px,calc(12px*var(--escala-letra)))] text-muted-fg">limite</span>
                  <input
                    aria-label={`Orçamento de ${linha.categoria.nome}`}
                    value={rascunho[linha.categoriaId] ?? ""}
                    onChange={(evento) => setRascunho((atual) => ({ ...atual, [linha.categoriaId]: evento.target.value }))}
                    className="h-10 w-20 border-0 bg-transparent text-right text-[calc(14px*var(--escala-letra))] font-semibold tabular-nums outline-none"
                    inputMode="decimal"
                    placeholder="0,00"
                  />
                </label>
              </div>

              <div className="mt-2">
                <Barra percentual={linha.percentual} />
              </div>
              {/* Etiqueta, nao frase: "restam X" e "passou X" dizem tudo. */}
              <p className={cn("mt-1 text-[max(10px,calc(12px*var(--escala-letra)))]", linha.estourou ? "text-negativo" : "text-muted-fg")}>
                {linha.estourou
                  ? `passou ${formatarMoeda(-linha.restanteCentavos)}`
                  : `restam ${formatarMoeda(linha.restanteCentavos)} · ${linha.percentual}%`}
              </p>
            </div>
          ))}
        </div>

        {dados && dados.semOrcamento.length > 0 && (
          <div className="mt-5">
            <p className="text-[calc(12px*var(--escala-letra))] text-muted-fg">
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
            <p className="mt-2 text-[max(10px,calc(12px*var(--escala-letra)))] text-muted-fg">
              São as categorias em que o estouro nasce: dinheiro saiu sem limite definido.
            </p>
          </div>
        )}
      </Cartao>
    </div>
  )
}
