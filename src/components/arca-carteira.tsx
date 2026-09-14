"use client"

import { useState } from "react"
import { formatarMoeda, paraCentavos } from "@/lib/dinheiro"
import { Input } from "@/components/ui/input"
import { aporteQueReequilibra, posicaoDoArca, type ClasseDeAtivo } from "@/lib/tino/investir"

/**
 * A carteira lida contra o método ARCA.
 *
 * A tela antes só dividia um valor em quatro partes iguais, o que responde
 * "quanto é um quarto disso" e não "onde eu ponho o dinheiro deste mês". O
 * método vive do reequilíbrio pelo aporte: em vez de vender o que subiu,
 * aporta-se no que ficou para trás — e para isso é preciso olhar o que a
 * pessoa já tem.
 *
 * **Continua sendo aritmética.** O método é de terceiro (Thiago Nigro), está
 * identificado, e o app não escolhe ativo, não indica corretora e não afirma
 * que o método é bom. Dizer "a letra R está 8 pontos abaixo do alvo" é ler a
 * carteira; dizer "compre tal fundo" seria recomendação, que exige registro
 * na CVM.
 */
export function ArcaCarteira({
  carteira,
  sugestaoDeAporteCentavos,
}: {
  carteira: { classe: ClasseDeAtivo; valorCentavos: number }[]
  /// Valor que a tela já calculou como sobra do mês, para preencher o campo.
  sugestaoDeAporteCentavos?: number
}) {
  const [aporte, setAporte] = useState("")
  const { letras, totalCentavos, foraDoMetodoCentavos } = posicaoDoArca(carteira)

  const digitado = aporte.trim() ? paraCentavos(aporte) : 0
  const valorDoAporte = digitado > 0 ? digitado : (sugestaoDeAporteCentavos ?? 0)
  const destino = aporteQueReequilibra(valorDoAporte, carteira)

  const semClassificar = carteira.filter((item) => item.classe === "OUTROS").length

  return (
    <section className="mt-6 rounded-2xl border border-pauta bg-papel-2 p-4 sm:p-5">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-base font-semibold">Sua carteira no ARCA</h3>
        <p className="text-xs text-muted-fg">Método de Thiago Nigro · quatro classes em partes iguais</p>
      </header>

      {totalCentavos === 0 ? (
        <p className="mt-3 text-sm text-muted-fg">
          Classifique seus investimentos em ações, fundos imobiliários, renda fixa, caixa ou ativos
          internacionais para ver onde sua carteira está em relação ao método.
        </p>
      ) : (
        <ul className="mt-4 grid gap-3">
          {letras.map((letra) => {
            const atual = letra.atualBps / 100
            const falta = letra.diferencaCentavos
            return (
              <li key={letra.rotulo}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <span className="text-sm font-medium">
                    <b className="mr-1.5 text-acao">{letra.letra}</b>{letra.rotulo}
                  </span>
                  <span className="numero text-sm">
                    {formatarMoeda(letra.atualCentavos)} · {atual.toFixed(1).replace(".", ",")}%
                  </span>
                </div>
                {/* Dois trilhos sobrepostos: o alvo é a marca, o atual é a barra.
                    A diferença também vem escrita — quem não distingue as cores
                    continua sabendo o que está atrás. */}
                <div className="relative mt-1.5 h-1.5 rounded-full bg-papel-3">
                  <span
                    className="absolute inset-y-0 left-0 rounded-full bg-acao"
                    style={{ width: `${Math.min(100, atual)}%` }}
                  />
                  <span
                    aria-hidden
                    className="absolute inset-y-[-3px] w-px bg-[color:var(--texto-2)]"
                    style={{ left: `${letra.alvoBps / 100}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-muted-fg">
                  Alvo {letra.alvoBps / 100}%.{" "}
                  {falta > 0
                    ? `Faltam ${formatarMoeda(falta)} para chegar lá.`
                    : falta < 0
                      ? `Está ${formatarMoeda(-falta)} acima do alvo.`
                      : "No alvo."}
                </p>
              </li>
            )
          })}
        </ul>
      )}

      {foraDoMetodoCentavos > 0 && (
        <p className="mt-3 text-xs text-muted-fg">
          {formatarMoeda(foraDoMetodoCentavos)} em cripto ou outros ficam fora desta conta: o método tem
          quatro classes e não diz o que fazer com o resto.
        </p>
      )}
      {semClassificar > 0 && (
        <p className="mt-2 text-xs text-muted-fg">
          {semClassificar === 1 ? "Um investimento ainda está" : `${semClassificar} investimentos ainda estão`} sem
          classe. Escolha a classe no cartão do investimento para ele entrar na conta.
        </p>
      )}

      <div className="mt-5 border-t border-pauta pt-4">
        <label className="block text-sm">
          Se eu aportar agora
          <Input
            inputMode="decimal"
            value={aporte}
            onChange={(evento) => setAporte(evento.target.value)}
            placeholder={sugestaoDeAporteCentavos ? formatarMoeda(sugestaoDeAporteCentavos) : "R$ 0,00"}
            aria-label="Valor do aporte"
          />
        </label>

        {valorDoAporte > 0 && (
          <>
            <ul className="mt-3 grid gap-2">
              {destino.map((parte) => (
                <li key={parte.rotulo} className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span className="text-sm">{parte.rotulo}</span>
                  <span className="numero text-sm font-medium">{formatarMoeda(parte.valorCentavos)}</span>
                  <span className="w-full text-xs text-muted-fg">{parte.porque}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted-fg">
              Conta feita sobre o que você cadastrou. O Tino não escolhe ativo nem indica corretora.
            </p>
          </>
        )}
      </div>
    </section>
  )
}
