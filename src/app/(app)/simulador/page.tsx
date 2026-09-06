"use client"

import { useCallback, useEffect, useState } from "react"
import { Plus, RotateCcw, Trash2 } from "lucide-react"

import { buscar, enviar } from "@/lib/cliente"
import { competenciaAtual, competenciaMaisMeses, rotuloCompetencia } from "@/lib/datas"
import { formatarMoeda, formatarMoedaCurta, paraCentavos } from "@/lib/dinheiro"
import { cn } from "@/lib/utils"
import { Cartao, Metrica, Vazio } from "@/components/ui/painel"
import { GraficoFluxo } from "@/components/graficos"

/**
 * Simulador de cenários.
 *
 * A tela é montada em torno da comparação: à esquerda as hipóteses, à direita
 * o antes e o depois lado a lado. Mostrar só o resultado simulado esconderia
 * justamente o que interessa — a diferença entre agir e não agir.
 */

interface Mes {
  competencia: string
  receitasCentavos: number
  custoDeVidaCentavos: number
  parcelasCentavos: number
  parcelasDividaCentavos: number
  jurosCentavos: number
  pagamentoExtraCentavos: number
  aporteMetaCentavos: number
  resultadoCentavos: number
  saldoAcumuladoCentavos: number
  dividaRestanteCentavos: number
  patrimonioLiquidoCentavos: number
  eventos: string[]
}

interface Resultado {
  meses: Mes[]
  saldoFinalCentavos: number
  patrimonioFinalCentavos: number
  totalJurosCentavos: number
  primeiroMesNegativo: string | null
  mesQuitacao: string | null
  menorSaldoCentavos: number
}

interface Comparacao {
  base: Resultado
  cenario: Resultado
  delta: {
    saldoFinalCentavos: number
    patrimonioFinalCentavos: number
    jurosCentavos: number
    mesesQuitacaoAntes: number | null
    mudouRiscoNegativo: "EVITA" | "PROVOCA" | "IGUAL"
  }
  veredito: string[]
  entrada: {
    rendaMensalCentavos: number
    custoDeVidaMensalCentavos: number
    saldoInicialCentavos: number
    dividas: { id: string; nome: string; saldoCentavos: number; jurosMensalBps: number }[]
  }
}

type TipoAjuste =
  | "RENDA"
  | "CUSTO"
  | "GASTO_UNICO"
  | "RECEITA_UNICA"
  | "NOVA_COMPRA_PARCELADA"
  | "NOVO_EMPRESTIMO"
  | "QUITAR_DIVIDA"
  | "PAGAMENTO_EXTRA"

interface Hipotese {
  id: number
  tipo: TipoAjuste
  rotulo: string
  valor: string
  parcelas: string
  juros: string
  competencia: string
  dividaId: string
}

const MODELOS: { tipo: TipoAjuste; titulo: string; texto: string }[] = [
  { tipo: "CUSTO", titulo: "Cortar gasto", texto: "Quanto a menos por mês" },
  { tipo: "RENDA", titulo: "Mudar renda", texto: "Aumento ou queda mensal" },
  { tipo: "PAGAMENTO_EXTRA", titulo: "Pagar dívida mais rápido", texto: "Valor extra por mês" },
  { tipo: "NOVA_COMPRA_PARCELADA", titulo: "Comprar parcelado", texto: "Valor total e número de parcelas" },
  { tipo: "NOVO_EMPRESTIMO", titulo: "Pegar empréstimo", texto: "Valor, prazo e juros" },
  { tipo: "QUITAR_DIVIDA", titulo: "Quitar uma dívida", texto: "Pagamento à vista" },
  { tipo: "GASTO_UNICO", titulo: "Gasto único", texto: "Viagem, conserto, IPVA" },
  { tipo: "RECEITA_UNICA", titulo: "Entrada única", texto: "13º, bônus, venda" },
]

const campo = "w-full rounded-[var(--raio-campo)] border border-pauta bg-background px-3.5 py-2.5 text-[13px] outline-none focus:border-acao/50"

