"use client"

import { useState } from "react"
import { formatarMoeda, paraCentavos } from "@/lib/dinheiro"
import { Input } from "@/components/ui/input"
import { aporteQueReequilibra, posicaoDoArca, type ClasseDeAtivo } from "@/lib/tino/investir"

/**
 * A carteira lida contra o método ARCA.
 *
 * Escrito sob a regra de `docs/PRINCIPIO-DE-TELA.md`: rótulo curto e número, e
 * o texto que sobra é instrução ("Aporte X aqui"), não justificativa. A
 * diferença para o alvo é etiqueta (`−8 p.p.`), não frase.
 *
 * A única linha de ressalva que fica é a de cálculo x recomendação: indicar
 * investimento exige registro na CVM, e encurtar é permitido, apagar não.
 */
export function ArcaCarteira({
  carteira,
  sugestaoDeAporteCentavos,
}: {
  carteira: { classe: ClasseDeAtivo; valorCentavos: number }[]
  sugestaoDeAporteCentavos?: number
}) {
  const [aporte, setAporte] = useState("")
  const { letras, totalCentavos, foraDoMetodoCentavos } = posicaoDoArca(carteira)

  const digitado = aporte.trim() ? paraCentavos(aporte) : 0
  const valorDoAporte = digitado > 0 ? digitado : (sugestaoDeAporteCentavos ?? 0)
  const destino = aporteQueReequilibra(valorDoAporte, carteira).filter((parte) => parte.valorCentavos > 0)
  const semClasse = carteira.filter((item) => item.classe === "OUTROS").length

  return (
    <section className="mt-6 rounded-2xl border border-pauta bg-papel-2 p-4 sm:p-5">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-base font-semibold">ARCA</h3>
        <span className="text-xs text-muted-fg">alvo 25% em cada</span>
      </header>

      {totalCentavos === 0 ? (
        <p className="mt-3 text-sm text-muted-fg">Escolha a classe de cada investimento abaixo.</p>
      ) : (
        <ul className="mt-4 grid gap-3">
          {letras.map((letra) => {
            const atual = letra.atualBps / 100
            const pontos = Math.round(atual - letra.alvoBps / 100)
            return (
              <li key={letra.rotulo}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span className="text-sm font-medium">{letra.rotulo}</span>
                  <span className="numero text-sm">
                    {formatarMoeda(letra.atualCentavos)}
                    <span className="ml-2 text-muted-fg">{atual.toFixed(0)}%</span>
                    {pontos !== 0 && (
                      <span className={pontos < 0 ? "ml-2 text-negativo" : "ml-2 text-positivo"}>
                        {pontos > 0 ? "+" : "−"}{Math.abs(pontos)} p.p.
                      </span>
                    )}
                  </span>
                </div>
                {/* O traço marca o alvo; a barra, onde está. */}
                <div className="relative mt-1.5 h-1.5 rounded-full bg-papel-3">
                  <span className="absolute inset-y-0 left-0 rounded-full bg-acao" style={{ width: `${Math.min(100, atual)}%` }} />
                  <span aria-hidden className="absolute inset-y-[-3px] w-px bg-[color:var(--texto-2)]" style={{ left: `${letra.alvoBps / 100}%` }} />
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <div className="mt-5 border-t border-pauta pt-4">
        <label className="block text-sm">
          Aportar
          <Input
            inputMode="decimal"
            value={aporte}
            onChange={(evento) => setAporte(evento.target.value)}
            placeholder={sugestaoDeAporteCentavos ? formatarMoeda(sugestaoDeAporteCentavos) : "R$ 0,00"}
            aria-label="Valor do aporte"
          />
        </label>

        {destino.length > 0 && (
          <ul className="mt-3 grid gap-1.5">
            {destino.map((parte) => (
              <li key={parte.rotulo} className="flex items-baseline justify-between gap-3 text-sm">
                <span>{parte.rotulo}</span>
                <span className="numero font-medium">{formatarMoeda(parte.valorCentavos)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <footer className="mt-4 flex flex-wrap gap-x-3 text-xs text-muted-fg">
        <span>Cálculo, não recomendação.</span>
        <span>Método de Thiago Nigro.</span>
        {foraDoMetodoCentavos > 0 && <span>{formatarMoeda(foraDoMetodoCentavos)} fora do método.</span>}
        {semClasse > 0 && <span>{semClasse} sem classe.</span>}
      </footer>
    </section>
  )
}
