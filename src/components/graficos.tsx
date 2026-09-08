"use client"

import { useEffect, useState } from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { formatarMoeda, formatarMoedaCurta } from "@/lib/dinheiro"
import { rotuloCompetencia } from "@/lib/datas"

/**
 * Gráficos do Tino.
 *
 * Regras que valem para todos:
 * - o eixo de valores usa forma curta (R$ 1,2 mil); o número exato aparece no
 *   toque, porque rótulo cheio em 12 meses vira parede de dígitos;
 * - vermelho só para o que está no negativo — cor demais faz a pessoa parar de
 *   notar a cor que importa;
 * - nada de eixo Y começando fora do zero: encolher a escala exagera variação
 *   e é a forma mais comum de um gráfico mentir sem mentir.
 */

/**
 * Cores dos gráficos.
 *
 * Elas nascem de variáveis CSS, que trocam entre tema claro e escuro. Mas o
 * Recharts escreve a cor em **atributo de apresentação** do SVG, e o navegador
 * não expande `var()` ali — a linha sai sem cor nenhuma e o gráfico aparece
 * vazio, com os eixos no lugar.
 *
 * Por isso a cor é resolvida uma vez, no navegador, lendo o valor já computado.
 * Enquanto isso não acontece (primeiro render, servidor), vale `currentColor`,
 * que ao menos desenha.
 */
const TOKENS = {
  positivo: "--lch-positivo",
  negativo: "--lch-negativo",
  atencao: "--lch-atencao",
  destaque: "--lch-destaque",
  alerta: "--lch-alerta",
  dado: "--lch-dado",
  neutro: "--lch-acao",
} as const

type NomeDaCor = keyof typeof TOKENS

function useCores() {
  const [cores, setCores] = useState<Record<NomeDaCor, string>>(() =>
    Object.fromEntries(Object.keys(TOKENS).map((nome) => [nome, "currentColor"])) as Record<NomeDaCor, string>,
  )

  useEffect(() => {
    const ler = () => {
      const estilo = getComputedStyle(document.documentElement)
      setCores(
        Object.fromEntries(
          Object.entries(TOKENS).map(([nome, token]) => {
            const lch = estilo.getPropertyValue(token).trim()
            return [nome, lch ? `oklch(${lch})` : "currentColor"]
          }),
        ) as Record<NomeDaCor, string>,
      )
    }

    ler()

    // O tema troca sem recarregar a página; sem observar a classe do <html> o
    // gráfico ficaria com a cor do tema anterior até a próxima navegação.
    const observador = new MutationObserver(ler)
    observador.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    return () => observador.disconnect()
  }, [])

  return cores
}

/** Ordem das séries em gráfico de várias fatias. */
export const ORDEM_DA_PALETA: NomeDaCor[] = [
  "positivo",
  "dado",
  "atencao",
  "destaque",
  "alerta",
  "neutro",
  "negativo",
]

const eixo = { fontSize: 11, fill: "currentColor", opacity: 0.55 }

