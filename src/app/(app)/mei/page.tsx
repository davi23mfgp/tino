"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Plus } from "lucide-react"

import { buscar, enviar } from "@/lib/cliente"
import { competenciaAtual, rotuloCompetencia } from "@/lib/datas"
import { formatarMoeda, paraCentavos } from "@/lib/dinheiro"
import { Barra, Cartao, Metrica, Valor, Vazio } from "@/components/ui/painel"

/**
 * MEI.
 *
 * A tela responde duas perguntas: quanto ainda cabe no limite do ano e quais
 * DAS estão em aberto. O lançamento de faturamento fica na mesma tela porque
 * sem ele as duas respostas viram chute — e chute exibido como fato é o que
 * mais estraga a confiança nesta tela.
 */

interface Competencia {
  id: string
  competencia: string
  receitaComercioCentavos: number
  receitaServicosCentavos: number
  dasPago: boolean
  dasValorCentavos: number
  observacao: string | null
}

interface Situacao {
  risco: string
  faturamentoAnoCentavos: number
  percentualUsado: number
  disponivelCentavos: number
  mediaMensalCentavos: number
  tetoMensalRestanteCentavos: number
  mesQueEstoura: string | null
}

interface Resposta {
  ativo: boolean
  perfil?: {
    dasMensalCentavos: number
    diaVencimentoDas: number
    proLaboreCentavos: number
    limiteAnualEfetivoCentavos: number
    limiteProporcional: boolean
  }
  competencias?: Competencia[]
  situacao?: Situacao
}

const AVISO_RISCO: Record<string, { texto: string; tom: string }> = {
  OK: { texto: "Faturamento dentro do limite.", tom: "border-pauta bg-papel-2" },
  ATENCAO: {
    texto: "No ritmo atual o limite anual pode estourar. Vale segurar o faturamento ou já se preparar para migrar de regime.",
    tom: "border-atencao/40 bg-atencao/10 text-atencao",
  },
  ESTOURO_ATE_20: {
    texto:
      "O limite foi ultrapassado em até 20%. O imposto sobre o excedente é recolhido e o desenquadramento passa a valer em janeiro do ano seguinte. Confirme os detalhes com seu contador.",
    tom: "border-negativo/40 bg-negativo/10 text-negativo",
  },
  ESTOURO_ACIMA_20: {
    texto:
      "O limite foi ultrapassado em mais de 20%. Nesse patamar o desenquadramento é retroativo ao início do ano. Procure um contador com urgência.",
    tom: "border-negativo/50 bg-negativo/15 text-negativo",
  },
}

const campo = "rounded-[var(--raio-campo)] border border-pauta bg-background px-3.5 py-2.5 text-[13px] outline-none focus:border-acao/50"

const VAZIO = { competencia: competenciaAtual(), comercio: "", servicos: "", dasPago: false, dasValor: "", observacao: "" }

