"use client"

import estilos from "../analise/avancadas.module.css"
import local from "./emprestimos.module.css"
import { Button } from "@/components/ui/button"
import { useEffect, useRef, useState } from "react"
import { buscar, enviar } from "@/lib/cliente"
import { formatarMoeda, formatarPercentual, paraCentavos } from "@/lib/dinheiro"
import { Cartao } from "@/components/ui/painel"
import { ReguaDoIndicador } from "@/components/regua-do-indicador"
import { REFERENCIA_COMPROMETIMENTO } from "@/lib/tino/leitura-dividas"
import { cn } from "@/lib/utils"

/**
 * Decisão de empréstimo — desenho escolhido pelo Davi em 23/09 no canvas: o
 * veredito da opção A no topo, os controles da A logo abaixo e as propostas
 * lado a lado da B no fim.
 *
 * O número que decide não é a taxa anunciada, é o CET: ele inclui IOF, tarifa
 * e seguro, que é justamente onde a diferença entre duas propostas aparece.
 * Por isso a comparação é pelo CET e a taxa nominal só aparece como detalhe.
 *
 * Não há botão de simular: o resultado recalcula sozinho quando a pessoa para
 * de mexer. Com o botão, a resposta só aparecia depois de cinco campos e um
 * toque, lá embaixo da tela.
 */

interface Linha {
  parcela: number
  jurosCentavos: number
  amortizacaoCentavos: number
  prestacaoCentavos: number
  saldoCentavos: number
}

interface Analise {
  parcelaCentavos: number
  totalPagoCentavos: number
  totalJurosCentavos: number
  cetMensalBps: number
  cetAnualBps: number
  liberadoCentavos: number
  comprometimentoBps: number
  veredito: "APROVAR" | "CUIDADO" | "EVITAR"
  motivos: string[]
  alternativas: string[]
  tabela: Linha[]
}

interface Simulacao {
  id: string
  titulo: string
  valorCentavos: number
  parcelas: number
  jurosMensalBps: number
  veredito: string | null
  resultado: { parcelaCentavos: number; cetMensalBps: number; totalJurosCentavos: number; totalPagoCentavos?: number }
  criadoEm: string
}

const VEREDITO = {
  APROVAR: { texto: "Cabe no seu orçamento", cor: "positivo" },
  CUIDADO: { texto: "Dá, mas aperta", cor: "atencao" },
  EVITAR: { texto: "Não recomendo", cor: "negativo" },
} as const

/**
 * Régua do CET ao mês, nas mesmas faixas do veredito (analisarEmprestimo):
 * até 2,5% segue sem alerta, acima de 5% é caro para crédito pessoal.
 */
const ESCALA_CET = { bom: 250, atencao: 500, maximo: 750, menorMelhor: true }
const ESCALA_RENDA = { bom: REFERENCIA_COMPROMETIMENTO.bom, atencao: REFERENCIA_COMPROMETIMENTO.atencao, maximo: 4500, menorMelhor: true }

const PRAZOS = [6, 12, 18, 24, 36, 48, 60]

const campo = "w-full rounded-[var(--raio-campo)] border border-pauta bg-background px-3.5 py-2.5 text-[calc(14px*var(--escala-letra))] outline-none focus:border-acao/50"

/**
 * Classe de cor da faixa. A do meio usa o âmbar de --ambar (definido no
 * módulo, com versão escura no tema claro) em vez de text-atencao, que é cinza
 * de propósito na pele do app e se confundiria com "sem dado". A régua troca
 * text- por bg-; as duas formas ficam escritas aqui para o Tailwind gerar:
 * text-[color:var(--ambar)] bg-[color:var(--ambar)].
 */
function corDaFaixa(valor: number, escala: { bom: number; atencao: number }) {
  return valor <= escala.bom ? "text-positivo" : valor <= escala.atencao ? "text-[color:var(--ambar)]" : "text-negativo"
}