function Dica({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { name?: string; value?: number; color?: string; dataKey?: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-xl border border-pauta bg-papel-1 px-3 py-2 shadow-alta">
      {label && <p className="mb-1 text-[11px] uppercase tracking-widest text-muted-fg">{label}</p>}
      {payload.map((linha, indice) => (
        <p key={indice} className="flex items-center gap-2 text-[12px]">
          <span className="size-2 rounded-full" style={{ background: linha.color }} />
          <span className="text-muted-fg">{linha.name}</span>
          <span className="font-medium">{formatarMoeda(Number(linha.value ?? 0))}</span>
        </p>
      ))}
    </div>
  )
}

// ============================================================
// EVOLUÇÃO MENSAL
// ============================================================

export function GraficoEvolucao({
  dados,
  altura = 220,
}: {
  dados: { competencia: string; receitasCentavos: number; despesasCentavos: number }[]
  altura?: number
}) {
  const cores = useCores()
  const serie = dados.map((linha) => ({
    mes: rotuloCompetencia(linha.competencia, true),
    Entrou: linha.receitasCentavos,
    Saiu: linha.despesasCentavos,
  }))

  return (
    <ResponsiveContainer width="100%" height={altura}>
      <AreaChart data={serie} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
        <defs>
          <linearGradient id="entrou" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={cores.positivo} stopOpacity={0.35} />
            <stop offset="100%" stopColor={cores.positivo} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="saiu" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={cores.negativo} stopOpacity={0.3} />
            <stop offset="100%" stopColor={cores.negativo} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="mes" tick={eixo} axisLine={false} tickLine={false} />
        <YAxis tick={eixo} axisLine={false} tickLine={false} tickFormatter={(v) => formatarMoedaCurta(Number(v))} />
        <Tooltip content={<Dica />} />
        <Area type="monotone" dataKey="Entrou" stroke={cores.positivo} strokeWidth={2} fill="url(#entrou)" />
        <Area type="monotone" dataKey="Saiu" stroke={cores.negativo} strokeWidth={2} fill="url(#saiu)" />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ============================================================
// DOZE MESES, MÊS ATUAL DESTACADO
// ============================================================

/**
 * Como cada mês fechou, nos últimos doze.
 *
 * A série é a SOBRA, e não entrou-e-saiu lado a lado: a pergunta que a pessoa
 * traz para cá é "o mês fechou no azul ou no vermelho", e uma barra por mês
 * responde isso de um relance. Entrou e saiu separados obrigam a fazer a
 * subtração de cabeça, doze vezes.
 *
 * A barra desce abaixo da linha quando o mês fechou negativo, e por isso a
 * linha do zero fica visível: sem ela, barra para baixo não significa nada.
 *
 * O mês atual vai cheio e os anteriores em meio-tom. Não é enfeite — o mês
 * corrente ainda não terminou, e comparar um mês pela metade com onze meses
 * fechados é a leitura errada mais fácil de fazer aqui.
 */
export function GraficoDozeMeses({
  dados,
  competenciaDestacada,
  altura = 220,
}: {
  dados: { competencia: string; sobraCentavos: number }[]
  competenciaDestacada: string
  altura?: number
}) {
  const cores = useCores()
  const serie = dados.map((linha) => ({
    mes: rotuloCompetencia(linha.competencia, true),
    competencia: linha.competencia,
    Sobra: linha.sobraCentavos,
  }))

  return (
    <ResponsiveContainer width="100%" height={altura}>
      <BarChart data={serie} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
        <XAxis dataKey="mes" tick={eixo} axisLine={false} tickLine={false} />
        <YAxis tick={eixo} axisLine={false} tickLine={false} tickFormatter={(v) => formatarMoedaCurta(Number(v))} />
        <ReferenceLine y={0} stroke="currentColor" strokeOpacity={0.25} />
        <Tooltip content={<Dica />} cursor={{ fill: "currentColor", fillOpacity: 0.04 }} />
        <Bar dataKey="Sobra" radius={[4, 4, 0, 0]}>
          {serie.map((linha) => (
            <Cell
              key={linha.competencia}
              fill={linha.Sobra < 0 ? cores.negativo : cores.positivo}
              fillOpacity={linha.competencia === competenciaDestacada ? 1 : 0.45}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ============================================================
// GASTOS POR CATEGORIA
// ============================================================

export function GraficoCategorias({
  dados,
  altura = 240,
}: {
  dados: { nome: string; totalCentavos: number }[]
  altura?: number
}) {
  const cores = useCores()
  const paleta = ORDEM_DA_PALETA.map((nome) => cores[nome])
  // Sete fatias já é o limite do que se lê num relance; o resto vira "outras"
  // em vez de virar uma roda de fatias finas sem nome legível.
  const principais = dados.slice(0, 6)
  const resto = dados.slice(6).reduce((soma, linha) => soma + linha.totalCentavos, 0)
  const serie = [...principais, ...(resto > 0 ? [{ nome: "Outras", totalCentavos: resto }] : [])].map((linha) => ({
    name: linha.nome,
    value: linha.totalCentavos,
  }))

  const total = serie.reduce((soma, linha) => soma + linha.value, 0)

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <ResponsiveContainer width="100%" height={altura} className="max-w-[240px]">
        <PieChart>
          <Pie data={serie} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="88%" paddingAngle={2} stroke="none">
            {serie.map((_, indice) => (
              <Cell key={indice} fill={paleta[indice % paleta.length]} />
            ))}
          </Pie>
          <Tooltip content={<Dica />} />
        </PieChart>
      </ResponsiveContainer>

      <ul className="w-full space-y-1.5">
        {serie.map((linha, indice) => (
          <li key={linha.name} className="flex items-center gap-2 text-[13px]">
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: paleta[indice % paleta.length] }} />
            <span className="min-w-0 flex-1 truncate">{linha.name}</span>
            <span className="text-muted-fg">{total > 0 ? `${Math.round((linha.value / total) * 100)}%` : "0%"}</span>
            <span className="w-24 text-right">{formatarMoeda(linha.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * A rosca do Início, no formato do Calen.
 *
 * Diferença para `GraficoCategorias` acima (que continua servindo a Análise):
 * ali a legenda é uma TABELA — nome, percentual e valor em colunas — porque
 * quem abre a Análise foi comparar proporção. Aqui não: o total vai para o
 * buraco do meio, a legenda vira linha simples, e o percentual sai da tela.
 * Percentual na primeira dobra é justamente o que o spec manda tirar
 * (PARTE 3): quem abre o Início quer saber ONDE o dinheiro foi, não em que
 * fração — a fração já está desenhada no tamanho da fatia.
 *
 * Substitui a `BarrasCategorias` aqui (PARTE 1.6). A barra fina não estava
 * errada, mas ela conta "esta categoria contra a maior", e o que o Início
 * precisa contar é "o mês inteiro, repartido" — que é o que uma rosca faz e
 * uma pilha de barras não faz.
 */
export function RoscaCategorias({
  dados,
  altura = 200,
}: {
  dados: { nome: string; totalCentavos: number }[]
  altura?: number
}) {
  const cores = useCores()
  const paleta = ORDEM_DA_PALETA.map((nome) => cores[nome])

  const principais = dados.slice(0, 5)
  const resto = dados.slice(5).reduce((soma, linha) => soma + linha.totalCentavos, 0)
  const serie = [...principais, ...(resto > 0 ? [{ nome: "Outras", totalCentavos: resto }] : [])].map(
    (linha) => ({ name: linha.nome, value: linha.totalCentavos }),
  )
  const total = serie.reduce((soma, linha) => soma + linha.value, 0)

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:gap-6">
      <div className="relative w-full max-w-[200px] shrink-0" style={{ height: altura }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={serie}
              dataKey="value"
              nameKey="name"
              innerRadius="70%"
              outerRadius="98%"
              paddingAngle={2}
              stroke="none"
            >
              {serie.map((_, indice) => (
                <Cell key={indice} fill={paleta[indice % paleta.length]} />
              ))}
            </Pie>
            <Tooltip content={<Dica />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Total no buraco do meio. `pointer-events-none` porque a rosca por
            baixo continua sendo o alvo do toque de cada fatia. */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="numero text-[20px] font-semibold leading-none tracking-tight">
            {formatarMoeda(total)}
          </span>
          <span className="mt-1.5 text-[11px] text-[color:var(--texto-2)]">gasto até hoje</span>
        </div>
      </div>

      <ul className="flex w-full flex-wrap gap-x-4 gap-y-2.5 sm:flex-col sm:flex-nowrap">
        {serie.map((linha, indice) => (
          <li key={linha.name} className="flex min-w-0 items-center gap-2 text-[13px] sm:w-full">
            <span
              aria-hidden
              className="size-2.5 shrink-0 rounded-full"
              style={{ background: paleta[indice % paleta.length] }}
            />
            <span className="min-w-0 truncate sm:flex-1">{linha.name}</span>
            <span className="numero shrink-0 text-[13px] font-medium sm:text-right">
              {formatarMoeda(linha.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ============================================================
// FLUXO DE CAIXA PROJETADO
// ============================================================

export function GraficoFluxo({
  dados,
  altura = 260,
  comparar,
}: {
  dados: { competencia: string; saldoAcumuladoCentavos: number }[]
  altura?: number
  /// Série do cenário atual, para o simulador desenhar o antes por baixo.
  comparar?: { competencia: string; saldoAcumuladoCentavos: number }[]
}) {
  const cores = useCores()
  const serie = dados.map((linha, indice) => ({
    mes: rotuloCompetencia(linha.competencia, true),
    Simulado: linha.saldoAcumuladoCentavos,
    ...(comparar ? { Hoje: comparar[indice]?.saldoAcumuladoCentavos ?? null } : {}),
  }))

  return (
    <ResponsiveContainer width="100%" height={altura}>
      <AreaChart data={serie} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
        <defs>
          <linearGradient id="fluxo" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={cores.neutro} stopOpacity={0.35} />
            <stop offset="100%" stopColor={cores.neutro} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="mes" tick={eixo} axisLine={false} tickLine={false} interval="preserveStartEnd" />
        <YAxis tick={eixo} axisLine={false} tickLine={false} tickFormatter={(v) => formatarMoedaCurta(Number(v))} />
        <Tooltip content={<Dica />} />
        {/* A linha do zero é a informação mais importante do gráfico: é ela que
            mostra em que mês o dinheiro acaba. */}
        <ReferenceLine y={0} stroke={cores.negativo} strokeDasharray="4 4" strokeOpacity={0.6} />
        {comparar && <Line type="monotone" dataKey="Hoje" stroke="currentColor" strokeOpacity={0.35} strokeWidth={1.5} dot={false} />}
        <Area
          type="monotone"
          dataKey="Simulado"
          name={comparar ? "Simulado" : "Saldo"}
          stroke={cores.neutro}
          strokeWidth={2}
          fill="url(#fluxo)"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ============================================================
// COMPROMISSO FUTURO (PARCELAS)
// ============================================================

export function GraficoParcelas({
  dados,
  altura = 200,
}: {
  dados: { competencia: string; totalCentavos: number }[]
  altura?: number
}) {
  const cores = useCores()
  const serie = dados.map((linha) => ({
    mes: rotuloCompetencia(linha.competencia, true),
    Parcelas: linha.totalCentavos,
  }))

  return (
    <ResponsiveContainer width="100%" height={altura}>
      <BarChart data={serie} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
        <XAxis dataKey="mes" tick={eixo} axisLine={false} tickLine={false} />
        <YAxis tick={eixo} axisLine={false} tickLine={false} tickFormatter={(v) => formatarMoedaCurta(Number(v))} />
        <Tooltip content={<Dica />} cursor={{ fill: "currentColor", opacity: 0.04 }} />
        <Bar dataKey="Parcelas" fill={cores.atencao} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ============================================================
// PROGRESSO DE META / ORÇAMENTO
// ============================================================

export function GraficoAnel({
  percentual,
  rotulo,
  valor,
  altura = 160,
}: {
  percentual: number
  rotulo: string
  valor: string
  altura?: number
}) {
  const cores = useCores()
  const limitado = Math.max(0, Math.min(100, percentual))
  const cor = percentual > 100 ? cores.negativo : percentual >= 80 ? cores.atencao : cores.positivo

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={altura}>
        <RadialBarChart
          data={[{ name: rotulo, value: limitado }]}
          innerRadius="72%"
          outerRadius="100%"
          startAngle={90}
          endAngle={-270}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar dataKey="value" cornerRadius={999} fill={cor} background={{ fill: "currentColor", opacity: 0.07 }} />
        </RadialBarChart>
      </ResponsiveContainer>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[20px] font-semibold leading-none tracking-tight">{valor}</span>
        <span className="mt-1 text-[11px] uppercase tracking-widest text-muted-fg">{rotulo}</span>
      </div>
    </div>
  )
}

// ============================================================
// EFEITO DO CORTE
// ============================================================

/**
 * Duas linhas: o caixa como está e o caixa com o corte.
 *
 * A comparação é o ponto — uma linha sozinha não responde "adianta cortar".
 * A linha do jeito que está é tracejada e discreta: ela é o passado que se quer
 * mudar, não o plano.
 *
 * A régua no zero fica sempre visível, mesmo quando as duas linhas estão no
 * azul. É a fronteira que a pessoa precisa enxergar antes de chegar nela.
 */
export function GraficoDoCorte({
  dados,
  altura = 260,
}: {
  dados: { mes: number; semCorteCentavos: number; comCorteCentavos: number }[]
  altura?: number
}) {
  const cores = useCores()
  return (
    <ResponsiveContainer width="100%" height={altura}>
      <AreaChart data={dados} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="areaCorte" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={cores.positivo} stopOpacity={0.28} />
            <stop offset="100%" stopColor={cores.positivo} stopOpacity={0} />
          </linearGradient>
        </defs>

        <XAxis
          dataKey="mes"
          tick={eixo}
          tickLine={false}
          axisLine={false}
          tickFormatter={(mes: number) => `${mes}m`}
          interval="preserveStartEnd"
        />
        <YAxis tick={eixo} tickLine={false} axisLine={false} width={62} tickFormatter={formatarMoedaCurta} />
        <ReferenceLine y={0} stroke="currentColor" strokeOpacity={0.35} />
        <Tooltip
          content={<Dica />}
          labelFormatter={(mes) => `daqui a ${mes} ${Number(mes) === 1 ? "mês" : "meses"}`}
        />

        <Area
          type="monotone"
          dataKey="semCorteCentavos"
          name="do jeito que está"
          stroke={cores.negativo}
          strokeWidth={1.5}
          strokeDasharray="4 4"
          fill="none"
        />
        <Area
          type="monotone"
          dataKey="comCorteCentavos"
          name="cortando"
          stroke={cores.positivo}
          strokeWidth={2.5}
          fill="url(#areaCorte)"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

/**
 * Divisão da renda em fatias.
 *
 * Rosca, e não pizza cheia: o buraco no meio guarda o total, que é a primeira
 * coisa que a pessoa procura ao ver a divisão do próprio salário.
 */
export function GraficoDaDivisao({
  fatias,
  total,
  altura = 240,
}: {
  fatias: { rotulo: string; valorCentavos: number }[]
  total: string
  altura?: number
}) {
  const cores = useCores()
  const paleta = ORDEM_DA_PALETA.map((nome) => cores[nome])
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={altura}>
        <PieChart>
          <Pie
            data={fatias}
            dataKey="valorCentavos"
            nameKey="rotulo"
            innerRadius="62%"
            outerRadius="100%"
            paddingAngle={2}
            stroke="none"
          >
            {fatias.map((_, indice) => (
              <Cell key={indice} fill={paleta[indice % paleta.length]} />
            ))}
          </Pie>
          <Tooltip content={<Dica />} />
        </PieChart>
      </ResponsiveContainer>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="numero text-[19px] font-semibold leading-none">{total}</span>
        <span className="mt-1 text-[11px] uppercase tracking-widest text-muted-fg">por mês</span>
      </div>
    </div>
  )
}

// ============================================================
// BALANÇO MÊS A MÊS
// ============================================================

/**
 * Como o patrimônio andou.
 *
 * Barras para o que se tem e o que se deve, linha para o que sobra dos dois.
 * A linha é o que importa — as barras existem para explicar de onde ela veio,
 * porque "o patrimônio caiu" sem mostrar se foi o saldo que encolheu ou a
 * dívida que cresceu não ajuda ninguém a decidir nada.
 *
 * O passivo desce abaixo do zero em vez de virar outra barra ao lado: dívida
 * puxa para baixo, e a leitura fica imediata mesmo para quem nunca viu um
 * balanço.
 */
export function GraficoBalanco({
  dados,
  altura = 280,
}: {
  dados: {
    competencia: string
    disponivelCentavos: number
    passivoCentavos: number
    patrimonioLiquidoCentavos: number
  }[]
  altura?: number
}) {
  const cores = useCores()

  const series = dados.map((linha) => ({
    rotulo: rotuloCompetencia(linha.competencia, true),
    "Tem": linha.disponivelCentavos,
    "Deve": -linha.passivoCentavos,
    "Sobra": linha.patrimonioLiquidoCentavos,
  }))

  return (
    <ResponsiveContainer width="100%" height={altura}>
      <ComposedChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <XAxis dataKey="rotulo" tick={eixo} tickLine={false} axisLine={false} interval="preserveStartEnd" />
        <YAxis tick={eixo} tickLine={false} axisLine={false} width={62} tickFormatter={formatarMoedaCurta} />
        <ReferenceLine y={0} stroke="currentColor" strokeOpacity={0.35} />
        <Tooltip content={<Dica />} />

        <Bar dataKey="Tem" fill={cores.positivo} fillOpacity={0.32} radius={[4, 4, 0, 0]} />
        <Bar dataKey="Deve" fill={cores.negativo} fillOpacity={0.32} radius={[0, 0, 4, 4]} />
        <Line
          type="monotone"
          dataKey="Sobra"
          stroke={cores.positivo}
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
