"use client"

import { useEffect, useState } from "react"

import { buscar, enviar } from "@/lib/cliente"
import { formatarMoeda, paraCentavos } from "@/lib/dinheiro"
import { aporteQueReequilibra, corteViraPatrimonio, LETRAS_DO_ARCA, posicaoDoArca, type ClasseDeAtivo } from "@/lib/tino/investir"
import { cn } from "@/lib/utils"
import estilos from "./painel-da-carteira.module.css"

/**
 * O painel da carteira (Davi, 23/09: opção A do canvas).
 *
 * Um número, uma barra e a próxima ação: o total, a composição pelas quatro
 * letras do ARCA com a distância do alvo ao lado de cada uma, e para onde vai
 * o próximo aporte. Substitui o desenho do Gorila de 15/09, que tinha uma
 * rosca por classe e, mais abaixo, a régua por letra — dois recortes do mesmo
 * dinheiro que davam números diferentes ("54% em renda fixa" e "75% em caixa e
 * renda fixa") — e repetia a distância do alvo no bloco "Separar por mês".
 *
 * **A evolução patrimonial existe a partir de 15/09/2026.** Ela precisa de
 * histórico, e o Tino guardava só a posição de hoje. Agora cada visita grava o
 * retrato do mês corrente (`/api/carteira/retrato`), e a linha é desenhada com
 * o que foi de fato registrado. Nenhum mês é calculado para trás: a série
 * começa no primeiro mês em que alguém abriu esta tela, e a tela diz isso em
 * vez de desenhar um passado que ninguém viveu. Fica recolhida junto com o
 * desempenho, que só tem número a partir do segundo mês.
 */

/**
 * As cores das classes.
 *
 * Uma rampa análoga, do verde da marca ao azul, com **chroma baixo**. A versão
 * anterior usava hues saturados de referência (0.24 de chroma) e o resultado na
 * tela foi neon brigando com neon: sete cores gritando no mesmo anel de 200px,
 * nenhuma delas deixando a outra ser lida.
 *
 * A ordem da rampa é a ordem do risco: verde na ponta de renda variável, azul
 * escuro no que é caixa. Isso faz a cor dizer alguma coisa em vez de só
 * separar.
 *
 * Contraste sobre o fundo escuro, calculado (OKLab → sRGB linear → WCAG):
 * 13,4 · 10,1 · 7,4 · 5,3 · 3,8 · 2,7 · 1,9:1. As três últimas são faixa de
 * barra e ponto de legenda, nunca texto — texto usa a cor do tema.
 */
const TINTA: Record<ClasseDeAtivo, string> = {
  ACOES: "oklch(0.84 0.16 150)",
  FII: "oklch(0.76 0.11 175)",
  INTERNACIONAL: "oklch(0.68 0.09 200)",
  CRIPTO: "oklch(0.6 0.07 225)",
  RENDA_FIXA: "oklch(0.52 0.05 250)",
  CAIXA: "oklch(0.44 0.03 260)",
  OUTROS: "oklch(0.36 0.02 265)",
}

export interface PosicaoDaCarteira {
  id: string
  nome: string
  classe: ClasseDeAtivo | null
  /** Valor de mercado quando há cotação; o aportado quando não há. */
  valorCentavos: number
  /** O que foi colocado. Serve para mostrar o ganho. */
  aportadoCentavos: number
  ticker?: string | null
  variacaoPercentual?: number | null
}

interface RetratoMensal {
  competencia: string
  totalCentavos: number
  aportadoCentavos: number
}

