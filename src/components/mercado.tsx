"use client"

import { Bitcoin, Building2, CandlestickChart, Globe, Landmark, Wallet, type LucideIcon } from "lucide-react"

import { formatarMoeda } from "@/lib/dinheiro"
import type { IndicadorDoMercado, Periodo, SerieDeAtivo } from "@/lib/mercado"
import { PERIODOS, resultadoNoPeriodoCentavos } from "@/lib/mercado"
import type { ClasseDeAtivo } from "@/lib/tino/investir"
import { cn } from "@/lib/utils"
import estilos from "./mercado.module.css"

/**
 * A parte "corretora" de Investimentos (Davi, 23/09, com um print de
 * referência, e depois a opção A do canvas): a fita do mercado no alto, o
 * patrimônio com a linha do período, e cada ativo num cartão colorido com a
 * variação e o resultado em dinheiro.
 */

const porcentagem = (valor: number) => `${valor >= 0 ? "+" : "−"}${Math.abs(valor).toFixed(2).replace(".", ",")}%`
const numero = (valor: number, casas = 0) => valor.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas })

/**
 * Linha do período. `viewBox` esticado com `vector-effect`: a linha não tem
 * ponto nem texto, então esticar não deforma nada, e o traço continua fino em
 * qualquer largura.
 */
function Linha({ serie, className }: { serie: number[]; className?: string }) {
  if (serie.length < 2) return <span className={cn(estilos.semLinha, className)} aria-hidden />
  const menor = Math.min(...serie)
  const faixa = Math.max(1e-9, Math.max(...serie) - menor)
  const pontos = serie.map((valor, indice) => `${((indice / (serie.length - 1)) * 100).toFixed(2)},${(92 - ((valor - menor) / faixa) * 84).toFixed(2)}`).join(" ")
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className={cn(estilos.linha, className)} aria-hidden>
      <polyline points={pontos} vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

/** Rótulo curto da fita: é o que cabe numa linha de celular. */
const SIGLA: Record<string, string> = { ibov: "IBOV", dolar: "USD", sp500: "S&P", bitcoin: "BTC", selic: "SELIC" }

/**
 * A fita do mercado (Davi, 23/09: opção A do canvas), como a barra de
 * cotações das corretoras: uma linha fina que rola de lado. Só o que a fonte
 * trouxe; sem nada, a fita diz que o mercado está indisponível em vez de
 * mostrar zeros, que pareceriam uma queda de 100%.
 */
export function FitaDoMercado({ indices, atualizadoEm, carregando }: { indices: IndicadorDoMercado[]; atualizadoEm: string | null; carregando: boolean }) {
  const hora = atualizadoEm ? new Date(atualizadoEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }) : null
  const fontes = [...new Set(indices.map((indice) => indice.fonte))].join(", ")
  return (
    <div className={estilos.fita} aria-busy={carregando} title={fontes ? `Fontes: ${fontes}. Atraso de até 15 minutos.` : undefined}>
      {indices.length > 0 ? (
        <ul aria-label={`Mercado agora${hora ? `, atualizado às ${hora}` : ""}`}>
          {indices.map((indice) => (
            <li key={indice.chave}>
              <b>{SIGLA[indice.chave] ?? indice.rotulo}</b>
              <span>{indice.unidade === "%a.a." ? `${numero(indice.valor, 2)}%` : numero(indice.valor, indice.unidade === "BRL" ? 2 : 0)}</span>
              {indice.variacaoPercentual !== null && (
                <em data-sinal={indice.variacaoPercentual >= 0 ? "alta" : "baixa"}>{porcentagem(indice.variacaoPercentual)}</em>
              )}
            </li>
          ))}
          {hora && <li className={estilos.hora}>{hora}</li>}
        </ul>
      ) : (
        <p>{carregando ? "Buscando o mercado…" : "Mercado indisponível agora — os valores abaixo são os cadastrados."}</p>
      )}
    </div>
  )
}

/**
 * O patrimônio investido com a linha do período, no topo da tela. O
 * resultado soma só os ativos com cotação; quando algum ficou de fora (renda
 * fixa, ou cotação que não chegou), a tela diz, para o percentual não parecer
 * o da carteira inteira.
 */
