"use client"

import { formatarMoeda } from "@/lib/dinheiro"
import { CLASSES, type ClasseDeAtivo } from "@/lib/tino/investir"
import { IdentidadeBanco } from "@/components/banco-perfil"
import { cn } from "@/lib/utils"

/**
 * Os ativos, agrupados por classe.
 *
 * Desenho pedido pelo Davi em 15/09/2026, com a tela de "Ações" do Kinvo como
 * referência: um cabeçalho por classe com o total dela, e cada ativo num cartão
 * com o código em cima, o nome embaixo, o valor à direita e a variação do dia
 * ao lado — e, dentro, as três linhas que respondem "por que dá esse valor":
 * preço atual, quantidade e total.
 *
 * A lista anterior era uma grade de cartões soltos, todos do mesmo tamanho,
 * sem agrupamento. Para saber quanto havia em ações era preciso somar de
 * cabeça, e as três linhas que explicam o valor não existiam.
 *
 * Preço e quantidade só aparecem quando existem: investimento sem código na
 * bolsa (um CDB, o Tesouro) não tem preço de cota, e inventar um seria mentir
 * sobre a origem do número.
 */

export interface AtivoNaLista {
  id: string
  nome: string
  instituicao: string | null
  classe: ClasseDeAtivo | null
  ticker: string | null
  /** Quantidade em milésimos, para caber fração de cota. */
  quantidadeMilesimos: number | null
  /** Preço unitário em reais, quando há cotação. */
  precoUnitario: number | null
  variacaoPercentual: number | null
  /** Valor de mercado quando há cotação; o aportado quando não há. */
  valorCentavos: number
  aportadoCentavos: number
}

export function ListaDeAtivos({
  ativos,
  aoAbrir,
}: {
  ativos: AtivoNaLista[]
  /** Aportar ou resgatar. A lista não guarda nada; ela só avisa. */
  aoAbrir: (id: string) => void
}) {
  if (ativos.length === 0) return null

  const grupos = [...CLASSES.map((definicao) => definicao.classe), null].map((classe) => ({
    classe,
    rotulo: CLASSES.find((definicao) => definicao.classe === classe)?.rotulo ?? "Sem classe",
    itens: ativos.filter((ativo) => (ativo.classe ?? null) === classe),
  }))

  return (
    <div className="space-y-7">
      {grupos
        .filter((grupo) => grupo.itens.length > 0)
        .map((grupo) => {
          const total = grupo.itens.reduce((soma, ativo) => soma + ativo.valorCentavos, 0)
          return (
            <section key={grupo.rotulo}>
              <header className="mb-3 flex items-baseline justify-between gap-3">
                <h3 className="text-[calc(16px*var(--escala-letra))] font-semibold tracking-tight">{grupo.rotulo}</h3>
                <p className="text-[calc(12px*var(--escala-letra))] text-[color:var(--texto-3)]">
                  Valor total{" "}
                  <span className="numero font-medium text-[color:var(--texto-2)] tabular-nums">
                    {formatarMoeda(total)}
                  </span>
                </p>
              </header>

              <ul className="space-y-2.5">
                {grupo.itens.map((ativo) => {
                  const ganho = ativo.valorCentavos - ativo.aportadoCentavos
                  const quantidade = ativo.quantidadeMilesimos ? ativo.quantidadeMilesimos / 1000 : null

                  return (
                    <li key={ativo.id}>
                      <button
                        type="button"
                        onClick={() => aoAbrir(ativo.id)}
                        className="ios-tap w-full rounded-[var(--raio-cartao)] border border-pauta bg-papel-2 p-4 text-left transition-colors hover:border-foreground/20"
                      >
                        <div className="flex items-center gap-3">
                          <IdentidadeBanco instituicao={ativo.instituicao} nome={ativo.nome} />

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[calc(14px*var(--escala-letra))] font-semibold">
                              {ativo.ticker ? ativo.ticker.toUpperCase() : ativo.nome}
                            </p>
                            <p className="truncate text-[calc(12px*var(--escala-letra))] text-[color:var(--texto-3)]">
                              {ativo.ticker ? ativo.nome : (ativo.instituicao ?? "Investimento")}
                            </p>
                          </div>

                          <div className="shrink-0 text-right">
                            <p className="numero text-[calc(14px*var(--escala-letra))] font-semibold tabular-nums">
                              {formatarMoeda(ativo.valorCentavos)}
                            </p>
                            {ativo.variacaoPercentual !== null ? (
                              <p
                                className={cn(
                                  "numero text-[calc(12px*var(--escala-letra))] tabular-nums",
                                  ativo.variacaoPercentual >= 0 ? "text-positivo" : "text-negativo",
                                )}
                              >
                                {ativo.variacaoPercentual >= 0 ? "▲" : "▼"}{" "}
                                {Math.abs(ativo.variacaoPercentual).toFixed(2).replace(".", ",")}%
                              </p>
                            ) : ganho !== 0 ? (
                              <p
                                className={cn(
                                  "numero text-[calc(12px*var(--escala-letra))] tabular-nums",
                                  ganho > 0 ? "text-positivo" : "text-negativo",
                                )}
                              >
                                {ganho > 0 ? "+" : "−"}
                                {formatarMoeda(Math.abs(ganho))}
                              </p>
                            ) : null}
                          </div>
                        </div>

                        {/* As três linhas que explicam o valor. Só aparecem
                            quando há cotação: sem código na bolsa não existe
                            preço de cota, e inventar um seria mentir sobre a
                            origem do número. */}
                        {ativo.precoUnitario !== null && quantidade !== null && (
                          <dl className="mt-3 space-y-1.5 border-t border-pauta pt-3">
                            <div className="flex items-baseline justify-between gap-3">
                              <dt className="text-[calc(12px*var(--escala-letra))] text-[color:var(--texto-3)]">Preço atual</dt>
                              <dd className="numero text-[calc(13px*var(--escala-letra))] tabular-nums">
                                {formatarMoeda(Math.round(ativo.precoUnitario * 100))}
                              </dd>
                            </div>
                            <div className="flex items-baseline justify-between gap-3">
                              <dt className="text-[calc(12px*var(--escala-letra))] text-[color:var(--texto-3)]">Quantidade</dt>
                              <dd className="numero text-[calc(13px*var(--escala-letra))] tabular-nums">
                                {quantidade.toLocaleString("pt-BR")}
                              </dd>
                            </div>
                            <div className="flex items-baseline justify-between gap-3">
                              <dt className="text-[calc(12px*var(--escala-letra))] text-[color:var(--texto-3)]">Aportado</dt>
                              <dd className="numero text-[calc(13px*var(--escala-letra))] tabular-nums">
                                {formatarMoeda(ativo.aportadoCentavos)}
                              </dd>
                            </div>
                          </dl>
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
    </div>
  )
}
