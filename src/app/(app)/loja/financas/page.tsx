"use client"

import { useEffect, useState } from "react"

import { buscar } from "@/lib/cliente"
import { formatarMoeda } from "@/lib/dinheiro"
import { Cartao, Metrica } from "@/components/ui/painel"
import { Abertura } from "@/components/abertura"

/**
 * Finanças da loja.
 *
 * DRE só da empresa — nunca lê conta nem transação pessoal do dono (ver
 * `src/lib/loja/demonstrativo.ts`). Contas a pagar e o que ainda vai cair na
 * conta já têm tela própria (`/loja/contas` e o Balcão); aqui é só o
 * resultado, a pergunta que nenhuma das duas responde sozinha.
 */

interface Demonstrativo {
  receitaLiquidaCentavos: number
  cmvCentavos: number
  despesasCentavos: number
  lucroCentavos: number
  pecasSemCusto: number
}

const JANELAS = [
  { dias: 30, rotulo: "30 dias" },
  { dias: 90, rotulo: "90 dias" },
  { dias: 365, rotulo: "12 meses" },
]

export default function FinancasDaLoja() {
  const [dias, setDias] = useState(30)
  const [demonstrativo, setDemonstrativo] = useState<Demonstrativo | null>(null)

  useEffect(() => {
    buscar<{ demonstrativo: Demonstrativo }>(`/api/loja/demonstrativo?dias=${dias}`).then((resposta) =>
      setDemonstrativo(resposta.demonstrativo),
    )
  }, [dias])

  return (
    <div className="space-y-4">
      {/* O lucro é a pergunta da tela e estava como o quarto tile de quatro. */}
      <Abertura
        rotulo={`Loja · ${JANELAS.find((janela) => janela.dias === dias)?.rotulo ?? `${dias} dias`}`}
        titulo={
          (demonstrativo?.lucroCentavos ?? 0) >= 0 ? (
            <>A loja deu <em>{formatarMoeda(demonstrativo?.lucroCentavos ?? 0)}</em> de lucro.</>
          ) : (
            <>A loja deu <em>{formatarMoeda(Math.abs(demonstrativo?.lucroCentavos ?? 0))}</em> de prejuízo.</>
          )
        }
        apoio={<>Receita líquida de <b>{formatarMoeda(demonstrativo?.receitaLiquidaCentavos ?? 0)}</b>{(demonstrativo?.pecasSemCusto ?? 0) > 0 ? <> · {demonstrativo?.pecasSemCusto} peças sem custo lançado, o lucro real é menor</> : null}.</>}
      />

      <Cartao titulo="Demonstrativo da loja">
        <div className="mb-4 flex gap-2">
          {JANELAS.map((janela) => (
            <button
              key={janela.dias}
              onClick={() => setDias(janela.dias)}
              className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                dias === janela.dias ? "border-positivo/40 bg-positivo/10 text-positivo" : "border-pauta text-muted-fg"
              }`}
            >
              {janela.rotulo}
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          <Metrica rotulo="Receita líquida" valor={formatarMoeda(demonstrativo?.receitaLiquidaCentavos ?? 0)} />
          <Metrica
            rotulo="Custo da mercadoria vendida"
            valor={formatarMoeda(demonstrativo?.cmvCentavos ?? 0)}
            detalhe={
              demonstrativo && demonstrativo.pecasSemCusto > 0
                ? `${demonstrativo.pecasSemCusto} peça(s) sem custo lançado, fora dessa conta`
                : undefined
            }
          />
          <Metrica rotulo="Despesas pagas" valor={formatarMoeda(demonstrativo?.despesasCentavos ?? 0)} />
          <Metrica
            rotulo="Lucro"
            valor={formatarMoeda(demonstrativo?.lucroCentavos ?? 0)}
            tom={demonstrativo && demonstrativo.lucroCentavos < 0 ? "negativo" : "positivo"}
          />
        </div>

        <p className="mt-4 text-[calc(12px*var(--escala-letra))] leading-relaxed text-muted-fg">
          Receita líquida já descontada a taxa da maquininha (mesma conta do Balcão). Custo da mercadoria vendida usa
          o custo médio atual de cada produto — não o custo exato do dia da venda, mesma referência que a Prateleira
          usa na margem. Despesa é o que foi marcado como pago em{" "}
          <a href="/loja/contas" className="underline underline-offset-2">
            Contas a pagar
          </a>{" "}
          no período.
        </p>
      </Cartao>
    </div>
  )
}
