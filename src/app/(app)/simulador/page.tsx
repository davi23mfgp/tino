"use client"

import avancadas from "../analise/avancadas.module.css"
import estilos from "./simulador.module.css"
import { useEffect, useRef, useState, type ReactNode } from "react"
import Link from "next/link"
import { ArrowDownToLine, ArrowRight, ArrowUp, Check, CreditCard, Plus, PlusCircle, TrendingUp, X } from "lucide-react"

import { buscar, enviar } from "@/lib/cliente"
import { competenciaAtual, competenciaMaisMeses, rotuloCompetencia } from "@/lib/datas"
import { formatarMoeda, formatarMoedaCurta, formatarPercentual, paraCentavos } from "@/lib/dinheiro"
import { corteViraPatrimonio } from "@/lib/tino/investir"
import { cn } from "@/lib/utils"
import { Detalhe } from "@/components/ui/painel"

/**
 * Simulador de cenários (Davi, 23/09: opção B do canvas, com o gráfico da C).
 *
 * A tela abre dizendo onde a pessoa chega sem mudar nada, depois mostra as
 * nove coisas que dá para testar como blocos, à vista. Antes elas ficavam num
 * menu, e quem não abria o menu não sabia que dava para simular empréstimo.
 *
 * O resultado é sempre antes e depois, lado a lado e no gráfico: o número
 * simulado sozinho esconde o que interessa, que é a diferença entre agir e
 * não agir. E recalcula enquanto a pessoa mexe, sem botão de "Simular" —
 * o botão fazia o resultado parecer um relatório, não uma resposta.
 */

interface Mes {
  competencia: string
  receitasCentavos: number
  custoDeVidaCentavos: number
  parcelasCentavos: number
  parcelasDividaCentavos: number
  jurosCentavos: number
  pagamentoExtraCentavos: number
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
}

interface Comparacao {
  base: Resultado
  cenario: Resultado
  delta: { patrimonioFinalCentavos: number }
  veredito: string[]
  entrada: {
    rendaMensalCentavos: number
    dividas: { id: string; nome: string; saldoCentavos: number; jurosMensalBps: number }[]
  }
}

/**
 * "Guardar todo mês" não é um tipo do motor: no caixa, guardar é gastar menos
 * e deixar o dinheiro na conta, igual a cortar gasto. Fica como bloco próprio
 * porque é a pergunta que a pessoa faz com essas palavras, e porque só ele
 * mostra quanto o hábito vira em vinte anos rendendo.
 */
type Tipo =
  | "GUARDAR"
  | "CUSTO"
  | "RENDA"
  | "PAGAMENTO_EXTRA"
  | "NOVA_COMPRA_PARCELADA"
  | "NOVO_EMPRESTIMO"
  | "QUITAR_DIVIDA"
  | "GASTO_UNICO"
  | "RECEITA_UNICA"

interface Hipotese {
  tipo: Tipo
  valor: string
  parcelas: string
  juros: string
  competencia: string
  dividaId: string
}

interface Modelo {
  tipo: Tipo
  titulo: string
  icone: ReactNode
  /** Rótulo do valor no cartão da hipótese. */
  campo: string
  /** Régua para os valores mensais; os únicos (viagem, 13º) variam demais para uma régua servir. */
  regua?: { minimo: number; maximo: number; passo: number }
  /** Ponto de partida da régua. Os demais começam vazios: valor de compra ou de empréstimo só a pessoa sabe. */
  inicial?: string
}