export function PainelDaCarteira({ posicoes, topo, depoisDoResumo }: { posicoes: PosicaoDaCarteira[]; topo?: React.ReactNode; depoisDoResumo?: React.ReactNode }) {
  const [historico, setHistorico] = useState<RetratoMensal[]>([])
  const [cdi, setCdi] = useState<{ percentual: number; fonte: string } | null>(null)

  const total = posicoes.reduce((soma, linha) => soma + linha.valorCentavos, 0)
  const aportado = posicoes.reduce((soma, linha) => soma + linha.aportadoCentavos, 0)

  // Grava o retrato do mês e traz a série de volta. Fica ANTES do `return`
  // curto de carteira vazia: hook depois de `return` muda de quantidade entre
  // um render e outro, e o React quebra.
  useEffect(() => {
    if (total <= 0) return

    const porClasse: Record<string, number> = {}
    for (const posicao of posicoes) {
      const chave = posicao.classe ?? "SEM_CLASSE"
      porClasse[chave] = (porClasse[chave] ?? 0) + posicao.valorCentavos
    }

    void fetch("/api/carteira/retrato", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ totalCentavos: total, aportadoCentavos: aportado, porClasse }),
    })
      .then(() => fetch("/api/carteira/retrato"))
      .then((resposta) => resposta.json())
      .then((serie: RetratoMensal[]) => setHistorico(Array.isArray(serie) ? serie : []))
      .catch(() => setHistorico([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total, aportado, posicoes.length])

  useEffect(() => {
    fetch("/api/cdi")
      .then((resposta) => resposta.json())
      .then((valor) => setCdi(valor?.percentual !== undefined ? valor : null))
      .catch(() => setCdi(null))
  }, [])

  if (total <= 0) return null

  // O mesmo recorte em toda a tela: as quatro letras do ARCA. O anel antigo
  // mostrava "54% em renda fixa" e a régua logo abaixo "75% em caixa e renda
  // fixa" — dois cortes do mesmo dinheiro, e a pessoa não sabia qual valia.
  const carteira = posicoes.map((posicao) => ({ classe: posicao.classe ?? ("OUTROS" as ClasseDeAtivo), valorCentavos: posicao.valorCentavos }))
  const { letras, totalCentavos: noMetodo, foraDoMetodoCentavos } = posicaoDoArca(carteira)
  const semClasse = posicoes.filter((linha) => !linha.classe).length
  const segmentos = [
    ...letras.map((letra) => ({ chave: `${letra.letra}-${letra.rotulo}`, cor: TINTA[letra.classes[0]], valor: letra.atualCentavos })),
    { chave: "fora", cor: "color-mix(in oklab, var(--foreground), transparent 80%)", valor: foraDoMetodoCentavos },
  ].filter((segmento) => segmento.valor > 0)

  // A letra mais atrás do alvo resume o equilíbrio numa linha — é ela que
  // recebe a maior parte do próximo aporte.
  const maisAtras = [...letras].sort((a, b) => a.atualBps - a.alvoBps - (b.atualBps - b.alvoBps))[0]
  const atrasoPontos = maisAtras ? Math.round((maisAtras.alvoBps - maisAtras.atualBps) / 100) : 0

  return (
    <>
      {topo}

      {/* Os ativos, com a cara da corretora, logo depois do patrimônio: é a
          parte que muda todo dia. */}
      {depoisDoResumo}

      {/* Equilíbrio e próximo aporte recolhidos numa linha (opção A do
          canvas): a pergunta do dia é "como estão meus ativos"; a do método,
          "onde ponho o próximo dinheiro", é de uma vez por mês. */}
      <details className={cn("ficha", estilos.recolhido)}>
        <summary>
          <span>
            <b>Equilíbrio e próximo aporte</b>
            <small>
              {noMetodo > 0 && maisAtras && atrasoPontos > 0
                ? `${maisAtras.rotulo} −${atrasoPontos} p.p. · o próximo dinheiro vai mais para lá`
                : "Escolha a classe de cada investimento para o método ARCA enxergar"}
            </small>
          </span>
        </summary>
        <div className={estilos.recolhidoCorpo}>
          <div className={estilos.barra} role="img" aria-label={`Carteira: ${letras.map((letra) => `${letra.rotulo} ${Math.round(letra.atualBps / 100)}%`).join(", ")}`}>
            {segmentos.map((segmento) => (
              <i key={segmento.chave} style={{ flexGrow: segmento.valor, background: segmento.cor }} />
            ))}
          </div>
          <ul className={estilos.letras}>
            {letras.map((letra) => {
              const pontos = Math.round((letra.atualBps - letra.alvoBps) / 100)
              return (
                <li key={`${letra.letra}-${letra.rotulo}`}>
                  <i style={{ background: TINTA[letra.classes[0]] }} aria-hidden />
                  <span>{letra.rotulo}</span>
                  <small>{formatarMoeda(letra.atualCentavos)}</small>
                  <b>{Math.round(letra.atualBps / 100)}%</b>
                  {/* Longe do alvo (5 p.p. ou mais) ganha cor; perto fica neutro,
                      para a cor apontar só o que pede ação. */}
                  <em data-longe={Math.abs(pontos) >= 5 || undefined}>{pontos > 0 ? "+" : pontos < 0 ? "−" : ""}{Math.abs(pontos)} p.p.</em>
                </li>
              )
            })}
          </ul>
          <p className={estilos.nota}>
            p.p. é a distância do alvo de 25% por letra, do método ARCA (Grupo Primo). Parâmetro escolhido, não recomendação.
            {foraDoMetodoCentavos > 0 && <> {formatarMoeda(foraDoMetodoCentavos)} fica fora do método (cripto e outros).</>}
            {semClasse > 0 && <> {semClasse} {semClasse === 1 ? "investimento está" : "investimentos estão"} sem classe.</>}
          </p>
          {noMetodo > 0 && <ProximoAporte carteira={carteira} />}
        </div>
      </details>

      <details className={cn("ficha", estilos.recolhido)}>
        <summary>
          <span>
            <b>Desempenho e evolução</b>
            <small>{historico.length >= 2 ? `${historico.length} meses registrados` : "começa a contar este mês"}</small>
          </span>
        </summary>
        <div className={estilos.recolhidoCorpo}>
          <Desempenho historico={historico} total={total} aportado={aportado} cdi={cdi} />
          {historico.length >= 2 && <EvolucaoDaCarteira serie={historico} />}
        </div>
      </details>
    </>
  )
}