export function PatrimonioInvestido({
  totalCentavos,
  resultadoCentavos,
  baseCentavos,
  parcial,
  serie,
  periodo,
  aoMudarPeriodo,
  acao,
  carregando,
}: {
  totalCentavos: number
  resultadoCentavos: number | null
  /** Valor dos ativos cotados no começo do período: a base do percentual. */
  baseCentavos: number
  parcial: boolean
  serie: number[]
  periodo: Periodo
  aoMudarPeriodo: (periodo: Periodo) => void
  acao?: React.ReactNode
  carregando: boolean
}) {
  const rotulo = periodo === "1d" ? "hoje" : `em ${PERIODOS.find((item) => item.periodo === periodo)?.rotulo.toLowerCase()}`
  const percentual = resultadoCentavos !== null && baseCentavos > 0 ? (resultadoCentavos / baseCentavos) * 100 : null
  const sobe = (resultadoCentavos ?? 0) >= 0
  return (
    <section className={cn("ficha", estilos.patrimonio)} aria-busy={carregando}>
      <header>
        <p className={estilos.rotulo}>Patrimônio investido</p>
        {acao}
      </header>
      <p className={estilos.total}>{formatarMoeda(totalCentavos)}</p>
      <p className={estilos.resultado} data-sinal={resultadoCentavos === null ? undefined : sobe ? "alta" : "baixa"}>
        {resultadoCentavos === null
          ? carregando ? "Buscando cotações…" : "Sem cotação agora: valores cadastrados."
          : <>{sobe ? "+" : "−"}{formatarMoeda(Math.abs(resultadoCentavos))}{percentual !== null && ` · ${porcentagem(percentual)}`} {rotulo}{parcial && <small> · nos ativos com cotação</small>}</>}
      </p>
      <GraficoDoPatrimonio serie={serie} sinal={resultadoCentavos === null ? undefined : sobe ? "alta" : "baixa"} />
      <div className={estilos.periodos} role="group" aria-label="Período">
        {PERIODOS.map((item) => (
          <button key={item.periodo} type="button" aria-pressed={periodo === item.periodo} onClick={() => aoMudarPeriodo(item.periodo)}>
            {item.rotulo}
          </button>
        ))}
      </div>
    </section>
  )
}