export default function Simulador() {
  const [comparacao, setComparacao] = useState<Comparacao | null>(null)
  const [hipoteses, setHipoteses] = useState<Hipotese[]>([])
  const [meses, setMeses] = useState(24)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const inicial = competenciaAtual()

  const rodar = useCallback(
    async (lista: Hipotese[], janela: number) => {
      setCarregando(true)
      setErro(null)

      try {
        const ajustes = lista
          .filter((hipotese) => hipotese.valor || hipotese.tipo === "QUITAR_DIVIDA")
          .map((hipotese) => {
            const valorCentavos = paraCentavos(hipotese.valor || "0")
            const base = { rotulo: hipotese.rotulo || "Hipótese" }

            switch (hipotese.tipo) {
              case "RENDA":
                return { ...base, tipo: "RENDA" as const, deltaCentavos: valorCentavos, aPartirDe: hipotese.competencia }
              case "CUSTO":
                // Corte de gasto é digitado como número positivo e vira delta
                // negativo: pedir para digitar "-500" é onde a pessoa erra.
                return { ...base, tipo: "CUSTO" as const, deltaCentavos: -Math.abs(valorCentavos), aPartirDe: hipotese.competencia }
              case "GASTO_UNICO":
                return { ...base, tipo: "GASTO_UNICO" as const, valorCentavos, competencia: hipotese.competencia }
              case "RECEITA_UNICA":
                return { ...base, tipo: "RECEITA_UNICA" as const, valorCentavos, competencia: hipotese.competencia }
              case "NOVA_COMPRA_PARCELADA":
                return {
                  ...base,
                  tipo: "NOVA_COMPRA_PARCELADA" as const,
                  valorTotalCentavos: valorCentavos,
                  parcelas: Number(hipotese.parcelas) || 1,
                  competenciaInicial: hipotese.competencia,
                }
              case "NOVO_EMPRESTIMO":
                return {
                  ...base,
                  tipo: "NOVO_EMPRESTIMO" as const,
                  valorCentavos,
                  parcelas: Number(hipotese.parcelas) || 12,
                  jurosMensalBps: Math.round(Number((hipotese.juros || "2").replace(",", ".")) * 100),
                  competencia: hipotese.competencia,
                }
              case "QUITAR_DIVIDA":
                return {
                  ...base,
                  tipo: "QUITAR_DIVIDA" as const,
                  dividaId: hipotese.dividaId,
                  competencia: hipotese.competencia,
                }
              default:
                return {
                  ...base,
                  tipo: "PAGAMENTO_EXTRA" as const,
                  valorMensalCentavos: valorCentavos,
                  aPartirDe: hipotese.competencia,
                }
            }
          })

        setComparacao(await enviar<Comparacao>("/api/simulador", { ajustes, meses: janela }))
      } catch (excecao) {
        setErro(excecao instanceof Error ? excecao.message : "Não consegui simular.")
      } finally {
        setCarregando(false)
      }
    },
    [],
  )

  useEffect(() => {
    buscar<Comparacao>(`/api/simulador?meses=${meses}`)
      .then(setComparacao)
      .catch((excecao) => setErro(excecao.message))
      .finally(() => setCarregando(false))
    // Só na montagem: as rodadas seguintes passam pelo botão de simular.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function adicionar(tipo: TipoAjuste) {
    const modelo = MODELOS.find((item) => item.tipo === tipo)
    setHipoteses((atual) => [
      ...atual,
      {
        id: Date.now(),
        tipo,
        rotulo: modelo?.titulo ?? "Hipótese",
        valor: "",
        parcelas: "12",
        juros: "2,0",
        competencia: inicial,
        dividaId: comparacao?.entrada.dividas[0]?.id ?? "",
      },
    ])
  }

  const atualizar = (id: number, mudanca: Partial<Hipotese>) =>
    setHipoteses((atual) => atual.map((item) => (item.id === id ? { ...item, ...mudanca } : item)))

  const cenario = comparacao?.cenario
  const base = comparacao?.base
  const temHipotese = hipoteses.length > 0
  const temDivida = (comparacao?.entrada.dividas.length ?? 0) > 0
  const maiorValor = Math.max(
    1,
    ...(cenario?.meses ?? []).map((mes) => Math.abs(mes.saldoAcumuladoCentavos)),
    ...(base?.meses ?? []).map((mes) => Math.abs(mes.saldoAcumuladoCentavos)),
  )

  return (
    <div className="space-y-4">
      <Cartao
        titulo="Simulador de cenários"
        acao={
          <select
            value={meses}
            onChange={(evento) => {
              const janela = Number(evento.target.value)
              setMeses(janela)
              rodar(hipoteses, janela)
            }}
            className="rounded-full border border-pauta bg-background px-3 py-1.5 text-[12px]"
          >
            {[12, 24, 36, 60].map((opcao) => (
              <option key={opcao} value={opcao}>
                {opcao} meses
              </option>
            ))}
          </select>
        }
      >
        <p className="text-[13px] leading-relaxed text-muted-fg">
          Monte hipóteses e veja o efeito no seu caixa mês a mês. Tudo parte dos seus números reais: renda de{" "}
          {formatarMoeda(comparacao?.entrada.rendaMensalCentavos ?? 0)}, custo de vida de{" "}
          {formatarMoeda(comparacao?.entrada.custoDeVidaMensalCentavos ?? 0)} e saldo de{" "}
          {formatarMoeda(comparacao?.entrada.saldoInicialCentavos ?? 0)}.
        </p>

        {comparacao && comparacao.entrada.rendaMensalCentavos === 0 && (
          <p className="mt-3 rounded-2xl border border-atencao/40 bg-atencao/10 p-3 text-[13px] text-atencao">
            Ainda não sei sua renda nem seus gastos, então a simulação parte do zero. Responda a conversa inicial em
            Configurações ou importe um extrato para os números ficarem seus.
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {MODELOS.map((modelo) => (
            <button
              key={modelo.tipo}
              onClick={() => adicionar(modelo.tipo)}
              className="flex items-center gap-1.5 rounded-full border border-pauta px-3.5 py-2 text-[12px] transition hover:border-acao/40 hover:text-acao"
            >
              <Plus className="size-3.5" />
              {modelo.titulo}
            </button>
          ))}
        </div>
      </Cartao>

      {temHipotese && (
        <Cartao titulo="Suas hipóteses">
          <div className="space-y-3">
            {hipoteses.map((hipotese) => (
              <div key={hipotese.id} className="rounded-[var(--raio-cartao)] border border-pauta bg-papel-2 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <input
                    value={hipotese.rotulo}
                    onChange={(evento) => atualizar(hipotese.id, { rotulo: evento.target.value })}
                    className="min-w-0 flex-1 bg-transparent text-[14px] font-medium outline-none"
                  />
                  <button
                    onClick={() => setHipoteses((atual) => atual.filter((item) => item.id !== hipotese.id))}
                    className="text-muted-fg transition hover:text-negativo"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  {hipotese.tipo === "QUITAR_DIVIDA" ? (
                    <select
                      value={hipotese.dividaId}
                      onChange={(evento) => atualizar(hipotese.id, { dividaId: evento.target.value })}
                      className={cn(campo, "sm:col-span-2")}
                    >
                      {comparacao?.entrada.dividas.map((divida) => (
                        <option key={divida.id} value={divida.id}>
                          {divida.nome} ({formatarMoeda(divida.saldoCentavos)})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={hipotese.valor}
                      onChange={(evento) => atualizar(hipotese.id, { valor: evento.target.value })}
                      placeholder={
                        hipotese.tipo === "CUSTO"
                          ? "quanto cortar por mês"
                          : hipotese.tipo === "RENDA"
                            ? "quanto a mais por mês"
                            : hipotese.tipo === "PAGAMENTO_EXTRA"
                              ? "extra por mês na dívida"
                              : "valor"
                      }
                      className={campo}
                      inputMode="decimal"
                    />
                  )}

                  {(hipotese.tipo === "NOVA_COMPRA_PARCELADA" || hipotese.tipo === "NOVO_EMPRESTIMO") && (
                    <input
                      value={hipotese.parcelas}
                      onChange={(evento) => atualizar(hipotese.id, { parcelas: evento.target.value })}
                      placeholder="parcelas"
                      className={campo}
                      inputMode="numeric"
                    />
                  )}

                  {hipotese.tipo === "NOVO_EMPRESTIMO" && (
                    <input
                      value={hipotese.juros}
                      onChange={(evento) => atualizar(hipotese.id, { juros: evento.target.value })}
                      placeholder="juros % ao mês"
                      className={campo}
                      inputMode="decimal"
                    />
                  )}

                  <select
                    value={hipotese.competencia}
                    onChange={(evento) => atualizar(hipotese.id, { competencia: evento.target.value })}
                    className={campo}
                  >
                    {Array.from({ length: 13 }, (_, indice) => competenciaMaisMeses(inicial, indice)).map((mes) => (
                      <option key={mes} value={mes}>
                        a partir de {rotuloCompetencia(mes, true)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={() => rodar(hipoteses, meses)}
              disabled={carregando}
              className="rounded-full bg-primary px-5 py-2.5 text-[13px] font-medium text-primary-foreground disabled:opacity-40"
            >
              {carregando ? "Calculando…" : "Simular"}
            </button>
            <button
              onClick={() => {
                setHipoteses([])
                rodar([], meses)
              }}
              className="flex items-center gap-1.5 rounded-full border border-pauta px-4 py-2.5 text-[13px] text-muted-fg transition hover:text-foreground"
            >
              <RotateCcw className="size-3.5" />
              limpar
            </button>
          </div>
        </Cartao>
      )}

      {erro && <Cartao><p className="text-[13px] text-negativo">{erro}</p></Cartao>}

      {comparacao && cenario && base && (
        <>
          <Cartao titulo={temHipotese ? "Com as hipóteses, comparado a hoje" : "Seu cenário atual"}>
            <div className="grid gap-3 sm:grid-cols-4">
              <Metrica
                rotulo="Patrimônio em"
                valor={formatarMoeda(cenario.patrimonioFinalCentavos)}
                detalhe={`${meses} meses (saldo menos dívidas)`}
                tom={cenario.patrimonioFinalCentavos >= 0 ? "positivo" : "negativo"}
              />
              <Metrica
                rotulo="Saldo em conta"
                valor={formatarMoeda(cenario.saldoFinalCentavos)}
                tom={cenario.saldoFinalCentavos >= 0 ? "neutro" : "negativo"}
              />
              <Metrica
                rotulo="Juros no caminho"
                valor={formatarMoeda(cenario.totalJurosCentavos)}
                tom={cenario.totalJurosCentavos > 0 ? "atencao" : "neutro"}
              />
              {/* Sem dívida nenhuma, "não no período" soaria como problema —
                  é o oposto: não há o que quitar. */}
              <Metrica
                rotulo="Dívidas acabam"
                valor={
                  temDivida
                    ? cenario.mesQuitacao
                      ? rotuloCompetencia(cenario.mesQuitacao, true)
                      : "não no período"
                    : "sem dívidas"
                }
                tom={!temDivida || cenario.mesQuitacao ? "positivo" : "atencao"}
              />
            </div>

            {temHipotese && (
              <div className="mt-4 space-y-1.5">
                {comparacao.veredito.map((frase) => (
                  <p key={frase} className="text-[13px] leading-relaxed">
                    {frase}
                  </p>
                ))}
              </div>
            )}

            {cenario.primeiroMesNegativo && (
              <p className="mt-4 rounded-2xl border border-negativo/40 bg-negativo/10 p-3 text-[13px] text-negativo">
                O caixa fica negativo em {rotuloCompetencia(cenario.primeiroMesNegativo)} — é quando a conta entra no
                cheque especial.
              </p>
            )}
          </Cartao>

          <Cartao titulo="Fluxo de caixa projetado">
            <GraficoFluxo
              dados={cenario.meses}
              altura={280}
              comparar={temHipotese ? base.meses : undefined}
            />
            {temHipotese && (
              <p className="mt-1 text-[11px] text-muted-fg">
                A linha cinza é o seu cenário de hoje; a área azul é com as hipóteses.
              </p>
            )}

            <div className="mt-5 space-y-2.5">
              {cenario.meses.map((mes, indice) => {
                const mesBase = base.meses[indice]
                const largura = (Math.abs(mes.saldoAcumuladoCentavos) / maiorValor) * 100
                const larguraBase = (Math.abs(mesBase?.saldoAcumuladoCentavos ?? 0) / maiorValor) * 100
                const negativo = mes.saldoAcumuladoCentavos < 0

                return (
                  <div key={mes.competencia} className="rounded-[var(--raio-cartao)] border border-pauta p-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[13px] font-medium">{rotuloCompetencia(mes.competencia)}</span>
                      <span className={cn("text-[15px] font-semibold", negativo ? "text-negativo" : "text-foreground")}>
                        {formatarMoeda(mes.saldoAcumuladoCentavos)}
                      </span>
                    </div>

                    <div className="mt-2 space-y-1">
                      <div className="h-2 w-full overflow-hidden rounded-full bg-foreground/[0.06]">
                        <div
                          className={cn("h-full rounded-full transition-all", negativo ? "bg-negativo" : "bg-acao")}
                          style={{ width: `${Math.min(100, largura)}%` }}
                        />
                      </div>
                      {temHipotese && (
                        <div className="h-1 w-full overflow-hidden rounded-full bg-foreground/[0.04]">
                          <div
                            className="h-full rounded-full bg-muted-fg/40"
                            style={{ width: `${Math.min(100, larguraBase)}%` }}
                            title="cenário atual, sem as hipóteses"
                          />
                        </div>
                      )}
                    </div>

                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-fg">
                      <span>entra {formatarMoedaCurta(mes.receitasCentavos)}</span>
                      <span>vida {formatarMoedaCurta(mes.custoDeVidaCentavos)}</span>
                      {mes.parcelasCentavos > 0 && <span>parcelas {formatarMoedaCurta(mes.parcelasCentavos)}</span>}
                      {mes.parcelasDividaCentavos + mes.pagamentoExtraCentavos > 0 && (
                        <span>dívida {formatarMoedaCurta(mes.parcelasDividaCentavos + mes.pagamentoExtraCentavos)}</span>
                      )}
                      {mes.jurosCentavos > 0 && (
                        <span className="text-atencao">juros {formatarMoedaCurta(mes.jurosCentavos)}</span>
                      )}
                      {mes.dividaRestanteCentavos > 0 && (
                        <span>deve {formatarMoedaCurta(mes.dividaRestanteCentavos)}</span>
                      )}
                    </div>

                    {mes.eventos.length > 0 && (
                      <p className="mt-2 text-[11px] text-acao">{mes.eventos.join(" · ")}</p>
                    )}
                  </div>
                )
              })}
            </div>

            {cenario.meses.length === 0 && <Vazio titulo="Sem dados para projetar" />}
          </Cartao>
        </>
      )}
    </div>
  )
}
