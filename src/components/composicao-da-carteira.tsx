import { formatarMoeda } from "@/lib/dinheiro"
import { CLASSES, LETRAS_DO_ARCA, type ClasseDeAtivo } from "@/lib/tino/investir"
import { cn } from "@/lib/utils"

/**
 * Do que a carteira é feita.
 *
 * A tela de investimentos listava os ativos um a um e dizia quanto somavam. A
 * pergunta de quem tem carteira é outra: **em que estou, e o quanto de cada
 * coisa**. Uma lista de dez linhas não responde isso — quem lê precisa somar de
 * cabeça, por classe, antes de saber se está concentrado.
 *
 * Aqui a resposta vem em três alturas: a faixa mostra a proporção inteira de
 * relance, a lista dá o número de cada classe, e a comparação com o alvo diz
 * o que fazer no próximo aporte.
 *
 * Sem rosca de propósito. A rosca do Recharts já nasceu com largura zero no
 * celular nesta base (está registrado em `painel.module.css`): meia tela preta
 * e um valor perdido no meio. Faixa empilhada não depende de medir o container
 * para existir, e para seis classes lê igual ou melhor.
 *
 * O alvo é o do método ARCA, que já estava no código — 25% em cada letra. Não
 * é recomendação: é o parâmetro escolhido, e a tela diz isso.
 */

/** Tom de cada classe. Cinza é a base; só o que cresce demais ganha aviso. */
const TINTA: Record<ClasseDeAtivo, string> = {
  ACOES: "var(--acao)",
  FII: "color-mix(in oklab, var(--acao), var(--foreground) 45%)",
  RENDA_FIXA: "color-mix(in oklab, var(--acao), var(--foreground) 70%)",
  CAIXA: "color-mix(in oklab, var(--foreground), transparent 45%)",
  INTERNACIONAL: "color-mix(in oklab, var(--acao), var(--foreground) 22%)",
  CRIPTO: "color-mix(in oklab, var(--foreground), transparent 62%)",
  OUTROS: "color-mix(in oklab, var(--foreground), transparent 74%)",
}

export interface PosicaoNaCarteira {
  classe: ClasseDeAtivo | null
  valorCentavos: number
}

export function ComposicaoDaCarteira({ posicoes }: { posicoes: PosicaoNaCarteira[] }) {
  const total = posicoes.reduce((soma, linha) => soma + linha.valorCentavos, 0)
  if (total <= 0) return null

  const porClasse = CLASSES.map((definicao) => {
    const valorCentavos = posicoes
      .filter((linha) => linha.classe === definicao.classe)
      .reduce((soma, linha) => soma + linha.valorCentavos, 0)
    return { ...definicao, valorCentavos, parte: valorCentavos / total }
  }).filter((linha) => linha.valorCentavos > 0)

  const semClasse = posicoes
    .filter((linha) => !linha.classe)
    .reduce((soma, linha) => soma + linha.valorCentavos, 0)

  // O alvo só faz sentido sobre o que está classificado: dividir incluindo o
  // "sem classe" faria toda letra parecer abaixo do alvo por um motivo que não
  // é de carteira, é de cadastro.
  const classificado = total - semClasse
  const letras = LETRAS_DO_ARCA.map((letra) => {
    const atual = porClasse
      .filter((linha) => letra.classes.includes(linha.classe))
      .reduce((soma, linha) => soma + linha.valorCentavos, 0)
    const parteBps = classificado > 0 ? Math.round((atual / classificado) * 10_000) : 0
    return { ...letra, atual, parteBps, diferencaBps: parteBps - letra.alvoBps }
  })

  return (
    <section className="space-y-5">
      <div>
        <p className="text-[max(10px,calc(11px*var(--escala-letra)))] font-semibold uppercase tracking-[0.14em] text-[color:var(--texto-3)]">
          Do que sua carteira é feita
        </p>

        {/* A proporção inteira numa faixa só. Três pixels de largura mínima
            para a classe pequena não sumir — sumir é pior do que distorcer um
            pouco, porque some junto com a informação de que ela existe. */}
        <div className="mt-3 flex h-3 w-full overflow-hidden rounded-full bg-foreground/[0.07]" aria-hidden>
          {porClasse.map((linha) => (
            <i
              key={linha.classe}
              className="block h-full first:rounded-l-full last:rounded-r-full"
              style={{ width: `${Math.max(1.5, linha.parte * 100)}%`, background: TINTA[linha.classe] }}
            />
          ))}
        </div>

        <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
          {porClasse.map((linha) => (
            <li key={linha.classe} className="flex items-baseline gap-2.5">
              <span
                aria-hidden
                className="mt-1 size-2.5 shrink-0 rounded-full"
                style={{ background: TINTA[linha.classe] }}
              />
              <span className="min-w-0 flex-1 truncate text-[calc(13px*var(--escala-letra))]">{linha.rotulo}</span>
              <span className="numero shrink-0 text-[calc(13px*var(--escala-letra))] font-medium tabular-nums">
                {Math.round(linha.parte * 100)}%
              </span>
              <span className="numero shrink-0 text-[calc(12px*var(--escala-letra))] text-[color:var(--texto-2)] tabular-nums">
                {formatarMoeda(linha.valorCentavos)}
              </span>
            </li>
          ))}
        </ul>

        {semClasse > 0 && (
          <p className="mt-3 text-[calc(12px*var(--escala-letra))] text-atencao">
            {formatarMoeda(semClasse)} ainda sem classe. Escolha a classe no cartão do ativo para ele entrar na conta.
          </p>
        )}
      </div>

      {classificado > 0 && (
        <div className="border-t border-pauta pt-4">
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
                    <div
                      className="h-full rounded-full bg-acao"
                      style={{ width: `${Math.min(100, atual)}%` }}
                    />
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
            sobre o que você já tem.
          </p>
        </div>
      )}
    </section>
  )
}