const ATALHOS_DE_APORTE = [50_000, 100_000, 200_000]
/// Rendimento real (acima da inflação) usado na projeção. Conservador de
/// propósito: é hipótese, não promessa.
const RENDIMENTO_REAL_ANUAL_BPS = 400

/**
 * Para onde vai o próximo dinheiro (Davi, 23/09: opção A do canvas).
 *
 * É a pergunta que a composição deixa no ar: sabendo que falta internacional,
 * quanto de cada coisa entra no próximo aporte. A conta é a do método —
 * primeiro o que está mais atrás do alvo — e a lista mostra também quem não
 * recebe, com o motivo, para a pessoa não achar que a letra foi esquecida.
 *
 * O valor mensal combinado fica gravado (`/api/investir/objetivo`): quem volta
 * na semana seguinte vê o que decidiu, não um campo vazio.
 */
function ProximoAporte({ carteira }: { carteira: { classe: ClasseDeAtivo; valorCentavos: number }[] }) {
  const [objetivo, setObjetivo] = useState<{ valorMensalCentavos: number; prazoAnos: number } | null>(null)
  const [valor, setValor] = useState<number>(100_000)
  const [outro, setOutro] = useState("")
  const [digitando, setDigitando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState("")

  useEffect(() => {
    buscar<{ valorMensalCentavos: number; prazoAnos: number } | null>("/api/investir/objetivo")
      .then((resposta) => {
        setObjetivo(resposta)
        if (resposta?.valorMensalCentavos) setValor(resposta.valorMensalCentavos)
      })
      .catch(() => setObjetivo(null))
  }, [])

  const aporte = digitando ? paraCentavos(outro || "0") : valor
  const partes = [...aporteQueReequilibra(aporte, carteira)].sort((a, b) => b.valorCentavos - a.valorCentavos)
  const opcoes = [...new Set([...(objetivo?.valorMensalCentavos ? [objetivo.valorMensalCentavos] : []), ...ATALHOS_DE_APORTE])]
  const prazo = objetivo?.prazoAnos ?? 10
  const futuro = objetivo?.valorMensalCentavos
    ? corteViraPatrimonio({ cortePorMesCentavos: objetivo.valorMensalCentavos, anos: prazo, rendimentoRealAnualBps: RENDIMENTO_REAL_ANUAL_BPS })
    : null

  async function combinar() {
    setSalvando(true)
    setErro("")
    try {
      setObjetivo(await enviar("/api/investir/objetivo", { valorMensalCentavos: aporte, prazoAnos: prazo }, "PUT"))
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível salvar.")
    } finally {
      setSalvando(false)
    }
  }

  return (
    <section className={estilos.aporte}>
      <header>
        <h3>Próximo aporte</h3>
        <small>reequilibra a carteira</small>
      </header>
      <div className={estilos.chips} role="group" aria-label="Quanto vai investir">
        {opcoes.map((opcao) => (
          <button key={opcao} type="button" aria-pressed={!digitando && valor === opcao} onClick={() => { setDigitando(false); setValor(opcao) }}>
            {formatarMoeda(opcao).replace(",00", "")}
            {objetivo?.valorMensalCentavos === opcao && <small> · por mês</small>}
          </button>
        ))}
        <button type="button" aria-pressed={digitando} onClick={() => setDigitando(true)}>Outro</button>
      </div>
      {digitando && (
        <label className={estilos.linhaValor}>
          <span>Quanto vai investir</span>
          <span className={estilos.valorDigitado}>
            R$ <input value={outro} onChange={(evento) => setOutro(evento.target.value)} inputMode="decimal" placeholder="0,00" aria-label="Valor do aporte em reais" autoFocus />
          </span>
        </label>
      )}

      {aporte > 0 ? (
        <ul className={estilos.partes}>
          {partes.map((parte) => (
            <li key={`${parte.letra}-${parte.rotulo}`} data-zero={parte.valorCentavos === 0 || undefined}>
              <i style={{ background: TINTA[LETRAS_DO_ARCA.find((letra) => letra.rotulo === parte.rotulo)?.classes[0] ?? "OUTROS"] }} aria-hidden />
              <span>
                {parte.rotulo}
                {parte.valorCentavos === 0 && <small>{parte.porque}</small>}
              </span>
              <b>{formatarMoeda(parte.valorCentavos)}</b>
            </li>
          ))}
        </ul>
      ) : (
        <p className={estilos.nota}>Informe o valor para ver a divisão.</p>
      )}

      <footer className={estilos.rodapeAporte}>
        {futuro ? (
          <span>
            Combinado: {formatarMoeda(objetivo!.valorMensalCentavos)} por mês. Em {prazo} anos, {formatarMoeda(futuro.patrimonioCentavos)} — a {RENDIMENTO_REAL_ANUAL_BPS / 100}% ao ano acima da inflação.
          </span>
        ) : (
          <span>Nenhum valor mensal combinado ainda.</span>
        )}
        {aporte > 0 && aporte !== objetivo?.valorMensalCentavos && (
          <button type="button" onClick={() => void combinar()} disabled={salvando} className={estilos.combinar}>
            {salvando ? "Salvando…" : `Investir ${formatarMoeda(aporte).replace(",00", "")} todo mês`}
          </button>
        )}
      </footer>
      {erro && <p role="alert" className={estilos.erro}>{erro}</p>}
      <p className={estilos.nota}>Cálculo, não recomendação: o app não diz qual ativo comprar dentro de cada letra.</p>
    </section>
  )
}

/**
 * A linha do patrimônio, mês a mês.
 *
 * Desenhada com `polyline` em SVG, não com biblioteca: são poucos pontos, não
 * há interação, e a série cresce um ponto por mês. Trazer um motor de gráfico
 * inteiro para isto custaria mais do que o desenho.
 *
 * Aparece só a partir de dois retratos. Com um ponto não há linha, e uma linha
 * reta de um mês só sugeriria estabilidade que ninguém observou.
 */
function EvolucaoDaCarteira({ serie }: { serie: RetratoMensal[] }) {
  const valores = serie.map((ponto) => ponto.totalCentavos)
  const maior = Math.max(...valores)
  const menor = Math.min(...valores)
  const faixa = Math.max(1, maior - menor)

  const pontos = serie
    .map((ponto, indice) => {
      const x = (indice / Math.max(1, serie.length - 1)) * 100
      // 6% de folga em cima e embaixo: linha encostando na borda parece
      // cortada, e o pico do mês some junto com ela.
      const y = 94 - ((ponto.totalCentavos - menor) / faixa) * 88
      return `${x},${y}`
    })
    .join(" ")

  const primeiro = serie[0]!
  const ultimo = serie.at(-1)!
  const variacao = ultimo.totalCentavos - primeiro.totalCentavos

  return (
    <section className="space-y-3 border-t border-pauta pt-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[calc(13px*var(--escala-letra))] font-medium">Evolução patrimonial</p>
        <p
          className={cn(
            "numero text-[calc(13px*var(--escala-letra))] tabular-nums",
            variacao >= 0 ? "text-positivo" : "text-negativo",
          )}
        >
          {variacao >= 0 ? "+" : "−"}
          {formatarMoeda(Math.abs(variacao))} desde {rotuloCurto(primeiro.competencia)}
        </p>
      </div>

      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-40 w-full" role="img" aria-label="Linha do patrimônio investido mês a mês">
        <defs>
          <linearGradient id="carteira-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--acao)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--acao)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={`0,100 ${pontos} 100,100`} fill="url(#carteira-area)" />
        <polyline
          points={pontos}
          fill="none"
          stroke="var(--acao)"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <div className="flex justify-between text-[max(10px,calc(11px*var(--escala-letra)))] text-[color:var(--texto-3)]">
        <span>{rotuloCurto(primeiro.competencia)}</span>
        <span>{rotuloCurto(ultimo.competencia)}</span>
      </div>

      <p className="text-[calc(11.5px*var(--escala-letra))] leading-relaxed text-[color:var(--texto-3)]">
        A série começa no primeiro mês em que esta tela foi aberta — nenhum mês é calculado para trás. Cada visita
        atualiza o retrato do mês corrente; meses fechados ficam como estavam.
      </p>
    </section>
  )
}

/** "2026-09" → "set/26". */
function rotuloCurto(competencia: string) {
  const [ano, mes] = competencia.split("-")
  const nomes = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]
  return `${nomes[Number(mes) - 1] ?? mes}/${ano?.slice(2) ?? ""}`
}

/**
 * Como a carteira foi.
 *
 * Quatro números, como nas referências: o que rendeu no mês, quanto o CDI
 * rendeu no mesmo mês, quanto isso dá de comparação, e o ganho acumulado sobre
 * o que foi aportado.
 *
 * **A rentabilidade do mês desconta o aporte.** Sem isso, guardar dinheiro
 * apareceria como rendimento — a carteira "renderia" 10% no mês em que a
 * pessoa depositou 10%, o que é a mentira mais comum desse tipo de tela.
 *
 * O CDI vem do Banco Central (`lib/cdi.ts`), série 4391. Sem ele a comparação
 * some; ninguém vê um número inventado.
 */
function Desempenho({
  historico,
  total,
  aportado,
  cdi,
}: {
  historico: RetratoMensal[]
  total: number
  aportado: number
  cdi: { percentual: number; fonte: string } | null
}) {
  const anterior = historico.length >= 2 ? historico[historico.length - 2] : null
  const atual = historico.at(-1) ?? null

  const aporteDoMes = anterior && atual ? atual.aportadoCentavos - anterior.aportadoCentavos : null
  const rendimento =
    anterior && atual && aporteDoMes !== null && anterior.totalCentavos > 0
      ? ((atual.totalCentavos - aporteDoMes - anterior.totalCentavos) / anterior.totalCentavos) * 100
      : null

  const ganho = total - aportado
  const sobreCdi = rendimento !== null && cdi && cdi.percentual > 0 ? (rendimento / cdi.percentual) * 100 : null

  const linhas: { rotulo: string; valor: string; tom?: "positivo" | "negativo" }[] = [
    {
      rotulo: "Rentabilidade no mês",
      valor: rendimento === null ? "—" : `${rendimento >= 0 ? "+" : "−"}${Math.abs(rendimento).toFixed(2).replace(".", ",")}%`,
      tom: rendimento === null ? undefined : rendimento >= 0 ? "positivo" : "negativo",
    },
    {
      rotulo: "CDI no mês",
      valor: cdi ? `${cdi.percentual.toFixed(2).replace(".", ",")}%` : "—",
    },
    {
      rotulo: "Carteira sobre o CDI",
      valor: sobreCdi === null ? "—" : `${sobreCdi.toFixed(0)}%`,
      tom: sobreCdi === null ? undefined : sobreCdi >= 100 ? "positivo" : "negativo",
    },
    {
      rotulo: "Ganho sobre o aportado",
      valor: ganho === 0 ? "—" : `${ganho > 0 ? "+" : "−"}${formatarMoeda(Math.abs(ganho))}`,
      tom: ganho === 0 ? undefined : ganho > 0 ? "positivo" : "negativo",
    },
  ]

  return (
    <div>
      <dl className="space-y-2.5">
        {linhas.map((linha) => (
          <div key={linha.rotulo} className="flex items-baseline justify-between gap-3">
            <dt className="text-[calc(13px*var(--escala-letra))] text-[color:var(--texto-2)]">{linha.rotulo}</dt>
            <dd
              className={cn(
                "numero text-[calc(14px*var(--escala-letra))] font-medium tabular-nums",
                linha.tom === "positivo" && "text-positivo",
                linha.tom === "negativo" && "text-negativo",
                !linha.tom && "text-[color:var(--texto-3)]",
              )}
            >
              {linha.valor}
            </dd>
          </div>
        ))}
      </dl>

      {rendimento === null && (
        <p className="mt-3 text-[calc(11.5px*var(--escala-letra))] leading-relaxed text-[color:var(--texto-3)]">
          A rentabilidade do mês aparece quando houver dois retratos da carteira — o deste mês e o do mês passado. O
          cálculo desconta o que você aportou: dinheiro guardado não é rendimento.
        </p>
      )}
    </div>
  )
}