export default function Mei() {
  const router = useRouter()
  const [dados, setDados] = useState<Resposta | null>(null)
  const [lancamento, setLancamento] = useState(VAZIO)
  const [abrirForm, setAbrirForm] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    const resposta = await buscar<Resposta>("/api/mei")
    // Sem perfil não há o que mostrar: o modo MEI se liga nas configurações.
    if (!resposta.ativo) router.replace("/configuracoes")
    else setDados(resposta)
  }, [router])

  useEffect(() => {
    carregar()
  }, [carregar])

  /** Abre o formulário já preenchido com o que existe naquele mês. */
  function editar(linha: Competencia) {
    setLancamento({
      competencia: linha.competencia,
      comercio: linha.receitaComercioCentavos ? formatarMoeda(linha.receitaComercioCentavos, false) : "",
      servicos: linha.receitaServicosCentavos ? formatarMoeda(linha.receitaServicosCentavos, false) : "",
      dasPago: linha.dasPago,
      dasValor: linha.dasValorCentavos ? formatarMoeda(linha.dasValorCentavos, false) : "",
      observacao: linha.observacao ?? "",
    })
    setAbrirForm(true)
  }

  async function salvar(evento: React.FormEvent) {
    evento.preventDefault()
    setOcupado(true)
    setErro(null)

    try {
      await enviar("/api/mei", {
        competencia: lancamento.competencia,
        receitaComercioCentavos: paraCentavos(lancamento.comercio),
        receitaServicosCentavos: paraCentavos(lancamento.servicos),
        dasPago: lancamento.dasPago,
        dasValorCentavos: paraCentavos(lancamento.dasValor),
        observacao: lancamento.observacao || undefined,
      })
      setLancamento(VAZIO)
      setAbrirForm(false)
      await carregar()
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não consegui salvar o lançamento.")
    } finally {
      setOcupado(false)
    }
  }

  /**
   * Baixa do DAS.
   *
   * O POST é upsert e substitui a competência inteira, então o faturamento já
   * lançado é reenviado junto — omitir zeraria a receita do mês.
   */
  async function darBaixa(linha: Competencia) {
    setOcupado(true)
    setErro(null)

    try {
      await enviar("/api/mei", {
        competencia: linha.competencia,
        receitaComercioCentavos: linha.receitaComercioCentavos,
        receitaServicosCentavos: linha.receitaServicosCentavos,
        dasPago: true,
        // Sem valor lançado na competência, registra o DAS do perfil — que é o
        // que de fato foi cobrado. Divergindo, o usuário corrige no formulário.
        dasValorCentavos: linha.dasValorCentavos || dados?.perfil?.dasMensalCentavos || 0,
        observacao: linha.observacao ?? undefined,
      })
      await carregar()
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não consegui dar baixa no DAS.")
    } finally {
      setOcupado(false)
    }
  }

  const perfil = dados?.perfil
  const situacao = dados?.situacao
  const competencias = dados?.competencias ?? []
  const agora = competenciaAtual()
  const emAberto = competencias.filter((linha) => !linha.dasPago && linha.competencia < agora)
  const aviso = AVISO_RISCO[situacao?.risco ?? "OK"] ?? AVISO_RISCO.OK
  const ano = Number(agora.slice(0, 4))

  return (
    <div className="space-y-4">
      <Cartao titulo={`Faturamento ${ano}`}>
        <Valor>{formatarMoeda(situacao?.faturamentoAnoCentavos ?? 0)}</Valor>
        <p className="mt-1 text-sm text-muted-fg">
          de {formatarMoeda(perfil?.limiteAnualEfetivoCentavos ?? 0)} de limite
          {perfil?.limiteProporcional && " (proporcional aos meses de atividade neste primeiro ano)"}
        </p>

        <div className="mt-4">
          <Barra percentual={situacao?.percentualUsado ?? 0} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metrica rotulo="Usado" valor={`${situacao?.percentualUsado ?? 0}%`} />
          <Metrica rotulo="Ainda cabe" valor={formatarMoeda(situacao?.disponivelCentavos ?? 0)} tom="positivo" />
          <Metrica rotulo="Média mensal" valor={formatarMoeda(situacao?.mediaMensalCentavos ?? 0)} />
          <Metrica
            rotulo="Teto por mês"
            valor={formatarMoeda(situacao?.tetoMensalRestanteCentavos ?? 0)}
            detalhe="para fechar o ano dentro do limite"
          />
        </div>

        <p className={`mt-4 rounded-2xl border p-3 text-sm ${aviso.tom}`}>
          {aviso.texto}
          {situacao?.mesQueEstoura && situacao.risco === "ATENCAO" && (
            <> No ritmo de hoje, o limite estoura em {rotuloCompetencia(situacao.mesQueEstoura)}.</>
          )}
        </p>
      </Cartao>

      <div className="grid gap-4 lg:grid-cols-2">
        <Cartao titulo="DAS">
          <Valor tamanho="medio">{formatarMoeda(perfil?.dasMensalCentavos ?? 0)}</Valor>
          <p className="mt-1 text-sm text-muted-fg">
            por mês, vencendo todo dia {perfil?.diaVencimentoDas ?? "—"}.
          </p>

          {emAberto.length > 0 ? (
            <div className="mt-4 space-y-2 rounded-2xl border border-negativo/40 bg-negativo/10 p-3">
              <p className="text-sm font-medium text-negativo">{emAberto.length} DAS em aberto</p>
              <p className="text-xs text-negativo/80">
                Atraso gera multa e juros, e o mês não conta para a aposentadoria enquanto não for pago.
              </p>
              {emAberto.map((linha) => (
                <div key={linha.id} className="flex items-center justify-between gap-3 text-sm">
                  <span>{rotuloCompetencia(linha.competencia, true)}</span>
                  <button
                    onClick={() => darBaixa(linha)}
                    disabled={ocupado}
                    className="flex items-center gap-1.5 rounded-full border border-positivo/40 px-3 py-1 text-[12px] text-positivo disabled:opacity-50"
                  >
                    <Check className="size-3.5" /> dar baixa
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-positivo">DAS em dia.</p>
          )}
        </Cartao>

        <Cartao titulo="Separação PF e PJ">
          <p className="text-sm text-muted-fg">
            Pró-labore registrado: {formatarMoeda(perfil?.proLaboreCentavos ?? 0)} por mês.
          </p>
          <p className="mt-2 text-sm text-muted-fg">
            Misturar dinheiro do CNPJ com o pessoal é o erro que mais complica MEI: o faturamento vira estimativa e o
            limite anual deixa de ser confiável. Mantenha a conta PJ separada e transfira para a conta pessoal só o
            pró-labore.
          </p>
        </Cartao>
      </div>

      <Cartao
        titulo="Competências"
        acao={
          <button
            onClick={() => {
              setLancamento(VAZIO)
              setAbrirForm((atual) => !atual)
            }}
            className="flex items-center gap-1.5"
          >
            <Plus className="size-3.5" /> lançar mês
          </button>
        }
      >
        {abrirForm && (
          <form onSubmit={salvar} className="mb-4 grid gap-3 rounded-[var(--raio-cartao)] border border-pauta bg-papel-2 p-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-[12px] text-muted-fg">
              competência
              <input
                type="month"
                required
                value={lancamento.competencia}
                onChange={(evento) => setLancamento({ ...lancamento, competencia: evento.target.value })}
                className={campo}
              />
            </label>

            <label className="flex flex-col gap-1.5 text-[12px] text-muted-fg">
              receita de comércio
              <input
                inputMode="decimal"
                placeholder="0,00"
                value={lancamento.comercio}
                onChange={(evento) => setLancamento({ ...lancamento, comercio: evento.target.value })}
                className={campo}
              />
            </label>

            <label className="flex flex-col gap-1.5 text-[12px] text-muted-fg">
              receita de serviços
              <input
                inputMode="decimal"
                placeholder="0,00"
                value={lancamento.servicos}
                onChange={(evento) => setLancamento({ ...lancamento, servicos: evento.target.value })}
                className={campo}
              />
            </label>

            <label className="flex flex-col gap-1.5 text-[12px] text-muted-fg">
              valor do DAS
              <input
                inputMode="decimal"
                placeholder="0,00"
                value={lancamento.dasValor}
                onChange={(evento) => setLancamento({ ...lancamento, dasValor: evento.target.value })}
                className={campo}
              />
            </label>

            <label className="flex flex-col gap-1.5 text-[12px] text-muted-fg sm:col-span-2">
              observação
              <input
                value={lancamento.observacao}
                onChange={(evento) => setLancamento({ ...lancamento, observacao: evento.target.value })}
                className={campo}
              />
            </label>

            <label className="flex items-center gap-2 text-[13px]">
              <input
                type="checkbox"
                checked={lancamento.dasPago}
                onChange={(evento) => setLancamento({ ...lancamento, dasPago: evento.target.checked })}
              />
              DAS já pago
            </label>

            <div className="flex items-center justify-end gap-3 sm:col-span-2">
              <button type="button" onClick={() => setAbrirForm(false)} className="text-[13px] text-muted-fg">
                cancelar
              </button>
              <button
                type="submit"
                disabled={ocupado}
                className="rounded-full bg-acao px-4 py-2 text-[13px] font-medium text-primary-foreground disabled:opacity-50"
              >
                salvar
              </button>
            </div>

            {erro && <p className="text-[13px] text-negativo sm:col-span-2">{erro}</p>}
          </form>
        )}

        {competencias.length === 0 ? (
          <Vazio titulo="Nenhuma competência lançada" texto="Registre o faturamento de cada mês para o acompanhamento do limite." />
        ) : (
          <div className="divide-y divide-pauta">
            {[...competencias]
              .sort((a, b) => b.competencia.localeCompare(a.competencia))
              .map((linha) => {
                const total = linha.receitaComercioCentavos + linha.receitaServicosCentavos
                return (
                  <button
                    key={linha.id}
                    onClick={() => editar(linha)}
                    className="flex w-full items-center justify-between py-3 text-left text-sm"
                  >
                    <span>{rotuloCompetencia(linha.competencia)}</span>
                    <span className="text-muted-fg">{formatarMoeda(total)}</span>
                    <span className={linha.dasPago ? "text-positivo" : "text-atencao"}>
                      {linha.dasPago ? "DAS pago" : "DAS pendente"}
                    </span>
                  </button>
                )
              })}
          </div>
        )}
      </Cartao>
    </div>
  )
}
