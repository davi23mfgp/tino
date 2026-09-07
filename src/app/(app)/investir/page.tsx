"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { buscar } from "@/lib/cliente"
import { formatarDecimal, formatarMoeda, formatarPercentual, paraCentavos } from "@/lib/dinheiro"
import { Cartao, Metrica, Valor, Vazio } from "@/components/ui/painel"
import { GraficoDaDivisao, GraficoDoCorte } from "@/components/graficos"
import { corteViraPatrimonio, dividirPorArca } from "@/lib/tino/investir"
import { TinoMascote } from "@/components/tino-mascote"

/**
 * Longo prazo.
 *
 * A tela responde uma pergunta e a mantém no centro: **o que muda se eu cortar
 * um pouco por mês.** Primeiro no caixa dos próximos dois anos, depois no
 * patrimônio de vinte.
 *
 * Nada aqui é recomendação de investimento. Os métodos citados são de terceiros
 * e a conta é feita sobre o dinheiro que a pessoa já tem — o Tino não escolhe
 * ativo, não indica corretora e não diz o que fazer.
 */

interface Fatia {
  nome: string
  rotulo: string
  percentualBps: number
  valorCentavos: number
  explicacao: string
}

interface Resposta {
  receitaMensalCentavos: number
  despesaMensalCentavos: number
  sobraMensalCentavos: number
  saldoAtualCentavos: number
  temBase: boolean
  divisaoSugerida: Fatia[]
  corte: {
    cortePorMesCentavos: number
    serie: { mes: number; semCorteCentavos: number; comCorteCentavos: number }[]
    diferencaCentavos: number
    mesQueSaiDoVermelho: number | null
    mesQueFicaNegativoSemCorte: number | null
  }
  reserva: { idealCentavos: number; atualCentavos: number; percentual: number; mesesDeFolga: number } | null
}

const campo = "rounded-xl border border-pauta bg-background px-3 py-2 text-[13px] outline-none focus:border-positivo/50"

/** Rendimento real, já líquido de inflação. Conservador de propósito. */
const RENDIMENTO_REAL_ANUAL_BPS = 400