const tamanhoIcone = "size-5"
const MODELOS: Modelo[] = [
  { tipo: "GUARDAR", titulo: "Guardar todo mês", icone: <ArrowDownToLine className={tamanhoIcone} />, campo: "Guardar por mês", regua: { minimo: 0, maximo: 3000, passo: 50 }, inicial: "200" },
  { tipo: "CUSTO", titulo: "Cortar gasto", icone: <X className={tamanhoIcone} />, campo: "Cortar por mês", regua: { minimo: 0, maximo: 3000, passo: 50 }, inicial: "200" },
  { tipo: "RENDA", titulo: "Mudar renda", icone: <TrendingUp className={tamanhoIcone} />, campo: "Renda a mais por mês (negativo para queda)", regua: { minimo: -5000, maximo: 5000, passo: 100 }, inicial: "500" },
  { tipo: "PAGAMENTO_EXTRA", titulo: "Pagar dívida mais rápido", icone: <ArrowRight className={tamanhoIcone} />, campo: "Extra por mês na dívida", regua: { minimo: 0, maximo: 3000, passo: 50 }, inicial: "200" },
  { tipo: "NOVA_COMPRA_PARCELADA", titulo: "Comprar parcelado", icone: <CreditCard className={tamanhoIcone} />, campo: "Valor total da compra" },
  { tipo: "NOVO_EMPRESTIMO", titulo: "Pegar empréstimo", icone: <PlusCircle className={tamanhoIcone} />, campo: "Valor que entra na conta" },
  { tipo: "QUITAR_DIVIDA", titulo: "Quitar uma dívida", icone: <Check className={tamanhoIcone} />, campo: "Qual dívida" },
  { tipo: "GASTO_UNICO", titulo: "Gasto único", icone: <Plus className={tamanhoIcone} />, campo: "Valor do gasto" },
  { tipo: "RECEITA_UNICA", titulo: "Entrada única", icone: <ArrowUp className={tamanhoIcone} />, campo: "Valor que entra" },
]

const JANELAS = [12, 24, 36, 60]

/** Rendimento real, já líquido de inflação. Conservador de propósito — o mesmo que /investir usava. */
const RENDIMENTO_REAL_ANUAL_BPS = 400
const ANOS_GUARDANDO = 20

const campo = "w-full rounded-[var(--raio-campo)] border border-pauta bg-background px-3.5 py-2.5 text-[calc(13px*var(--escala-letra))] outline-none focus:border-acao/50"

/** Valor mensal "com cara de régua" (quanto a mais, quanto a menos) não pede competência de fim. */
const MENSAIS: Tipo[] = ["GUARDAR", "CUSTO", "RENDA", "PAGAMENTO_EXTRA"]

function paraAjuste(hipotese: Hipotese, rotulo: string) {
  const valorCentavos = paraCentavos(hipotese.valor || "0")
  const base = { rotulo }
  switch (hipotese.tipo) {
    case "GUARDAR":
    case "CUSTO":
      // Digitado como positivo, vira delta negativo: pedir "-500" é onde a
      // pessoa erra.
      return { ...base, tipo: "CUSTO" as const, deltaCentavos: -Math.abs(valorCentavos), aPartirDe: hipotese.competencia }
    case "RENDA":
      return { ...base, tipo: "RENDA" as const, deltaCentavos: valorCentavos, aPartirDe: hipotese.competencia }
    case "GASTO_UNICO":
      return { ...base, tipo: "GASTO_UNICO" as const, valorCentavos, competencia: hipotese.competencia }
    case "RECEITA_UNICA":
      return { ...base, tipo: "RECEITA_UNICA" as const, valorCentavos, competencia: hipotese.competencia }
    case "NOVA_COMPRA_PARCELADA":
      return { ...base, tipo: "NOVA_COMPRA_PARCELADA" as const, valorTotalCentavos: valorCentavos, parcelas: Number(hipotese.parcelas) || 1, competenciaInicial: hipotese.competencia }
    case "NOVO_EMPRESTIMO":
      return {
        ...base,
        tipo: "NOVO_EMPRESTIMO" as const,
        valorCentavos,
        parcelas: Number(hipotese.parcelas) || 12,
        jurosMensalBps: Math.round(Number((hipotese.juros || "0").replace(",", ".")) * 100),
        competencia: hipotese.competencia,
      }
    case "QUITAR_DIVIDA":
      return { ...base, tipo: "QUITAR_DIVIDA" as const, dividaId: hipotese.dividaId, competencia: hipotese.competencia }
    default:
      return { ...base, tipo: "PAGAMENTO_EXTRA" as const, valorMensalCentavos: valorCentavos, aPartirDe: hipotese.competencia }
  }
}

/** Hipótese sem o que ela precisa fica de fora da conta, e a tela diz o que falta. */
function falta(hipotese: Hipotese, temDivida: boolean): string | null {
  if (hipotese.tipo === "QUITAR_DIVIDA" || hipotese.tipo === "PAGAMENTO_EXTRA") {
    if (!temDivida) return "Nenhuma dívida cadastrada para testar."
  }
  if (hipotese.tipo === "QUITAR_DIVIDA") return hipotese.dividaId ? null : "Escolha a dívida."
  if (!paraCentavos(hipotese.valor || "0")) return "Informe o valor para entrar na conta."
  if (hipotese.tipo === "NOVO_EMPRESTIMO" && !hipotese.juros.trim()) return "Informe os juros ao mês da proposta."
  return null
}

