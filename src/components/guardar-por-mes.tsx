"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"

import { buscar } from "@/lib/cliente"
import { formatarDecimal, formatarMoeda, paraCentavos } from "@/lib/dinheiro"
import { corteViraPatrimonio } from "@/lib/tino/investir"
import { Abertura } from "@/components/abertura"
import { Detalhe, Pilula } from "@/components/ui/painel"
import { GraficoDoCorte } from "@/components/graficos"
import { cn } from "@/lib/utils"
import estilos from "@/app/(app)/investir/investir.module.css"

/**
 * "E se eu guardar um pouco todo mês?"
 *
 * Morava em `/investir` e mudou para o simulador em 15/09/2026, por decisão do
 * Davi. É simulação — e simulação mora no simulador. Na carteira ela dividia
 * espaço com o assunto da tela, que é o que a pessoa já tem.
 *
 * O que ela responde: quanto o hábito vira em patrimônio no prazo escolhido, e
 * o que muda no caixa dos próximos 24 meses.
 */

/** Rendimento real, já líquido de inflação. Conservador de propósito. */
const RENDIMENTO_REAL_ANUAL_BPS = 400

const ATALHOS = ["100", "200", "500", "1000"]

interface Resposta {
  sobraMensalCentavos: number
  temBase: boolean
  corte: {
    cortePorMesCentavos: number
    serie: { mes: number; semCorteCentavos: number; comCorteCentavos: number }[]
    diferencaCentavos: number
    mesQueSaiDoVermelho: number | null
    mesQueFicaNegativoSemCorte: number | null
  }
}

export function GuardarPorMes() {
  const [corte, setCorte] = useState("200")
  const [anos, setAnos] = useState("20")
  const [dados, setDados] = useState<Resposta | null>(null)

  const corteCentavos = useMemo(() => paraCentavos(corte), [corte])

  const carregar = useCallback(async () => {
    try {
      setDados(await buscar<Resposta>(`/api/investir?corteCentavos=${corteCentavos}&meses=24`))
    } catch {
      // Sem a conta do mês a simulação de longo prazo continua de pé: ela só
      // precisa do valor guardado e do prazo.
    }
  }, [corteCentavos])

  useEffect(() => {
    const relogio = setTimeout(carregar, 250)
    return () => clearTimeout(relogio)
  }, [carregar])

  const anosNumero = Math.max(0, Math.min(50, Number(anos) || 0))
  const futuro = useMemo(
    () => corteViraPatrimonio({ cortePorMesCentavos: corteCentavos, anos: anosNumero, rendimentoRealAnualBps: RENDIMENTO_REAL_ANUAL_BPS }),
    [corteCentavos, anosNumero],
  )

  const sobra = dados?.sobraMensalCentavos ?? 0
  const vermelho = dados?.corte.mesQueFicaNegativoSemCorte ?? null

  return (
    <div className="space-y-4">
      <Abertura
        rotulo="Guardar todo mês"
        titulo={
          <>
            Guardando {formatarMoeda(corteCentavos)} por mês, você teria{" "}
            <em>{formatarMoeda(futuro.patrimonioCentavos)}</em> em {anosNumero} {anosNumero === 1 ? "ano" : "anos"}.
          </>
        }
        apoio={
          <>
            Você guardou <b>{formatarMoeda(futuro.aportadoCentavos)}</b>; os juros fizeram{" "}
            <b>{formatarMoeda(futuro.jurosCentavos)}</b>.
          </>
        }
      >
        <div className={estilos.controles}>
          <span className={estilos.campoValor}>
            <small>R$</small>
            <input
              aria-label="Valor guardado por mês"
              inputMode="decimal"
              value={corte}
              onChange={(evento) => setCorte(evento.target.value)}
            />
          </span>
          <label className={estilos.prazo}>
            por
            <input aria-label="Por quantos anos" inputMode="numeric" value={anos} onChange={(evento) => setAnos(evento.target.value)} />
            anos
          </label>
        </div>
        <div className={estilos.atalhos}>
          {ATALHOS.map((valor) => (
            <button key={valor} type="button" aria-pressed={corte === valor} onClick={() => setCorte(valor)}>
              {formatarMoeda(paraCentavos(valor), false)}
            </button>
          ))}
        </div>
      </Abertura>

      {dados?.temBase && (
        <>
          <div className={estilos.numeros}>
            <div className={cn(estilos.numero, sobra < 0 ? estilos.negativo : estilos.positivo)}>
              <p className={estilos.rotulo}>Sobra hoje</p>
              <strong>{formatarMoeda(sobra)}</strong>
              <div className="mt-2"><Pilula tom="neutro">média dos últimos meses</Pilula></div>
            </div>
            <div className={cn(estilos.numero, estilos.positivo)}>
              <p className={estilos.rotulo}>Em dois anos, a diferença</p>
              <strong>{formatarMoeda(dados.corte.diferencaCentavos)}</strong>
              <div className="mt-2"><Pilula tom="positivo">contra não guardar nada</Pilula></div>
            </div>
            <div className={cn(estilos.numero, vermelho && estilos.negativo)}>
              <p className={estilos.rotulo}>Caixa no vermelho</p>
              <strong>{vermelho ? `em ${vermelho} ${vermelho === 1 ? "mês" : "meses"}` : "não chega lá"}</strong>
              {vermelho ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {dados.corte.mesQueSaiDoVermelho && (
                    <Pilula tom="positivo">sai no mês {dados.corte.mesQueSaiDoVermelho} guardando isso</Pilula>
                  )}
                  <Link href="/orcamento" className="text-[calc(13px*var(--escala-letra))] font-medium text-acao underline-offset-4 hover:underline">
                    Cortar gasto
                  </Link>
                </div>
              ) : (
                <div className="mt-2"><Pilula tom="neutro">no ritmo de hoje</Pilula></div>
              )}
            </div>
          </div>

          <section className={estilos.bloco}>
            <h2>Os próximos 24 meses</h2>
            <p>Guardando {formatarMoeda(corteCentavos)} por mês, contra não guardar nada.</p>
            <div className="mt-4"><GraficoDoCorte dados={dados.corte.serie} /></div>
          </section>
        </>
      )}

      <Detalhe titulo="Como esta conta é feita">
        <p>
          O patrimônio é calculado a {formatarDecimal(RENDIMENTO_REAL_ANUAL_BPS / 100, 0)}% ao ano{" "}
          <strong>acima da inflação</strong>, com aporte mensal constante. É uma hipótese conservadora, não uma
          promessa: rendimento passado não garante rendimento futuro e nenhum investimento é obrigado a entregar isso.
          A projeção de caixa dos 24 meses usa a média de receitas e despesas dos seus últimos meses, sem prever
          imprevisto nem aumento de renda. Escolher onde colocar dinheiro depende do seu prazo, da sua tolerância a
          perda e da sua situação — coisas que um profissional autorizado avalia com você.
        </p>
      </Detalhe>
    </div>
  )
}