/** A linha grande do patrimônio, com a área embaixo. Sem série, um traço reto e apagado. */
function GraficoDoPatrimonio({ serie, sinal }: { serie: number[]; sinal?: "alta" | "baixa" }) {
  if (serie.length < 2 || Math.max(...serie) === Math.min(...serie)) return <div className={estilos.graficoVazio} aria-hidden />
  const menor = Math.min(...serie)
  const faixa = Math.max(...serie) - menor
  const pontos = serie.map((valor, indice) => `${((indice / (serie.length - 1)) * 100).toFixed(2)},${(94 - ((valor - menor) / faixa) * 86).toFixed(2)}`)
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className={estilos.grafico} data-sinal={sinal} role="img" aria-label={`Patrimônio de ${formatarMoeda(serie[0])} a ${formatarMoeda(serie.at(-1)!)} no período`}>
      <polygon points={`0,100 ${pontos.join(" ")} 100,100`} className={estilos.area} />
      <polyline points={pontos.join(" ")} vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

export interface AtivoDoCartao {
  id: string
  nome: string
  instituicao: string | null
  classe: ClasseDeAtivo | null
  ticker: string | null
  quantidadeMilesimos: number | null
  /** Valor em reais usado na carteira: mercado quando há cotação, cadastrado quando não há. */
  valorCentavos: number
  aportadoCentavos: number
}

const ICONE: Record<ClasseDeAtivo | "SEM", LucideIcon> = {
  ACOES: CandlestickChart,
  FII: Building2,
  RENDA_FIXA: Landmark,
  CAIXA: Wallet,
  INTERNACIONAL: Globe,
  CRIPTO: Bitcoin,
  OUTROS: Wallet,
  SEM: Wallet,
}
const ROTULO_CLASSE: Record<ClasseDeAtivo, string> = {
  ACOES: "Ações",
  FII: "Fundo imobiliário",
  RENDA_FIXA: "Renda fixa",
  CAIXA: "Caixa",
  INTERNACIONAL: "Internacional",
  CRIPTO: "Cripto",
  OUTROS: "Outros",
}

/**
 * Cada ativo num cartão colorido pela classe, como nas corretoras. A cor diz
 * a classe antes do texto: verde é bolsa daqui, azul é lá fora, branco é renda
 * fixa e caixa.
 *
 * Renda fixa não tem cotação diária: o cartão diz isso e mostra o ganho sobre o
 * aportado, em vez de desenhar uma linha "rendendo o CDI" — seria uma
 * estimativa com cara de extrato.
 */
export function CartoesDeAtivos({
  ativos,
  series,
  dolar,
  periodo,
  aoAbrir,
  carregando,
}: {
  ativos: AtivoDoCartao[]
  series: SerieDeAtivo[]
  dolar: number | null
  periodo: Periodo
  aoAbrir: (id: string) => void
  carregando: boolean
}) {
  const rotuloPeriodo = PERIODOS.find((item) => item.periodo === periodo)?.rotulo.toLowerCase() ?? "no período"
  // Os que têm cotação vêm primeiro: são os que mudam no dia, e é por eles
  // que a pessoa abre a tela. Renda fixa e caixa vêm depois, por valor.
  const temSerie = (ativo: AtivoDoCartao) => (ativo.ticker && series.some((linha) => linha.ticker === ativo.ticker!.toUpperCase()) ? 1 : 0)
  const ordenados = [...ativos].sort((a, b) => temSerie(b) - temSerie(a) || b.valorCentavos - a.valorCentavos)

  return (
    <section className={estilos.seus} aria-busy={carregando}>
      <header>
        <h2>Seus investimentos</h2>
        <small>{ativos.length} {ativos.length === 1 ? "ativo" : "ativos"}</small>
      </header>

      <ul className={estilos.cartoes}>
        {ordenados.map((ativo) => {
          const serie = ativo.ticker ? series.find((linha) => linha.ticker === ativo.ticker!.toUpperCase()) : undefined
          const Icone = ICONE[ativo.classe ?? "SEM"]
          const quantidade = ativo.quantidadeMilesimos ? ativo.quantidadeMilesimos / 1000 : null
          const emDolar = serie?.moeda === "USD"
          const cambio = emDolar ? dolar : 1
          const resultado =
            serie && cambio !== null
              ? resultadoNoPeriodoCentavos({ valorCentavos: ativo.valorCentavos, quantidadeMilesimos: ativo.quantidadeMilesimos, preco: serie.preco, precoInicial: serie.precoInicial, cambio })
              : null
          const ganhoSobreAportado = ativo.valorCentavos - ativo.aportadoCentavos
          const sub = [ativo.ticker ? (serie?.nome ?? ativo.nome) : (ativo.instituicao ?? (ativo.classe ? ROTULO_CLASSE[ativo.classe] : "Investimento")), quantidade ? `${numero(quantidade, quantidade % 1 ? 2 : 0)} ${ativo.classe === "FII" ? "cotas" : quantidade === 1 ? "unidade" : "unidades"}` : null]
            .filter(Boolean)
            .join(" · ")

          return (
            <li key={ativo.id}>
              <button type="button" className={estilos.cartao} data-classe={ativo.classe ?? "SEM"} onClick={() => aoAbrir(ativo.id)} aria-label={`${ativo.ticker ?? ativo.nome}: aportar ou resgatar`}>
                <span className={estilos.topo}>
                  <i className={estilos.icone} aria-hidden>
                    <Icone />
                  </i>
                  <span className={estilos.nome}>
                    <strong>{ativo.ticker?.toUpperCase() ?? ativo.nome}</strong>
                    <small>{sub}</small>
                  </span>
                  <span className={estilos.periodo}>
                    {serie ? (
                      <>
                        <strong>{porcentagem(serie.variacaoPercentual)}</strong>
                        <small>{periodo === "1d" ? "hoje" : `em ${rotuloPeriodo}`}</small>
                      </>
                    ) : (
                      <small>{ativo.ticker ? (carregando ? "buscando cotação…" : "sem cotação agora") : "sem cotação diária"}</small>
                    )}
                  </span>
                </span>

                {/* Sem cotação, o cartão encolhe em vez de guardar o espaço de uma
                    linha que não existe. Com código na bolsa, o espaço fica: a
                    linha chega quando a cotação voltar. */}
                {serie ? <Linha serie={serie.serie} /> : ativo.ticker ? <span className={estilos.semLinha} aria-hidden /> : null}

                <span className={estilos.base}>
                  <span>
                    <small>Valor da posição</small>
                    <strong>
                      {emDolar && quantidade ? `US$ ${numero(quantidade * serie!.preco, 2)}` : formatarMoeda(ativo.valorCentavos)}
                    </strong>
                    {emDolar && cambio !== null && <small>≈ {formatarMoeda(ativo.valorCentavos)}</small>}
                  </span>
                  <span className={estilos.direita}>
                    {resultado !== null ? (
                      <>
                        <small>Resultado {periodo === "1d" ? "hoje" : `em ${rotuloPeriodo}`}</small>
                        <strong>{resultado >= 0 ? "+" : "−"}{formatarMoeda(Math.abs(resultado))}</strong>
                      </>
                    ) : ganhoSobreAportado !== 0 ? (
                      <>
                        <small>Sobre o aportado</small>
                        <strong>{ganhoSobreAportado > 0 ? "+" : "−"}{formatarMoeda(Math.abs(ganhoSobreAportado))}</strong>
                      </>
                    ) : (
                      <>
                        <small>{ativo.ticker ? "Resultado" : "Rende pelo contrato"}</small>
                        <strong>—</strong>
                      </>
                    )}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      <p className={estilos.fonte}>Toque num investimento para aportar ou resgatar. Preços do Yahoo Finance, com atraso de até 15 minutos.</p>
    </section>
  )
}