export default function Emprestimos() {
  const [valorCentavos, setValorCentavos] = useState(1_000_000)
  const [valorDigitado, setValorDigitado] = useState("10.000,00")
  const [parcelas, setParcelas] = useState(12)
  const [juros, setJuros] = useState("2,5")
  const [custos, setCustos] = useState("")
  const [titulo, setTitulo] = useState("")
  const [analise, setAnalise] = useState<Analise | null>(null)
  const [salvas, setSalvas] = useState<Simulacao[]>([])
  const [verTabela, setVerTabela] = useState(false)
  const [calculando, setCalculando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const ultimo = useRef(0)
  const fileira = useRef<HTMLDivElement>(null)

  useEffect(() => {
    buscar<Simulacao[]>("/api/emprestimos").then(setSalvas).catch(() => setSalvas([]))
  }, [])

  function corpoDaSimulacao(salvar: boolean) {
    return {
      titulo: titulo.trim() || undefined,
      valorCentavos,
      parcelas,
      jurosMensalBps: Math.round(Number(juros.replace(",", ".") || 0) * 100),
      custosExtrasCentavos: custos ? paraCentavos(custos) : 0,
      salvar,
    }
  }

  /**
   * Recalcula quando a pessoa para de mexer (350 ms). A régua do valor gera
   * dezenas de mudanças por segundo; perguntar ao servidor a cada uma seria
   * inútil. Resposta atrasada de um valor anterior é descartada.
   */
  useEffect(() => {
    if (valorCentavos < 100) {
      setAnalise(null)
      return
    }
    const pedido = ++ultimo.current
    const espera = setTimeout(async () => {
      setCalculando(true)
      try {
        const resposta = await enviar<Analise>("/api/emprestimos", corpoDaSimulacao(false))
        if (pedido === ultimo.current) {
          setAnalise(resposta)
          setErro(null)
        }
      } catch (excecao) {
        if (pedido === ultimo.current) setErro(excecao instanceof Error ? excecao.message : "Não consegui simular.")
      } finally {
        if (pedido === ultimo.current) setCalculando(false)
      }
    }, 350)
    return () => clearTimeout(espera)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- titulo não muda o cálculo
  }, [valorCentavos, parcelas, juros, custos])

  async function guardar() {
    setGuardando(true)
    try {
      await enviar<Analise>("/api/emprestimos", corpoDaSimulacao(true))
      setSalvas(await buscar<Simulacao[]>("/api/emprestimos"))
      setTitulo("")
    } catch (excecao) {
      setErro(excecao instanceof Error ? excecao.message : "Não consegui guardar a proposta.")
    } finally {
      setGuardando(false)
    }
  }

  function mudarValorDigitado(texto: string) {
    setValorDigitado(texto)
    const centavos = paraCentavos(texto)
    if (Number.isFinite(centavos)) setValorCentavos(Math.max(0, centavos))
  }

  function mudarValorNaRegua(centavos: number) {
    setValorCentavos(centavos)
    setValorDigitado((centavos / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
  }

  const parecer = analise ? VEREDITO[analise.veredito] : null
  const tetoRegua = Math.max(10_000_000, Math.ceil(valorCentavos / 1_000_000) * 1_000_000)

  // As propostas lado a lado: a simulação da tela e as guardadas, comparadas
  // pelo CET. "Mais barata" só aparece com duas ou mais para comparar.
  const propostas = [
    ...(analise ? [{
      id: "atual",
      titulo: titulo.trim() || "Esta simulação",
      detalhe: `${formatarMoeda(valorCentavos)} em ${parcelas}x · ${juros || "0"}% a.m.`,
      parcelaCentavos: analise.parcelaCentavos,
      cetMensalBps: analise.cetMensalBps,
      totalPagoCentavos: analise.totalPagoCentavos,
      veredito: analise.veredito as string | null,
    }] : []),
    ...salvas.map((simulacao) => ({
      id: simulacao.id,
      titulo: simulacao.titulo,
      detalhe: `${formatarMoeda(simulacao.valorCentavos)} em ${simulacao.parcelas}x · ${formatarPercentual(simulacao.jurosMensalBps)} a.m.`,
      parcelaCentavos: simulacao.resultado.parcelaCentavos,
      cetMensalBps: simulacao.resultado.cetMensalBps,
      totalPagoCentavos: simulacao.resultado.totalPagoCentavos ?? simulacao.resultado.parcelaCentavos * simulacao.parcelas,
      veredito: simulacao.veredito,
    })),
  ]
  // A simulação da tela entra na frente das guardadas quando o cálculo chega,
  // e o navegador preservava a proposta que já estava à vista — a fileira
  // abria rolada, com a primeira cortada. Volta ao começo quando a lista muda.
  useEffect(() => {
    fileira.current?.scrollTo({ left: 0 })
  }, [propostas.length])

  const maisBarata = propostas.length > 1 ? propostas.reduce((menor, atual) => (atual.cetMensalBps < menor.cetMensalBps ? atual : menor)).id : null

  return (
    <div className={cn(estilos.pagina, "space-y-4")}>
      {/* 1. O veredito — a resposta primeiro. */}
      <section className={cn("ficha", local.veredito)} data-cor={parecer?.cor ?? "neutro"} aria-live="polite" aria-busy={calculando}>
        {analise && parecer ? (
          <>
            <p className={local.selo}><i aria-hidden />{parecer.texto}</p>
            <p className={local.parcela}>{formatarMoeda(analise.parcelaCentavos)}<span>/mês</span></p>
            <p className={local.custo}>
              Você recebe <b>{formatarMoeda(analise.liberadoCentavos)}</b> e devolve <b>{formatarMoeda(analise.totalPagoCentavos)}</b> —{" "}
              <em>{formatarMoeda(analise.totalPagoCentavos - analise.liberadoCentavos)} a mais</em>
            </p>
            <div className={local.reguas}>
              <div>
                <small>Custo real (CET)</small>
                <b className={corDaFaixa(analise.cetMensalBps, ESCALA_CET)}>{formatarPercentual(analise.cetMensalBps)} a.m.</b>
                <ReguaDoIndicador numero={analise.cetMensalBps} escala={ESCALA_CET} cor={corDaFaixa(analise.cetMensalBps, ESCALA_CET)} />
                <span className={local.marcas}><span>ok até 2,5%</span><span>caro 5%+</span></span>
              </div>
              <div>
                <small>Renda comprometida</small>
                <b className={corDaFaixa(analise.comprometimentoBps, ESCALA_RENDA)}>{formatarPercentual(analise.comprometimentoBps, 0)}</b>
                <ReguaDoIndicador numero={analise.comprometimentoBps} escala={ESCALA_RENDA} cor={corDaFaixa(analise.comprometimentoBps, ESCALA_RENDA)} />
                <span className={local.marcas}><span>20%</span><span>teto 30%</span></span>
              </div>
            </div>
            {(analise.motivos.length > 0 || analise.alternativas.length > 0) && (
              <details className={local.porque}>
                <summary>Por quê?</summary>
                <ul>{analise.motivos.map((motivo) => <li key={motivo}>{motivo}</li>)}</ul>
                {analise.alternativas.length > 0 && (
                  <>
                    <p>Antes de assinar</p>
                    <ul>{analise.alternativas.map((alternativa) => <li key={alternativa}>{alternativa}</li>)}</ul>
                  </>
                )}
              </details>
            )}
          </>
        ) : (
          <>
            <p className={local.selo}>Vale a pena esse empréstimo?</p>
            <p className={local.custo}>{calculando ? "Calculando…" : "Informe quanto você precisa para ver a parcela e o custo real."}</p>
          </>
        )}
      </section>

      {/* 2. Os controles — mexeu, o topo muda. */}
      <Cartao estatico className={local.controles}>
        <label className={local.linhaValor}>
          <span>Quanto você precisa</span>
          <span className={local.valorDigitado}>R$ <input value={valorDigitado} onChange={(e) => mudarValorDigitado(e.target.value)} inputMode="decimal" aria-label="Valor do empréstimo em reais" /></span>
        </label>
        <input
          type="range"
          aria-label="Valor do empréstimo"
          aria-valuetext={formatarMoeda(valorCentavos)}
          min={50_000}
          max={tetoRegua}
          step={50_000}
          value={Math.min(valorCentavos, tetoRegua)}
          onChange={(e) => mudarValorNaRegua(Number(e.target.value))}
          className={local.regua}
        />

        <p className={local.rotulo}>Em quantas vezes</p>
        <div className={local.prazos} role="group" aria-label="Número de parcelas">
          {PRAZOS.map((prazo) => (
            <button key={prazo} type="button" aria-pressed={parcelas === prazo} onClick={() => setParcelas(prazo)}>{prazo}x</button>
          ))}
        </div>

        <div className={local.duasColunas}>
          <label><span className={local.rotulo}>Juros % ao mês</span><input value={juros} onChange={(e) => setJuros(e.target.value)} placeholder="2,5" className={campo} inputMode="decimal" /></label>
          <label><span className={local.rotulo}>IOF e tarifas (R$)</span><input value={custos} onChange={(e) => setCustos(e.target.value)} placeholder="0,00" className={campo} inputMode="decimal" /></label>
        </div>

        <div className={local.guardar}>
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} aria-label="Nome da proposta" placeholder="Nome (ex.: Banco X)" className={campo} />
          <Button onClick={() => void guardar()} disabled={guardando || !analise}>{guardando ? "Guardando…" : "Guardar proposta"}</Button>
        </div>
        {erro && <p role="alert" className="mt-3 text-[calc(13px*var(--escala-letra))] text-negativo">{erro}</p>}
      </Cartao>

      {/* 3. As propostas lado a lado, pelo CET. */}
      {propostas.length > 0 && (
        <section>
          <header className={local.cabecalhoPropostas}>
            <h2>Comparar propostas</h2>
            <small>pelo custo real, não pela taxa anunciada</small>
          </header>
          <div ref={fileira} className={local.propostas}>
            {propostas.map((proposta) => {
              const cor = proposta.veredito ? VEREDITO[proposta.veredito as keyof typeof VEREDITO] : null
              return (
                <article key={proposta.id} className={cn("ficha", local.proposta, proposta.id === maisBarata && local.maisBarata)}>
                  {proposta.id === maisBarata ? <span className={local.seloBarata}>Mais barata</span> : <span className={local.seloVazio} aria-hidden />}
                  <h3>{proposta.titulo}</h3>
                  <small>{proposta.detalhe}</small>
                  <p className={local.propostaParcela}><span>Parcela</span>{formatarMoeda(proposta.parcelaCentavos)}</p>
                  <p className={local.linhaProposta}><span>CET</span><b>{formatarPercentual(proposta.cetMensalBps)} a.m.</b></p>
                  <p className={local.linhaProposta}><span>Devolve no total</span><b>{formatarMoeda(proposta.totalPagoCentavos)}</b></p>
                  {cor && <p className={local.seloProposta} data-cor={cor.cor}><i aria-hidden />{cor.texto}</p>}
                </article>
              )
            })}
          </div>
        </section>
      )}

      {analise && (
        <Cartao
          titulo="Como a dívida evolui"
          acao={
            <Button onClick={() => setVerTabela((atual) => !atual)}>
              {verTabela ? "esconder" : "ver todas as parcelas"}
            </Button>
          }
        >
          <div className="space-y-1.5">
            {(verTabela ? analise.tabela : analise.tabela.slice(0, 6)).map((linha) => (
              <div key={linha.parcela} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3 border-b border-pauta py-3 text-[calc(12px*var(--escala-letra))] sm:grid-cols-[2rem_minmax(0,1fr)_auto_auto]">
                <span className="w-8 shrink-0 text-muted-fg">{linha.parcela}ª</span>
                <div className="flex h-2.5 flex-1 overflow-hidden rounded-full bg-foreground/[0.06]">
                  {/* Juros em laranja, amortização em verde: mostra de relance
                      quanto de cada parcela some sem abater a dívida. */}
                  {/* Math.max evita divisão por zero: prestação zerada
                      renderizaria width "NaN%" e quebraria a barra. */}
                  <div
                    className="h-full bg-atencao"
                    style={{ width: `${(linha.jurosCentavos / Math.max(1, linha.prestacaoCentavos)) * 100}%` }}
                  />
                  <div
                    className="h-full bg-positivo"
                    style={{ width: `${(linha.amortizacaoCentavos / Math.max(1, linha.prestacaoCentavos)) * 100}%` }}
                  />
                </div>
                <span className="whitespace-nowrap text-right tabular-nums text-muted-fg">
                  Juros <span className="valor-inteiro">{formatarMoeda(linha.jurosCentavos)}</span>
                </span>
                <span className="whitespace-nowrap text-right tabular-nums">Resta <span className="valor-inteiro">{formatarMoeda(linha.saldoCentavos)}</span></span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[max(10px,calc(12px*var(--escala-letra)))] text-muted-fg">
            Cada linha mostra juros pagos e saldo restante.
          </p>
        </Cartao>
      )}
    </div>
  )
}
