"use client"

import { CarteiraInvestimentos } from "@/components/carteira-investimentos"
import { useCallback, useEffect, useMemo, useState } from "react"

import { buscar } from "@/lib/cliente"
import { formatarDecimal, formatarMoeda, formatarPercentual, paraCentavos } from "@/lib/dinheiro"
import { Cartao, Detalhe, Pilula, Vazio } from "@/components/ui/painel"
import { Abertura } from "@/components/abertura"
import Link from "next/link"
import { GraficoDaDivisao, GraficoDoCorte } from "@/components/graficos"
import { corteViraPatrimonio } from "@/lib/tino/investir"
import { cn } from "@/lib/utils"
import estilos from "./investir.module.css"

/**
 * Longo prazo.
 *
 * A tela responde uma pergunta e a mantém no centro: **o que muda se eu
 * guardar um pouco por mês.** A resposta é o patrimônio no fim do prazo, em
 * tamanho de manchete; o efeito no caixa dos próximos dois anos vem logo
 * abaixo.
 *
 * O que explica a conta — a hipótese de rendimento, o método de divisão do
 * aporte, a referência de orçamento — fica recolhido. São textos de conferência,
 * não o conteúdo principal, e abertos de uma vez empurravam a resposta para
 * fora da tela.
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

/** Rendimento real, já líquido de inflação. Conservador de propósito. */
const RENDIMENTO_REAL_ANUAL_BPS = 400

const ATALHOS = ["100", "200", "500", "1000"]

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

  const anosNumero = Math.max(0, Math.min(50, Number(anos) || 0))
  const futuro = useMemo(
    () => corteViraPatrimonio({ cortePorMesCentavos: corteCentavos, anos: anosNumero, rendimentoRealAnualBps: RENDIMENTO_REAL_ANUAL_BPS }),
    [corteCentavos, anosNumero],
  )

  if (dados && !dados.temBase) {
    return (
      <div className={estilos.pagina}>
        <CarteiraInvestimentos />
        <Cartao titulo="Longo prazo">
          <Vazio
            titulo="Ainda não sei quanto você ganha e gasta"
            texto="Importe um extrato ou anote alguns lançamentos. Sem histórico, qualquer projeção aqui seria chute — e chute sobre vinte anos erra muito."
          />
        </Cartao>
      </div>
    )
  }

  const sobra = dados?.sobraMensalCentavos ?? 0
  const vermelho = dados?.corte.mesQueFicaNegativoSemCorte ?? null

  return (
    <div className={estilos.pagina}>
      <CarteiraInvestimentos />

      {/* A entrada da seção, no desenho aprovado: a resposta primeiro, com o
          número dela dentro da frase, e só depois os controles que a mudam. A
          faixa manual de antes dizia a pergunta em cima e escondia a resposta
          na coluna da direita, alinhada à direita — o olho batia no controle. */}
      <Abertura
        rotulo="Longo prazo"
        titulo={<>Guardando {formatarMoeda(corteCentavos)} por mês, você teria <em>{formatarMoeda(futuro.patrimonioCentavos)}</em> em {anosNumero} {anosNumero === 1 ? "ano" : "anos"}.</>}
        apoio={<>Você guardou <b>{formatarMoeda(futuro.aportadoCentavos)}</b>; os juros fizeram <b>{formatarMoeda(futuro.jurosCentavos)}</b>.</>}
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

      {/* Rótulo e número. A frase que explicava cada tile saiu: ela repetia em
          palavras o que o número já diz, contra a regra de mínimo de texto. O
          que sobrou virou etiqueta — e o tile que aponta problema ganhou o
          botão que resolve, em vez de só avisar. */}
      <div className={estilos.numeros}>
        <div className={cn(estilos.numero, sobra < 0 ? estilos.negativo : estilos.positivo)}>
          <p className={estilos.rotulo}>Sobra hoje</p>
          <strong>{formatarMoeda(sobra)}</strong>
          <div className="mt-2"><Pilula tom="neutro">média dos últimos meses</Pilula></div>
        </div>
        <div className={cn(estilos.numero, estilos.positivo)}>
          <p className={estilos.rotulo}>Em dois anos, a diferença</p>
          <strong>{formatarMoeda(dados?.corte.diferencaCentavos ?? 0)}</strong>
          <div className="mt-2"><Pilula tom="positivo">contra não guardar nada</Pilula></div>
        </div>
        <div className={cn(estilos.numero, vermelho && estilos.negativo)}>
          <p className={estilos.rotulo}>Caixa no vermelho</p>
          <strong>{vermelho ? `em ${vermelho} ${vermelho === 1 ? "mês" : "meses"}` : "não chega lá"}</strong>
          {vermelho ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {dados?.corte.mesQueSaiDoVermelho && (
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
        <div className="mt-4">{dados && <GraficoDoCorte dados={dados.corte.serie} />}</div>
      </section>

      <div className={estilos.duas}>
        <section className={estilos.bloco}>
          <h2>Onde colocar cada parte da renda</h2>
          {dados && (
            <>
              <div className="mt-4"><GraficoDaDivisao fatias={dados.divisaoSugerida} total={formatarMoeda(dados.receitaMensalCentavos)} /></div>
              <div className={estilos.referencia}>
                {dados.divisaoSugerida.map((fatia) => (
                  <div key={fatia.nome}>
                    <span>{fatia.rotulo}<small>{formatarPercentual(fatia.percentualBps, 0)}</small></span>
                    <b>{formatarMoeda(fatia.valorCentavos)}</b>
                  </div>
                ))}
              </div>
              <p className={estilos.nota}>Referência do Grão (Grupo Primo). Parâmetro, não regra. Cálculo, não recomendação.</p>
            </>
          )}
        </section>
      </div>

      <Detalhe titulo="Como esta conta é feita">
        <p>
          O patrimônio é calculado a {formatarDecimal(RENDIMENTO_REAL_ANUAL_BPS / 100, 0)}% ao ano{" "}
          <strong>acima da inflação</strong>, com aporte mensal constante. É uma hipótese conservadora, não uma
          promessa: rendimento passado não garante rendimento futuro e nenhum investimento é obrigado a entregar
          isso. A projeção de caixa dos 24 meses usa a média de receitas e despesas dos seus últimos meses, sem
          prever imprevisto nem aumento de renda. Escolher onde colocar dinheiro depende do seu prazo, da sua
          tolerância a perda e da sua situação — coisas que um profissional autorizado avalia com você.
        </p>
      </Detalhe>
    </div>
  )
}
