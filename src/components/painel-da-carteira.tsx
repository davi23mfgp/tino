"use client"

import { useState } from "react"

import { formatarMoeda } from "@/lib/dinheiro"
import { CLASSES, LETRAS_DO_ARCA, type ClasseDeAtivo } from "@/lib/tino/investir"
import { cn } from "@/lib/utils"

/**
 * O painel da carteira.
 *
 * Desenho pedido pelo Davi em 15/09/2026, com Kinvo e Gorila como referência:
 * patrimônio consolidado em cima, rosca da alocação, e a lista dividida entre
 * **produto** e **classe**. A tela antiga listava ativos e somava — quem lê
 * precisava juntar de cabeça, por classe, antes de saber se estava
 * concentrado.
 *
 * **A rosca é `conic-gradient`, não biblioteca.** A rosca do Recharts já
 * nasceu com largura zero no celular nesta base (registrado em
 * `painel.module.css`): meia tela preta e um valor perdido no meio. Gradiente
 * cônico é CSS puro, não mede container, não tem ponto de falha, e desenha
 * exatamente o mesmo anel.
 *
 * O buraco do meio não é enfeite: é onde mora o total. Rosca sem número no
 * centro obriga a pessoa a somar a legenda para saber de quanto se está
 * falando.
 */

const TINTA: Record<ClasseDeAtivo, string> = {
  ACOES: "var(--acao)",
  FII: "color-mix(in oklab, var(--acao), var(--foreground) 38%)",
  RENDA_FIXA: "color-mix(in oklab, var(--acao), var(--foreground) 62%)",
  INTERNACIONAL: "color-mix(in oklab, var(--acao), var(--foreground) 20%)",
  CAIXA: "color-mix(in oklab, var(--foreground), transparent 48%)",
  CRIPTO: "color-mix(in oklab, var(--foreground), transparent 64%)",
  OUTROS: "color-mix(in oklab, var(--foreground), transparent 76%)",
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

  // As fatias do anel, em porcentagem acumulada. O `conic-gradient` recebe
  // início e fim de cada faixa, então a conta é feita aqui e não no CSS.
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
    <section className="space-y-6">
      <div className="grid items-center gap-6 sm:grid-cols-[minmax(0,200px)_minmax(0,1fr)]">
        {/* ── O anel ─────────────────────────────────────── */}
        <div className="mx-auto w-[min(200px,70vw)]">
          <div
            className="relative grid aspect-square place-items-center rounded-full"
            style={{ background: `conic-gradient(${fatias.join(",")})` }}
            role="img"
            aria-label={`Carteira dividida em ${porClasse.map((linha) => `${linha.rotulo} ${Math.round(linha.parte * 100)}%`).join(", ")}`}
          >
            {/* O miolo é a cor do cartão, não uma máscara: sobre superfície
                opaca isto é um furo perfeito e custa zero. */}
            <div className="grid size-[64%] place-items-center rounded-full bg-papel-1 text-center">
              <div>
                <p className="text-[max(10px,calc(11px*var(--escala-letra)))] uppercase tracking-[0.14em] text-[color:var(--texto-3)]">
                  Total
                </p>
                <p className="numero mt-1 text-[calc(17px*var(--escala-letra))] font-semibold tabular-nums">
                  {formatarMoeda(total)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Consolidado e ganho ────────────────────────── */}
        <div>
          <p className="text-[max(10px,calc(11px*var(--escala-letra)))] font-semibold uppercase tracking-[0.14em] text-[color:var(--texto-3)]">
            Patrimônio investido
          </p>
          <p className="numero mt-1.5 text-[calc(clamp(28px,4vw,38px)*var(--escala-letra))] font-semibold leading-none tracking-[-0.04em] tabular-nums">
            {formatarMoeda(total)}
          </p>

          {/* O ganho só aparece quando há cotação de verdade por trás: sem
              preço, mercado e aportado são o mesmo número, e mostrar "0,00 de
              ganho" faria parecer que a carteira não rendeu nada. */}
          {ganho !== 0 && (
            <p
              className={cn(
                "numero mt-2 text-[calc(14px*var(--escala-letra))] tabular-nums",
                ganho > 0 ? "text-positivo" : "text-negativo",
              )}
            >
              {ganho > 0 ? "+" : "−"}
              {formatarMoeda(Math.abs(ganho))} sobre o que você aportou
            </p>
          )}

          <div className="mt-4 inline-flex rounded-[var(--raio-pilula)] bg-papel-2 p-1">
            {(["classes", "produtos"] as const).map((chave) => (
              <button
                key={chave}
                type="button"
                onClick={() => setAba(chave)}
                aria-pressed={aba === chave}
                className={cn(
                  "min-h-9 rounded-[var(--raio-pilula)] px-4 text-[calc(13px*var(--escala-letra))] transition-colors",
                  aba === chave ? "bg-acao font-semibold text-background" : "text-[color:var(--texto-2)]",
                )}
              >
                {chave === "classes" ? "Classes" : "Produtos"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── A lista, no corte escolhido ──────────────────── */}
      {aba === "classes" ? (
        <ul className="space-y-2.5">
          {porClasse.map((linha) => (
            <li key={linha.classe} className="flex items-center gap-3">
              <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: TINTA[linha.classe] }} />
              <span className="min-w-0 flex-1 truncate text-[calc(14px*var(--escala-letra))]">{linha.rotulo}</span>
              <span className="numero shrink-0 text-[calc(14px*var(--escala-letra))] font-medium tabular-nums">
                {formatarMoeda(linha.valorCentavos)}
              </span>
              <span className="numero w-12 shrink-0 text-right text-[calc(13px*var(--escala-letra))] text-[color:var(--texto-2)] tabular-nums">
                {Math.round(linha.parte * 100)}%
              </span>
            </li>
          ))}
          {semClasse > 0 && (
            <li className="flex items-center gap-3 text-atencao">
              <span aria-hidden className="size-2.5 shrink-0 rounded-full bg-atencao/60" />
              <span className="min-w-0 flex-1 truncate text-[calc(14px*var(--escala-letra))]">Sem classe</span>
              <span className="numero shrink-0 text-[calc(14px*var(--escala-letra))] font-medium tabular-nums">
                {formatarMoeda(semClasse)}
              </span>
              <span className="numero w-12 shrink-0 text-right text-[calc(13px*var(--escala-letra))] tabular-nums">
                {Math.round((semClasse / total) * 100)}%
              </span>
            </li>
          )}
        </ul>
      ) : (
        <ul className="space-y-2.5">
          {produtos.map((linha) => (
            <li key={linha.id} className="flex items-center gap-3">
              <span
                aria-hidden
                className="size-2.5 shrink-0 rounded-full"
                style={{ background: linha.classe ? TINTA[linha.classe] : "color-mix(in oklab, var(--foreground), transparent 80%)" }}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[calc(14px*var(--escala-letra))]">{linha.nome}</span>
                {linha.ticker && (
                  <span className="numero block text-[calc(12px*var(--escala-letra))] text-[color:var(--texto-3)]">
                    {linha.ticker.toUpperCase()}
                    {linha.variacaoPercentual !== null && linha.variacaoPercentual !== undefined && (
                      <span className={linha.variacaoPercentual >= 0 ? " text-positivo" : " text-negativo"}>
                        {" "}
                        {linha.variacaoPercentual >= 0 ? "+" : "−"}
                        {Math.abs(linha.variacaoPercentual).toFixed(2).replace(".", ",")}% hoje
                      </span>
                    )}
                  </span>
                )}
              </span>
              <span className="numero shrink-0 text-[calc(14px*var(--escala-letra))] font-medium tabular-nums">
                {formatarMoeda(linha.valorCentavos)}
              </span>
              <span className="numero w-12 shrink-0 text-right text-[calc(13px*var(--escala-letra))] text-[color:var(--texto-2)] tabular-nums">
                {Math.round((linha.valorCentavos / total) * 100)}%
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* ── Distância do alvo ────────────────────────────── */}
      {classificado > 0 && (
        <div className="border-t border-pauta pt-5">
          <p className="text-[max(10px,calc(11px*var(--escala-letra)))] font-semibold uppercase tracking-[0.14em] text-[color:var(--texto-3)]">
            Distância do alvo
          </p>

          <ul className="mt-3 space-y-3">
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

          <p className="mt-3 text-[calc(11.5px*var(--escala-letra))] leading-relaxed text-[color:var(--texto-3)]">
            Alvo de 25% por letra, do método ARCA (Grupo Primo). É o parâmetro escolhido, não recomendação — cálculo
            sobre o que você já tem. Ativo sem classe fica de fora desta conta.
          </p>
        </div>
      )}
    </section>
  )
}
