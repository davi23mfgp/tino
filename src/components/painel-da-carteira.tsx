"use client"

import { useState } from "react"

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
 * **O que o Gorila tem e aqui não tem: evolução patrimonial e performance mês a
 * mês.** As duas precisam de histórico da carteira, e o Tino guarda a posição
 * de hoje — não o retrato de cada mês. Desenhar aquela linha exigiria inventar
 * o passado, que é a única coisa que este app não faz. Quando passar a gravar
 * um retrato mensal, o gráfico nasce sozinho com dado de verdade.
 */

/**
 * As fatias do anel.
 *
 * Hue diferente por classe, como na referência — aqui a cor É a legenda, e sete
 * tons do mesmo verde não se distinguem num anel de 12px. Contraste de cada uma
 * sobre o fundo escuro, calculado (OKLab → sRGB linear → WCAG): 14,1 · 11,7 ·
 * 9,2 · 7,4 · 10,3 · 5,7 · 3,4:1. A última é só faixa de anel, nunca texto.
 */
const TINTA: Record<ClasseDeAtivo, string> = {
  ACOES: "oklch(0.85 0.24 145)",
  RENDA_FIXA: "oklch(0.8 0.13 180)",
  FII: "oklch(0.74 0.12 225)",
  INTERNACIONAL: "oklch(0.7 0.14 285)",
  CRIPTO: "oklch(0.78 0.1 95)",
  CAIXA: "oklch(0.62 0.02 250)",
  OUTROS: "oklch(0.5 0.01 250)",
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

export function PainelDaCarteira({ posicoes }: { posicoes: PosicaoDaCarteira[] }) {
  const [aba, setAba] = useState<"classes" | "produtos">("classes")

  const total = posicoes.reduce((soma, linha) => soma + linha.valorCentavos, 0)
  const aportado = posicoes.reduce((soma, linha) => soma + linha.aportadoCentavos, 0)
  const ganho = total - aportado

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

        <div className="mx-auto w-[min(220px,68vw)]">
          <div
            className="relative grid aspect-square place-items-center rounded-full"
            style={{ background: `conic-gradient(${fatias.join(",")})` }}
            role="img"
            aria-label={`Carteira dividida em ${porClasse.map((linha) => `${linha.rotulo} ${Math.round(linha.parte * 100)}%`).join(", ")}`}
          >
            {/* O miolo é a cor do cartão, não uma máscara: sobre superfície
                opaca isto é um furo perfeito e custa zero. */}
            <div className="grid size-[72%] place-items-center rounded-full bg-papel-2 text-center">
              <div>
                <p className="numero text-[calc(20px*var(--escala-letra))] font-semibold tabular-nums">
                  {porClasse.length === 1 ? "100%" : `${porClasse.length}`}
                </p>
                <p className="text-[max(10px,calc(11px*var(--escala-letra)))] text-[color:var(--texto-3)]">
                  {porClasse.length === 1 ? "em uma classe" : "classes"}
                </p>
              </div>
            </div>
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