export default function Simulador() {
  const [comparacao, setComparacao] = useState<Comparacao | null>(null)
  const [hipoteses, setHipoteses] = useState<Hipotese[]>([])
  const [meses, setMeses] = useState(24)
  const [calculando, setCalculando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const ultimo = useRef(0)
  const cartoes = useRef(new Map<Tipo, HTMLElement>())

  const inicial = competenciaAtual()
  const dividas = comparacao?.entrada.dividas ?? []
  const temDivida = dividas.length > 0
  const validas = hipoteses.filter((hipotese) => !falta(hipotese, temDivida))
  // A chave do pedido: só o que muda a conta. Mudar o texto de uma hipótese
  // incompleta não dispara nada.
  const chave = JSON.stringify([meses, validas])

  useEffect(() => {
    const pedido = ++ultimo.current
    setCalculando(true)
    const espera = setTimeout(async () => {
      try {
        const lista = JSON.parse(chave)[1] as Hipotese[]
        const resposta = lista.length
          ? await enviar<Comparacao>("/api/simulador", {
              ajustes: lista.map((hipotese) => paraAjuste(hipotese, MODELOS.find((modelo) => modelo.tipo === hipotese.tipo)!.titulo)),
              meses,
            })
          : await buscar<Comparacao>(`/api/simulador?meses=${meses}`)
        // Resposta velha chegando depois da nova desfazia o que a pessoa
        // acabou de ver mudar.
        if (pedido === ultimo.current) {
          setComparacao(resposta)
          setErro(null)
        }
      } catch (excecao) {
        if (pedido === ultimo.current) setErro(excecao instanceof Error ? excecao.message : "Não consegui simular.")
      } finally {
        if (pedido === ultimo.current) setCalculando(false)
      }
    }, 350)
    return () => clearTimeout(espera)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave])

  function escolher(tipo: Tipo) {
    const existente = cartoes.current.get(tipo)
    // Uma hipótese por tipo: tocar de novo leva ao cartão dela em vez de
    // duplicar. Dois "cortar gasto" somados são um corte só, maior.
    if (existente) {
      existente.scrollIntoView({ behavior: "smooth", block: "center" })
      existente.querySelector<HTMLInputElement>("input, select")?.focus({ preventScroll: true })
      return
    }
    const modelo = MODELOS.find((item) => item.tipo === tipo)!
    setHipoteses((atual) => [
      ...atual,
      { tipo, valor: modelo.inicial ?? "", parcelas: "12", juros: "", competencia: inicial, dividaId: dividas[0]?.id ?? "" },
    ])
  }

  const atualizar = (tipo: Tipo, mudanca: Partial<Hipotese>) =>
    setHipoteses((atual) => atual.map((item) => (item.tipo === tipo ? { ...item, ...mudanca } : item)))
  const remover = (tipo: Tipo) => setHipoteses((atual) => atual.filter((item) => item.tipo !== tipo))

  const base = comparacao?.base
  const cenario = comparacao?.cenario
  const simulando = validas.length > 0 && !!cenario
  const diferenca = comparacao?.delta.patrimonioFinalCentavos ?? 0
  const guardar = validas.find((hipotese) => hipotese.tipo === "GUARDAR")
  const longoPrazo = guardar
    ? corteViraPatrimonio({ cortePorMesCentavos: paraCentavos(guardar.valor), anos: ANOS_GUARDANDO, rendimentoRealAnualBps: RENDIMENTO_REAL_ANUAL_BPS })
    : null

  return (
    <div className={cn(avancadas.pagina, estilos.pagina)}>
      <section className={cn("ficha", estilos.topo)} aria-live="polite" aria-busy={calculando}>
        {/* O topo fica sempre no ritmo de hoje, mesmo simulando: é a régua
            contra a qual a mudança é lida, e o "com a mudança" tem o seu
            lugar ao lado dela, no resultado. */}
        <p className={estilos.rotulo}>No ritmo de hoje</p>
        {!comparacao ? (
          <p className={estilos.manchete}>{erro ? "Não consegui montar seu cenário." : "Calculando onde você chega…"}</p>
        ) : (
          <p className={estilos.manchete}>
            Em {meses} meses você tem <em data-piora={comparacao.base.patrimonioFinalCentavos < 0 || undefined}>{formatarMoeda(comparacao.base.patrimonioFinalCentavos)}</em>.
          </p>
        )}
        <p className={estilos.apoio}>Saldo menos dívidas, pela sua média de gastos e pelas parcelas já contratadas.</p>
        <div className={estilos.janelas} role="group" aria-label="Prazo da simulação">
          {JANELAS.map((janela) => (
            <button key={janela} type="button" aria-pressed={meses === janela} onClick={() => setMeses(janela)}>
              {janela} meses
            </button>
          ))}
        </div>
        {comparacao && comparacao.entrada.rendaMensalCentavos === 0 && (
          <p className={estilos.aviso}>
            Sem renda cadastrada, a conta usa renda zero. <Link href="/configuracoes">Complete seu perfil</Link> ou importe um extrato.
          </p>
        )}
      </section>

      <h2 className={estilos.titulo}>O que você quer testar?</h2>
      <div className={estilos.blocos}>
        {MODELOS.map((modelo) => (
          <button
            key={modelo.tipo}
            type="button"
            aria-pressed={hipoteses.some((hipotese) => hipotese.tipo === modelo.tipo)}
            onClick={() => escolher(modelo.tipo)}
            className={cn("ficha", estilos.bloco)}
          >
            <span aria-hidden>{modelo.icone}</span>
            {modelo.titulo}
          </button>
        ))}
      </div>

      {hipoteses.map((hipotese) => {
        const modelo = MODELOS.find((item) => item.tipo === hipotese.tipo)!
        const aviso = falta(hipotese, temDivida)
        const valorNumero = paraCentavos(hipotese.valor || "0") / 100
        return (
          <section
            key={hipotese.tipo}
            ref={(elemento) => {
              if (elemento) cartoes.current.set(hipotese.tipo, elemento)
              else cartoes.current.delete(hipotese.tipo)
            }}
            className={cn("ficha", estilos.hipotese)}
          >
            <header>
              <h3>{modelo.titulo}</h3>
              <button type="button" onClick={() => remover(hipotese.tipo)} className={estilos.remover}>
                remover
              </button>
            </header>

            {hipotese.tipo === "QUITAR_DIVIDA" ? (
              temDivida && (
                <label className={estilos.linhaCampo}>
                  <span>{modelo.campo}</span>
                  <select value={hipotese.dividaId} onChange={(evento) => atualizar(hipotese.tipo, { dividaId: evento.target.value })} className={campo}>
                    {dividas.map((divida) => (
                      <option key={divida.id} value={divida.id}>
                        {divida.nome} · {formatarMoeda(divida.saldoCentavos)}
                      </option>
                    ))}
                  </select>
                </label>
              )
            ) : (
              <>
                <label className={estilos.linhaValor}>
                  <span>{modelo.campo}</span>
                  <span className={estilos.valorDigitado}>
                    R${" "}
                    <input
                      value={hipotese.valor}
                      onChange={(evento) => atualizar(hipotese.tipo, { valor: evento.target.value })}
                      inputMode="decimal"
                      placeholder="0,00"
                      aria-label={`${modelo.campo} em reais`}
                    />
                  </span>
                </label>
                {modelo.regua && (
                  <input
                    type="range"
                    min={modelo.regua.minimo}
                    max={modelo.regua.maximo}
                    step={modelo.regua.passo}
                    value={Math.min(modelo.regua.maximo, Math.max(modelo.regua.minimo, valorNumero))}
                    onChange={(evento) => atualizar(hipotese.tipo, { valor: evento.target.value })}
                    aria-label={modelo.campo}
                    className={estilos.regua}
                  />
                )}
              </>
            )}

            <div className={estilos.extras}>
              {(hipotese.tipo === "NOVA_COMPRA_PARCELADA" || hipotese.tipo === "NOVO_EMPRESTIMO") && (
                <label>
                  <span>Parcelas</span>
                  <input value={hipotese.parcelas} onChange={(evento) => atualizar(hipotese.tipo, { parcelas: evento.target.value })} inputMode="numeric" className={campo} />
                </label>
              )}
              {hipotese.tipo === "NOVO_EMPRESTIMO" && (
                <label>
                  <span>Juros % ao mês</span>
                  <input value={hipotese.juros} onChange={(evento) => atualizar(hipotese.tipo, { juros: evento.target.value })} placeholder="da proposta" inputMode="decimal" className={campo} />
                </label>
              )}
              <label>
                <span>{MENSAIS.includes(hipotese.tipo) ? "A partir de" : "Em"}</span>
                <select value={hipotese.competencia} onChange={(evento) => atualizar(hipotese.tipo, { competencia: evento.target.value })} className={campo}>
                  {Array.from({ length: 13 }, (_, indice) => competenciaMaisMeses(inicial, indice)).map((mes) => (
                    <option key={mes} value={mes}>
                      {rotuloCompetencia(mes, true)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {aviso && (
              <p className={estilos.falta}>
                {aviso}
                {!temDivida && (hipotese.tipo === "QUITAR_DIVIDA" || hipotese.tipo === "PAGAMENTO_EXTRA") && (
                  <> <Link href="/dividas">Cadastrar dívida</Link></>
                )}
              </p>
            )}

            {hipotese.tipo === "GUARDAR" && longoPrazo && (
              <p className={estilos.longoPrazo}>
                Mantido por {ANOS_GUARDANDO} anos e investido, vira <b>{formatarMoeda(longoPrazo.patrimonioCentavos)}</b>:{" "}
                {formatarMoeda(longoPrazo.aportadoCentavos)} guardados e {formatarMoeda(longoPrazo.jurosCentavos)} de rendimento, a{" "}
                {formatarPercentual(RENDIMENTO_REAL_ANUAL_BPS, 0)} ao ano acima da inflação.
              </p>
            )}
          </section>
        )
      })}

      {erro && comparacao && <p role="alert" className={estilos.erro}>{erro}</p>}

      {base && cenario && (
        <section className={cn("ficha", estilos.resultado)}>
          <header>
            <h2>Patrimônio mês a mês</h2>
            <small>{calculando ? "Calculando…" : `${meses} meses`}</small>
          </header>

          <Grafico base={base.meses} cenario={simulando ? cenario.meses : null} piora={simulando && diferenca < 0} />

          {simulando ? (
            <>
              <div className={estilos.comparar}>
                <div>
                  <small>Sem mudar</small>
                  <b>{formatarMoeda(base.patrimonioFinalCentavos)}</b>
                </div>
                <div className={estilos.comMudanca} data-piora={diferenca < 0 || undefined}>
                  <small>Com a mudança</small>
                  <b>{formatarMoeda(cenario.patrimonioFinalCentavos)}</b>
                </div>
              </div>
              <p className={estilos.resumo}>
                <b data-piora={diferenca < 0 || undefined}>
                  {diferenca >= 0 ? "+" : "−"}
                  {formatarMoeda(Math.abs(diferenca))}
                </b>{" "}
                em {meses} meses · {cenario.primeiroMesNegativo ? `a conta fica no vermelho em ${rotuloCompetencia(cenario.primeiroMesNegativo, true)}` : "a conta não fica no vermelho"}
              </p>
            </>
          ) : (
            <p className={estilos.resumo}>Escolha acima o que testar para ver o antes e o depois.</p>
          )}

          {/* Os três números que explicam o patrimônio, sempre do cenário que
              está na tela. "Não no período" só aparece quando há dívida: sem
              dívida nenhuma soaria como problema, e é o oposto. */}
          <dl className={estilos.numeros}>
            <div>
              <dt>Conta no vermelho</dt>
              <dd data-tom={(simulando ? cenario : base).primeiroMesNegativo ? "negativo" : "positivo"}>
                {(simulando ? cenario : base).primeiroMesNegativo ? rotuloCompetencia((simulando ? cenario : base).primeiroMesNegativo!, true) : "não chega lá"}
              </dd>
            </div>
            <div>
              <dt>Juros no caminho</dt>
              <dd>{formatarMoedaCurta((simulando ? cenario : base).totalJurosCentavos)}</dd>
            </div>
            <div>
              <dt>Dívidas acabam</dt>
              <dd data-tom={!temDivida || (simulando ? cenario : base).mesQuitacao ? "positivo" : undefined}>
                {temDivida ? ((simulando ? cenario : base).mesQuitacao ? rotuloCompetencia((simulando ? cenario : base).mesQuitacao!, true) : "não no período") : "sem dívidas"}
              </dd>
            </div>
          </dl>

          {/* A simulação morria na tela: a pessoa via o número bom e não
              tinha como transformar isso em compromisso. */}
          {simulando && diferenca > 0 && (
            <div className={estilos.acoes}>
              <Link href="/metas" className={estilos.acaoPrincipal}>Transformar em meta</Link>
              <Link href="/orcamento" className={estilos.acaoSecundaria}>Virar orçamento</Link>
            </div>
          )}

          {simulando && comparacao.veredito.length > 0 && (
            <Detalhe titulo="Por que esse é o resultado">
              {comparacao.veredito.map((frase) => (
                <p key={frase}>{frase}</p>
              ))}
            </Detalhe>
          )}

          <Detalhe titulo="Ver mês a mês">
            <ul className={estilos.meses}>
              {(simulando ? cenario : base).meses.map((mes) => (
                <li key={mes.competencia}>
                  <span>
                    <b>{rotuloCompetencia(mes.competencia, true)}</b>
                    <small>
                      entra {formatarMoedaCurta(mes.receitasCentavos)} · vida {formatarMoedaCurta(mes.custoDeVidaCentavos)}
                      {mes.parcelasCentavos > 0 && ` · parcelas ${formatarMoedaCurta(mes.parcelasCentavos)}`}
                      {mes.parcelasDividaCentavos + mes.pagamentoExtraCentavos > 0 && ` · dívida ${formatarMoedaCurta(mes.parcelasDividaCentavos + mes.pagamentoExtraCentavos)}`}
                      {mes.jurosCentavos > 0 && ` · juros ${formatarMoedaCurta(mes.jurosCentavos)}`}
                    </small>
                    {mes.eventos.length > 0 && <small className={estilos.evento}>{mes.eventos.join(" · ")}</small>}
                  </span>
                  <span className={estilos.saldoMes} data-piora={mes.saldoAcumuladoCentavos < 0 || undefined}>
                    <small>em conta</small>
                    {formatarMoeda(mes.saldoAcumuladoCentavos)}
                  </span>
                </li>
              ))}
            </ul>
          </Detalhe>
        </section>
      )}
    </div>
  )
}

/**
 * Patrimônio mês a mês: a linha pontilhada é o ritmo de hoje, a cheia é com a
 * mudança, e a faixa entre elas é a diferença. Sem hipótese, só a pontilhada
 * vira cheia — não há o que comparar.
 *
 * O eixo não começa no zero: com patrimônio de R$ 28 mil, uma diferença de
 * R$ 4 mil numa escala que começa no zero vira duas linhas coladas. Os
 * valores exatos ficam no texto logo abaixo, e a linha do zero aparece quando
 * o patrimônio cruza para o negativo — é o único ponto do eixo que muda a
 * leitura. Mede a largura real, como o gráfico do plano, para os círculos não
 * virarem elipses.
 */
function Grafico({ base, cenario, piora }: { base: Mes[]; cenario: Mes[] | null; piora: boolean }) {
  const caixa = useRef<HTMLDivElement>(null)
  const [largura, setLargura] = useState(320)
  const [escolhido, setEscolhido] = useState<number | null>(null)

  useEffect(() => {
    const elemento = caixa.current
    if (!elemento) return
    const observador = new ResizeObserver(([entrada]) => setLargura(Math.max(200, Math.round(entrada.contentRect.width))))
    observador.observe(elemento)
    return () => observador.disconnect()
  }, [])

  if (base.length === 0) return <p className={estilos.resumo}>Sem dados para projetar.</p>

  const altura = 170
  const chao = altura - 24
  const margem = 8
  const valores = [...base, ...(cenario ?? [])].map((mes) => mes.patrimonioLiquidoCentavos)
  let minimo = Math.min(...valores)
  let maximo = Math.max(...valores)
  if (maximo === minimo) {
    minimo -= 100
    maximo += 100
  }
  const folga = (maximo - minimo) * 0.08
  minimo -= folga
  maximo += folga
  const x = (indice: number) => margem + (base.length > 1 ? (indice * (largura - margem * 2)) / (base.length - 1) : (largura - margem * 2) / 2)
  const y = (valor: number) => 10 + (1 - (valor - minimo) / (maximo - minimo)) * (chao - 10)
  const pontos = (serie: Mes[]) => serie.map((mes, indice) => `${x(indice).toFixed(1)},${y(mes.patrimonioLiquidoCentavos).toFixed(1)}`)
  const linhaBase = pontos(base)
  const linhaCenario = cenario ? pontos(cenario) : null
  const faixa = linhaCenario ? `M${linhaCenario.join(" L")} L${[...linhaBase].reverse().join(" L")} Z` : null
  const ultimo = base.length - 1
  const indice = escolhido ?? ultimo
  const rotulos = [...new Set([0, Math.round(ultimo / 2), ultimo])]
  const cruzaZero = minimo < 0 && maximo > 0

  function escolherPeloPonteiro(evento: React.PointerEvent<SVGSVGElement>) {
    const retangulo = evento.currentTarget.getBoundingClientRect()
    const passo = (largura - margem * 2) / Math.max(1, ultimo)
    setEscolhido(Math.min(ultimo, Math.max(0, Math.round((evento.clientX - retangulo.left - margem) / passo))))
  }

  const mesBase = base[indice]
  const mesCenario = cenario?.[indice]
  return (
    <div ref={caixa} className={estilos.grafico} data-piora={piora || undefined}>
      <svg
        width={largura}
        height={altura}
        role="img"
        aria-label={
          cenario
            ? `Patrimônio em ${rotuloCompetencia(base[ultimo].competencia, true)}: ${formatarMoeda(cenario[ultimo].patrimonioLiquidoCentavos)} com a mudança, ${formatarMoeda(base[ultimo].patrimonioLiquidoCentavos)} sem mudar.`
            : `Patrimônio de ${formatarMoeda(base[0].patrimonioLiquidoCentavos)} em ${rotuloCompetencia(base[0].competencia, true)} a ${formatarMoeda(base[ultimo].patrimonioLiquidoCentavos)} em ${rotuloCompetencia(base[ultimo].competencia, true)}.`
        }
        onPointerDown={escolherPeloPonteiro}
        onPointerMove={(evento) => evento.buttons > 0 && escolherPeloPonteiro(evento)}
      >
        {cruzaZero && <line x1={margem} x2={largura - margem} y1={y(0)} y2={y(0)} className={estilos.zero} />}
        {faixa && <path d={faixa} className={estilos.faixa} />}
        <polyline points={linhaBase.join(" ")} className={cenario ? estilos.linhaBase : estilos.linha} />
        {linhaCenario && <polyline points={linhaCenario.join(" ")} className={estilos.linha} />}
        <line x1={x(indice)} x2={x(indice)} y1={6} y2={chao} className={estilos.guia} />
        <circle cx={x(indice)} cy={y(mesBase.patrimonioLiquidoCentavos)} r={cenario ? 4 : 5} className={cenario ? estilos.pontoBase : estilos.ponto} />
        {mesCenario && <circle cx={x(indice)} cy={y(mesCenario.patrimonioLiquidoCentavos)} r={5} className={estilos.ponto} />}
        {rotulos.map((posicao) => (
          <text key={posicao} x={x(posicao)} y={altura - 6} textAnchor={posicao === 0 ? "start" : posicao === ultimo ? "end" : "middle"} className={estilos.mesEixo}>
            {rotuloCompetencia(base[posicao].competencia, true)}
          </text>
        ))}
      </svg>
      <p className={estilos.leitura}>
        <b>{rotuloCompetencia(mesBase.competencia, true)}</b>
        {mesCenario ? (
          <>
            <span><i className={estilos.marcaLinha} aria-hidden />com a mudança {formatarMoeda(mesCenario.patrimonioLiquidoCentavos)}</span>
            <span><i className={estilos.marcaBase} aria-hidden />sem mudar {formatarMoeda(mesBase.patrimonioLiquidoCentavos)}</span>
          </>
        ) : (
          <span>{formatarMoeda(mesBase.patrimonioLiquidoCentavos)}</span>
        )}
      </p>
    </div>
  )
}
