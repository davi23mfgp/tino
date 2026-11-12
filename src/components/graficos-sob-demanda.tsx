"use client"

import dynamic from "next/dynamic"

/**
 * Os gráficos carregam depois da tela (auditoria, achado 33).
 *
 * A biblioteca de gráficos é o maior pedaço de JavaScript do app, e entrava
 * no pacote de toda tela que mostra um gráfico, atrasando os números que
 * vêm antes dele. Agora a tela pinta primeiro e o gráfico chega em seguida,
 * num espaço da mesma altura reservado antes: nada pula de lugar.
 */
const Reserva = ({ altura }: { altura: number }) => <div aria-hidden style={{ height: altura }} />

export const GraficoDozeMeses = dynamic(() => import("@/components/graficos").then((modulo) => modulo.GraficoDozeMeses), {
  ssr: false,
  loading: () => <Reserva altura={220} />,
})
export const GraficoBalanco = dynamic(() => import("@/components/graficos").then((modulo) => modulo.GraficoBalanco), {
  ssr: false,
  loading: () => <Reserva altura={280} />,
})
export const GraficoDaDivisao = dynamic(() => import("@/components/graficos").then((modulo) => modulo.GraficoDaDivisao), {
  ssr: false,
  loading: () => <Reserva altura={240} />,
})
