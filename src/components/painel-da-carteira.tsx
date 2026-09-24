"use client"

import { useEffect, useState } from "react"

import { buscar, enviar } from "@/lib/cliente"
import { formatarMoeda, paraCentavos } from "@/lib/dinheiro"
import { aporteQueReequilibra, corteViraPatrimonio, posicaoDoArca, type ClasseDeAtivo } from "@/lib/tino/investir"
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

      {/* Recolhido numa linha: a pergunta do dia é "como estão meus ativos";
          a do método, "onde ponho o próximo dinheiro", é de uma vez por mês. */}
      <details className={cn("ficha", estilos.recolhido)}>
        <summary>
          <span>
            <b>Onde pôr o próximo dinheiro</b>
            <small>
              {noMetodo > 0 && maisAtras && atrasoPontos > 0
                ? `${maisAtras.rotulo} está ${atrasoPontos} pontos abaixo do alvo`
                : "Escolha a classe de cada investimento para o método ARCA enxergar"}
            </small>
          </span>
        </summary>
        <div className={estilos.recolhidoCorpo}>
          {noMetodo > 0 && <OndePorODinheiro carteira={carteira} letras={letras} />}
          <p className={estilos.nota}>
            O traço na régua é o alvo de 25% de cada parte, do método ARCA (Grupo Primo). Parâmetro escolhido; cálculo, não recomendação — o app não diz qual ativo comprar.
            {foraDoMetodoCentavos > 0 && <> {formatarMoeda(foraDoMetodoCentavos)} fica fora do método (cripto e outros).</>}
            {semClasse > 0 && <> {semClasse} {semClasse === 1 ? "investimento está" : "investimentos estão"} sem classe.</>}
          </p>
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
 * Cores das quatro letras (Davi, 24/09: "mais forte e real"). Saturadas, como
 * nos apps de corretora, e afastadas no círculo de cor para não se
 * confundirem: verde (ações daqui), laranja (imóveis), roxo (caixa e renda
 * fixa) e azul (exterior). Cada uma tem um tom claro e um escuro, para a
 * régua ganhar volume em degradê. Os cartões dos ativos usam as mesmas.
 */
const COR_DA_LETRA = [
  { cor: "oklch(0.8 0.23 145)", escura: "oklch(0.62 0.2 150)" },
  { cor: "oklch(0.77 0.17 60)", escura: "oklch(0.64 0.19 45)" },
  { cor: "oklch(0.66 0.2 295)", escura: "oklch(0.5 0.22 290)" },
  { cor: "oklch(0.68 0.19 250)", escura: "oklch(0.52 0.21 260)" },
]

/**
 * Onde pôr o próximo dinheiro (Davi, 23/09: opção A do canvas, "uma lista
 * só"). Antes eram duas listas seguidas com as mesmas quatro partes — a
 * composição com "p.p." e, embaixo, a divisão do aporte. Agora cada parte tem
 * uma linha: quanto pesa, uma régua com o traço do alvo, quanto falta e quanto
 * do aporte vai para ela.
 *
 * O valor mensal combinado fica gravado (`/api/investir/objetivo`): quem volta
 * na semana seguinte vê o que decidiu, não um campo vazio.
 */
function OndePorODinheiro({
  carteira,
  letras,
}: {
  carteira: { classe: ClasseDeAtivo; valorCentavos: number }[]
  letras: ReturnType<typeof posicaoDoArca>["letras"]
}) {
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
  const partes = aporteQueReequilibra(aporte, carteira)
  const opcoes = [...new Set([...(objetivo?.valorMensalCentavos ? [objetivo.valorMensalCentavos] : []), ...ATALHOS_DE_APORTE])]
  const prazo = objetivo?.prazoAnos ?? 10
  const futuro = objetivo?.valorMensalCentavos
    ? corteViraPatrimonio({ cortePorMesCentavos: objetivo.valorMensalCentavos, anos: prazo, rendimentoRealAnualBps: RENDIMENTO_REAL_ANUAL_BPS })
    : null
  // A régua cabe a maior parte e deixa o alvo sempre no mesmo lugar dentro
  // do cartão: com 65% em caixa, uma escala de 0 a 100 espremeria as outras.
  const topoDaRegua = Math.max(40, ...letras.map((letra) => letra.atualBps / 100)) * 1.05
  const curto = (centavos: number) => formatarMoeda(centavos).replace(",00", "")

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
    <div className={estilos.onde}>
      <p className={estilos.pergunta}>Quanto vai investir?</p>
      <div className={estilos.chips} role="group" aria-label="Quanto vai investir">
        {opcoes.map((opcao) => (
          <button key={opcao} type="button" aria-pressed={!digitando && valor === opcao} onClick={() => { setDigitando(false); setValor(opcao) }}>
            {curto(opcao)}
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

      <ul className={estilos.partes}>
        {letras.map((letra, indice) => {
          const atual = Math.round(letra.atualBps / 100)
          const alvo = Math.round(letra.alvoBps / 100)
          const distancia = alvo - atual
          const parte = partes.find((item) => item.rotulo === letra.rotulo)?.valorCentavos ?? 0
          const { cor, escura } = COR_DA_LETRA[indice] ?? COR_DA_LETRA[0]
          return (
            <li key={`${letra.letra}-${letra.rotulo}`} style={{ "--cor": cor, "--cor-escura": escura } as React.CSSProperties}>
              <span className={estilos.parteTopo}>
                <i aria-hidden />
                <b>{letra.rotulo}</b>
                <small>{atual}% de {alvo}%</small>
              </span>
              <span className={estilos.regua} role="img" aria-label={`${letra.rotulo}: ${atual}% da carteira, alvo ${alvo}%`}>
                <span style={{ width: `${Math.min(100, (atual / topoDaRegua) * 100)}%` }} />
                <em style={{ left: `${(alvo / topoDaRegua) * 100}%` }} />
              </span>
              <span className={estilos.parteBase}>
                <small>{distancia > 0 ? `falta ${distancia} ${distancia === 1 ? "ponto" : "pontos"}` : distancia < 0 ? `passou ${-distancia} ${distancia === -1 ? "ponto" : "pontos"}` : "no alvo"}</small>
                {aporte > 0 && <b data-zero={parte === 0 || undefined}>{parte > 0 ? `+${formatarMoeda(parte)}` : "não recebe"}</b>}
              </span>
            </li>
          )
        })}
      </ul>

      <footer className={estilos.rodapeAporte}>
        <span>
          {futuro
            ? <>Combinado: {curto(objetivo!.valorMensalCentavos)} por mês. Em {prazo} anos, {formatarMoeda(futuro.patrimonioCentavos)} — a {RENDIMENTO_REAL_ANUAL_BPS / 100}% ao ano acima da inflação.</>
            : "Nenhum valor mensal combinado ainda."}
        </span>
        {aporte > 0 && aporte !== objetivo?.valorMensalCentavos && (
          <button type="button" onClick={() => void combinar()} disabled={salvando} className={estilos.combinar}>
            {salvando ? "Salvando…" : `Investir ${curto(aporte)} todo mês`}
          </button>
        )}
      </footer>
      {erro && <p role="alert" className={estilos.erro}>{erro}</p>}
    </div>
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
