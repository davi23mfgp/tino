"use client"

import { useEffect, useState } from "react"

import { formatarMoeda } from "@/lib/dinheiro"
import { CLASSES, LETRAS_DO_ARCA, type ClasseDeAtivo } from "@/lib/tino/investir"
import { cn } from "@/lib/utils"

/**
 * O painel da carteira, no desenho do Gorila.
 *
 * Referência escolhida pelo Davi em 15/09/2026 entre as duas que ele mandou. A
 * anatomia é a de lá: patrimônio consolidado e o ganho logo abaixo, a rosca de
 * alocação com o total no miolo, a lista por classe com o percentual à direita,
 * e a distância do alvo na coluna ao lado.
 *
 * **A rosca é `conic-gradient`, não biblioteca.** A rosca do Recharts já nasceu
 * com largura zero no celular nesta base (registrado em `painel.module.css`):
 * meia tela preta e um valor perdido no meio. Gradiente cônico é CSS puro, não
 * mede container, não tem ponto de falha, e desenha exatamente o mesmo anel.
 *
 * **A evolução patrimonial existe a partir de 15/09/2026.** Ela precisa de
 * histórico, e o Tino guardava só a posição de hoje. Agora cada visita grava o
 * retrato do mês corrente (`/api/carteira/retrato`), e a linha é desenhada com
 * o que foi de fato registrado. Nenhum mês é calculado para trás: a série
 * começa no primeiro mês em que alguém abriu esta tela, e a tela diz isso em
 * vez de desenhar um passado que ninguém viveu.
 */