export default function Investir() {
  const [corte, setCorte] = useState("200")
  const [anos, setAnos] = useState("20")
  const [dados, setDados] = useState<Resposta | null>(null)

  const corteCentavos = useMemo(() => paraCentavos(corte), [corte])

  const carregar = useCallback(async () => {
    setDados(await buscar<Resposta>(`/api/investir?corteCentavos=${corteCentavos}&meses=24`))
  }, [corteCentavos])

  useEffect(() => {
    const relogio = setTimeout(carregar, 250)
    return () => clearTimeout(relogio)
  }, [carregar])

  const futuro = useMemo(
    () =>
      corteViraPatrimonio({
        cortePorMesCentavos: corteCentavos,
        anos: Math.max(0, Math.min(50, Number(anos) || 0)),
        rendimentoRealAnualBps: RENDIMENTO_REAL_ANUAL_BPS,
      }),
    [corteCentavos, anos],
  )

  const partesDoArca = useMemo(() => dividirPorArca(corteCentavos), [corteCentavos])

  if (dados && !dados.temBase) {
    return (
      <Cartao titulo="Longo prazo">
        <Vazio
          titulo="Ainda não sei quanto você ganha e gasta"
          texto="Importe um extrato ou anote alguns lançamentos. Sem histórico, qualquer projeção aqui seria chute — e chute sobre vinte anos erra muito."
        />
      </Cartao>
    )
  }

  return (
    <div className="space-y-4">
      <Cartao titulo="E se eu cortar um pouco por mês?">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1.5 text-[12px] text-muted-fg">
            cortar por mês
            <input
              inputMode="decimal"
              value={corte}
              onChange={(evento) => setCorte(evento.target.value)}
              className={`${campo} w-36`}
            />
          </label>

          <div className="flex gap-1.5">
            {["100", "200", "500", "1000"].map((valor) => (
              <button
                key={valor}
                onClick={() => setCorte(valor)}
                className={`rounded-full border px-3 py-1.5 text-[12px] ${
                  corte === valor ? "border-positivo text-positivo" : "border-pauta text-muted-fg"
                }`}
              >
                {formatarMoeda(paraCentavos(valor), false)}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Metrica
            rotulo="Sobra hoje"
            valor={formatarMoeda(dados?.sobraMensalCentavos ?? 0)}
            tom={(dados?.sobraMensalCentavos ?? 0) < 0 ? "negativo" : "positivo"}
            detalhe="média dos últimos meses"
          />
          <Metrica
            rotulo="Em 2 anos, a diferença"
            valor={formatarMoeda(dados?.corte.diferencaCentavos ?? 0)}
            tom="positivo"
            detalhe="entre cortar e não cortar"
          />
          <Metrica
            rotulo="Caixa no vermelho"
            valor={
              dados?.corte.mesQueFicaNegativoSemCorte
                ? `em ${dados.corte.mesQueFicaNegativoSemCorte} ${dados.corte.mesQueFicaNegativoSemCorte === 1 ? "mês" : "meses"}`
                : "não chega lá"
            }
            tom={dados?.corte.mesQueFicaNegativoSemCorte ? "negativo" : "neutro"}
            detalhe="mantendo o ritmo de hoje"
          />
        </div>

        <div className="mt-5">
          {dados && <GraficoDoCorte dados={dados.corte.serie} />}
        </div>

        {dados?.corte.mesQueSaiDoVermelho && (
          <p className="mt-3 rounded-xl border border-positivo/40 bg-positivo/10 p-3 text-[13px] text-positivo">
            Cortando {formatarMoeda(corteCentavos)} por mês, o caixa deixa de ficar negativo no mês{" "}
            {dados.corte.mesQueSaiDoVermelho}.
          </p>
        )}
      </Cartao>

      <div className="grid gap-4 lg:grid-cols-2">
        <Cartao titulo="O mesmo corte, guardado">
          <div className="flex items-end gap-3">
            <label className="flex flex-col gap-1.5 text-[12px] text-muted-fg">
              por quantos anos
              <input
                inputMode="numeric"
                value={anos}
                onChange={(evento) => setAnos(evento.target.value)}
                className={`${campo} w-24`}
              />
            </label>
          </div>

          <Valor tom="positivo" className="mt-4">{formatarMoeda(futuro.patrimonioCentavos)}</Valor>

          <div className="mt-3 space-y-1 text-[13px]">
            <p className="flex justify-between">
              <span className="text-muted-fg">o que você guardou</span>
              <span className="numero">{formatarMoeda(futuro.aportadoCentavos)}</span>
            </p>
            <p className="flex justify-between">
              <span className="text-muted-fg">o que os juros fizeram</span>
              <span className="numero text-positivo">{formatarMoeda(futuro.jurosCentavos)}</span>
            </p>
          </div>

          <p className="mt-4 text-[12px] leading-relaxed text-muted-fg">
            Conta feita a {formatarPercentual(RENDIMENTO_REAL_ANUAL_BPS, 0)} ao ano <strong>acima da inflação</strong>.
            É uma hipótese conservadora, não uma promessa: rendimento passado não garante rendimento futuro, e nenhum
            investimento é obrigado a entregar isso.
          </p>
        </Cartao>

        <Cartao titulo="Para onde esse dinheiro poderia ir">
          <p className="text-[13px] leading-relaxed text-muted-fg">
            O método <strong>ARCA</strong>, divulgado por Thiago Nigro, divide o aporte em quatro partes iguais e
            reequilibra pelo aporte seguinte, em vez de vender o que subiu.
          </p>

          <div className="mt-4 space-y-2">
            {partesDoArca.map((parte, indice) => (
              <div key={indice} className="flex items-center gap-3 rounded-xl border border-pauta bg-papel-2 px-3 py-2.5">
                <span className="font-display grid size-8 shrink-0 place-items-center rounded-lg bg-foreground/[0.06] text-[15px] font-semibold">
                  {parte.letra}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium">{parte.rotulo}</p>
                  <p className="text-[11px] text-muted-fg">{parte.explicacao}</p>
                </div>
                <span className="numero text-[13px]">{formatarMoeda(parte.valorCentavos)}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 flex gap-2.5 rounded-xl border border-atencao/40 bg-atencao/10 p-3">
            <TinoMascote estado="atento" animado={false} className="size-8 shrink-0" />
            <p className="text-[12px] leading-relaxed text-atencao">
              <strong>Não sou consultor de investimentos.</strong> Isto é uma conta de dividir, feita sobre o método de
              outra pessoa, e não uma indicação do que comprar. Escolher onde colocar dinheiro depende do seu prazo, da
              sua tolerância a perda e da sua situação — coisas que um profissional autorizado avalia com você.
            </p>
          </div>
        </Cartao>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Cartao titulo="Como sua renda se divide hoje">
          {dados && (
            <>
              <GraficoDaDivisao
                fatias={dados.divisaoSugerida}
                total={formatarMoeda(dados.receitaMensalCentavos)}
              />

              <div className="mt-3 space-y-1.5">
                {dados.divisaoSugerida.map((fatia) => (
                  <div key={fatia.nome} className="flex items-baseline justify-between gap-3 text-[13px]">
                    <span>
                      {fatia.rotulo}
                      <span className="ml-1.5 text-[11px] text-muted-fg">
                        {formatarPercentual(fatia.percentualBps, 0)}
                      </span>
                    </span>
                    <span className="numero">{formatarMoeda(fatia.valorCentavos)}</span>
                  </div>
                ))}
              </div>

              <p className="mt-4 text-[12px] leading-relaxed text-muted-fg">
                Divisão de referência publicada pelo Grão, do Grupo Primo. É parâmetro de comparação, não regra: quem
                mora em capital cara estoura os 60% de necessidades sem estar fazendo nada de errado. Serve para
                enxergar a distância entre o que você gasta e essa referência.
              </p>
            </>
          )}
        </Cartao>

        <Cartao titulo="Reserva de emergência">
          {dados?.reserva ? (
            <>
              <Valor tamanho="medio">{formatarMoeda(dados.reserva.atualCentavos)}</Valor>
              <p className="mt-1 text-sm text-muted-fg">
                de {formatarMoeda(dados.reserva.idealCentavos)} — cobre {formatarDecimal(dados.reserva.mesesDeFolga)}{" "}
                mês(es) de custo
              </p>

              <p className="mt-4 text-[12px] leading-relaxed text-muted-fg">
                A reserva vem antes de investir em qualquer coisa de prazo longo. Sem ela, o primeiro imprevisto vira
                dívida de cartão — e juro de cartão come qualquer rendimento que você fosse ter.
              </p>
            </>
          ) : (
            <Vazio titulo="Sem dados para calcular a reserva" />
          )}
        </Cartao>
      </div>
    </div>
  )
}