/**
 * As fatias do anel.
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
 * anel e ponto de legenda, nunca texto — texto usa a cor do tema.
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

export function PainelDaCarteira({ posicoes }: { posicoes: PosicaoDaCarteira[] }) {
  const [aba, setAba] = useState<"classes" | "produtos">("classes")
  const [historico, setHistorico] = useState<RetratoMensal[]>([])

  const total = posicoes.reduce((soma, linha) => soma + linha.valorCentavos, 0)
  const aportado = posicoes.reduce((soma, linha) => soma + linha.aportadoCentavos, 0)
  const ganho = total - aportado

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

  if (total <= 0) return null

  const porClasse = CLASSES.map((definicao) => {
    const valorCentavos = posicoes
      .filter((linha) => linha.classe === definicao.classe)
      .reduce((soma, linha) => soma + linha.valorCentavos, 0)
    return { ...definicao, valorCentavos, parte: valorCentavos / total }
  }).filter((linha) => linha.valorCentavos > 0)

  const semClasse = posicoes.filter((linha) => !linha.classe).reduce((soma, linha) => soma + linha.valorCentavos, 0)
  const classificado = total - semClasse

  // As fatias do anel em porcentagem acumulada: o `conic-gradient` recebe
  // início e fim de cada faixa, então a conta é feita aqui, não no CSS.
  let acumulado = 0
  const fatias = porClasse.map((linha) => {
    const de = acumulado
    acumulado += linha.parte * 100
    return `${TINTA[linha.classe]} ${de}% ${acumulado}%`
  })
  if (semClasse > 0) fatias.push(`color-mix(in oklab, var(--foreground), transparent 86%) ${acumulado}% 100%`)

  const letras = LETRAS_DO_ARCA.map((letra) => {
    const atual = porClasse
      .filter((linha) => letra.classes.includes(linha.classe))
      .reduce((soma, linha) => soma + linha.valorCentavos, 0)
    const parteBps = classificado > 0 ? Math.round((atual / classificado) * 10_000) : 0
    return { ...letra, atual, parteBps, diferencaBps: parteBps - letra.alvoBps }
  })

  const produtos = [...posicoes].sort((a, b) => b.valorCentavos - a.valorCentavos)
  const maior = [...porClasse].sort((a, b) => b.valorCentavos - a.valorCentavos)[0]


  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* ── Coluna da esquerda: quanto é, e de que é feito ── */}
      <section className="space-y-5 rounded-[var(--raio-cartao)] border border-pauta bg-papel-2 p-5">
        <div>
          <p className="text-[calc(13px*var(--escala-letra))] text-[color:var(--texto-2)]">Patrimônio consolidado</p>
          <p className="numero mt-1 text-[calc(clamp(28px,4vw,38px)*var(--escala-letra))] font-semibold leading-none tracking-[-0.04em] tabular-nums">
            {formatarMoeda(total)}
          </p>

          {/* O ganho só aparece quando há cotação por trás: sem preço, mercado
              e aportado são o mesmo número, e "R$ 0,00 de ganho" faria parecer
              que a carteira não rendeu nada. */}
          {ganho !== 0 && (
            <p
              className={cn(
                "numero mt-2 text-[calc(13px*var(--escala-letra))] tabular-nums",
                ganho > 0 ? "text-positivo" : "text-negativo",
              )}
            >
              Sobre o aportado {ganho > 0 ? "+" : "−"}
              {formatarMoeda(Math.abs(ganho))}
            </p>
          )}
        </div>

        <div className="mx-auto w-[min(190px,62vw)]">
          {/* Anel de verdade: o furo vem de `mask`, não de um círculo por cima.
              Com círculo, a cor do miolo precisa bater com a do cartão — e como
              a superfície daqui é translúcida, o verde vazava por baixo e o
              "furo" virava um disco verde claro. Máscara recorta de fato. */}
          <div
            className="relative grid aspect-square place-items-center rounded-full"
            style={{
              background: `conic-gradient(${fatias.join(",")})`,
              mask: "radial-gradient(farthest-side, transparent 62%, #000 62.5%)",
              WebkitMask: "radial-gradient(farthest-side, transparent 62%, #000 62.5%)",
            }}
            role="img"
            aria-label={`Carteira dividida em ${porClasse.map((linha) => `${linha.rotulo} ${Math.round(linha.parte * 100)}%`).join(", ")}`}
          />
          {/* No miolo vai a maior fatia, não o total de novo: o total já está
              grande logo acima, e repetir o mesmo número a 4cm de distância não
              acrescenta — dizer onde está a maior parte, sim. */}
          <div className="pointer-events-none -mt-[calc(50%+22px)] mb-[calc(50%-22px)] text-center">
            <p className="numero text-[calc(21px*var(--escala-letra))] font-semibold tabular-nums">
              {Math.round((maior?.parte ?? 0) * 100)}%
            </p>
            <p className="truncate px-6 text-[max(10px,calc(11px*var(--escala-letra)))] text-[color:var(--texto-3)]">
              em {maior?.rotulo.toLowerCase() ?? "—"}
            </p>
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-[calc(13px*var(--escala-letra))] font-medium">
              {aba === "classes" ? "Alocação por classe" : "Alocação por produto"}
            </p>
            <div className="inline-flex rounded-[var(--raio-pilula)] bg-papel-1 p-1">
              {(["classes", "produtos"] as const).map((chave) => (
                <button
                  key={chave}
                  type="button"
                  onClick={() => setAba(chave)}
                  aria-pressed={aba === chave}
                  className={cn(
                    "min-h-8 rounded-[var(--raio-pilula)] px-3 text-[calc(12px*var(--escala-letra))] transition-colors",
                    aba === chave ? "bg-acao font-semibold text-background" : "text-[color:var(--texto-2)]",
                  )}
                >
                  {chave === "classes" ? "Classes" : "Produtos"}
                </button>
              ))}
            </div>
          </div>

          <ul className="space-y-2.5">
            {(aba === "classes"
              ? porClasse.map((linha) => ({
                  chave: linha.classe as string,
                  cor: TINTA[linha.classe],
                  nome: linha.rotulo,
                  detalhe: null as string | null,
                  valorCentavos: linha.valorCentavos,
                }))
              : produtos.map((linha) => ({
                  chave: linha.id,
                  cor: linha.classe ? TINTA[linha.classe] : "color-mix(in oklab, var(--foreground), transparent 80%)",
                  nome: linha.nome,
                  detalhe:
                    linha.ticker && linha.variacaoPercentual !== null && linha.variacaoPercentual !== undefined
                      ? `${linha.ticker.toUpperCase()} · ${linha.variacaoPercentual >= 0 ? "+" : "−"}${Math.abs(linha.variacaoPercentual).toFixed(2).replace(".", ",")}% hoje`
                      : (linha.ticker?.toUpperCase() ?? null),
                  valorCentavos: linha.valorCentavos,
                }))
            ).map((linha) => (
              <li key={linha.chave} className="flex items-center gap-3">
                <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: linha.cor }} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[calc(13px*var(--escala-letra))]">{linha.nome}</span>
                  {linha.detalhe && (
                    <span className="numero block truncate text-[calc(11.5px*var(--escala-letra))] text-[color:var(--texto-3)]">
                      {linha.detalhe}
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-right">
                  <span className="numero block text-[calc(13px*var(--escala-letra))] font-medium tabular-nums">
                    {formatarMoeda(linha.valorCentavos)}
                  </span>
                  <span className="numero block text-[calc(11.5px*var(--escala-letra))] text-[color:var(--texto-3)] tabular-nums">
                    {Math.round((linha.valorCentavos / total) * 100)}% da carteira
                  </span>
                </span>
              </li>
            ))}

            {aba === "classes" && semClasse > 0 && (
              <li className="flex items-center gap-3 text-atencao">
                <span aria-hidden className="size-2.5 shrink-0 rounded-full bg-atencao/60" />
                <span className="min-w-0 flex-1 truncate text-[calc(13px*var(--escala-letra))]">Sem classe</span>
                <span className="numero shrink-0 text-[calc(13px*var(--escala-letra))] font-medium tabular-nums">
                  {formatarMoeda(semClasse)}
                </span>
              </li>
            )}
          </ul>
        </div>
      </section>

      {/* ── Evolução: só existe com o que foi guardado ──── */}
      {historico.length >= 2 && <EvolucaoDaCarteira serie={historico} />}

      {/* ── Coluna da direita: onde isso devia estar ────── */}
      <section className="space-y-4 rounded-[var(--raio-cartao)] border border-pauta bg-papel-2 p-5">
        <div>
          <p className="text-[calc(13px*var(--escala-letra))] font-medium">Distância do alvo</p>
          <p className="mt-1 text-[calc(12px*var(--escala-letra))] text-[color:var(--texto-3)]">
            Onde cada parte está hoje, e onde o método coloca o alvo.
          </p>
        </div>

        {classificado > 0 ? (
          <ul className="space-y-4">
            {letras.map((letra) => {
              const alvo = letra.alvoBps / 100
              const atual = letra.parteBps / 100
              const diferenca = letra.diferencaBps / 100
              return (
                <li key={`${letra.letra}-${letra.rotulo}`}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate text-[calc(13px*var(--escala-letra))]">{letra.rotulo}</span>
                    <span className="flex shrink-0 items-baseline gap-2">
                      <span className="numero text-[calc(13px*var(--escala-letra))] font-medium tabular-nums">
                        {atual.toFixed(0)}%
                      </span>
                      <span
                        className={cn(
                          "numero text-[calc(12px*var(--escala-letra))] tabular-nums",
                          Math.abs(diferenca) < 5
                            ? "text-[color:var(--texto-3)]"
                            : diferenca > 0
                              ? "text-atencao"
                              : "text-[color:var(--texto-2)]",
                        )}
                      >
                        {diferenca >= 0 ? "+" : "−"}
                        {Math.abs(diferenca).toFixed(0)} p.p.
                      </span>
                    </span>
                  </div>

                  {/* A régua mostra onde a classe está e onde o alvo fica. Só
                      o número diria "28%" sem dizer se falta muito ou pouco. */}
                  <div className="relative mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-foreground/[0.07]">
                    <div className="h-full rounded-full bg-acao" style={{ width: `${Math.min(100, atual)}%` }} />
                    <span
                      aria-hidden
                      className="absolute top-0 h-full w-px bg-foreground/50"
                      style={{ left: `${Math.min(100, alvo)}%` }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="text-[calc(13px*var(--escala-letra))] text-atencao">
            Escolha a classe de cada investimento no cartão dele para esta conta existir.
          </p>
        )}

        <p className="border-t border-pauta pt-3 text-[calc(11.5px*var(--escala-letra))] leading-relaxed text-[color:var(--texto-3)]">
          Alvo de 25% por letra, do método ARCA (Grupo Primo). É o parâmetro escolhido, não recomendação — cálculo sobre
          o que você já tem. Ativo sem classe fica de fora desta conta.
        </p>
      </section>
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
    <section className="space-y-3 rounded-[var(--raio-cartao)] border border-pauta bg-papel-2 p-5 lg:col-span-2">
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
