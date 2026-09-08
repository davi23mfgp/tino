"use client"

import { useEffect, useRef, useState } from "react"

/**
 * A fita do tempo — a assinatura da vitrine.
 *
 * É a saída de verdade da tela `/projecao`: saldo projetado mês a mês, com o
 * mês em que o caixa cruza o zero marcado. Ela abre a página no lugar onde a
 * maioria dos concorrentes põe um número grande com gradiente, e a escolha é
 * deliberada — o produto não vende "veja seus gastos", vende "existe uma data,
 * e ela tem nome". Um número grande não tem data; uma fita de meses tem.
 *
 * O desenho corre da esquerda para a direita no carregamento, uma coluna por
 * vez, e para no mês da virada. Quem tem `prefers-reduced-motion` recebe a
 * fita inteira pintada de uma vez, sem perder informação nenhuma.
 *
 * Os números são de uma conta de demonstração e a página diz isso em voz
 * alta. Inventar um caso de sucesso seria a mesma mentira que o app inteiro
 * existe para não contar.
 */

interface Mes {
  rotulo: string
  /** Saldo acumulado projetado, em reais. Negativo = caixa no vermelho. */
  saldo: number
}

const MESES: Mes[] = [
  { rotulo: "set", saldo: 5860 },
  { rotulo: "out", saldo: 5240 },
  { rotulo: "nov", saldo: 4180 },
  { rotulo: "dez", saldo: 1960 },
  { rotulo: "jan", saldo: 640 },
  { rotulo: "fev", saldo: -3192 },
  { rotulo: "mar", saldo: -4870 },
  { rotulo: "abr", saldo: -5310 },
]

const VIRADA = MESES.findIndex((mes) => mes.saldo < 0)

const TETO = Math.max(...MESES.map((mes) => Math.abs(mes.saldo)))

function formatar(valor: number) {
  const abs = Math.abs(valor).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${valor < 0 ? "−" : ""}R$ ${abs}`
}

export function FitaDoTempo() {
  // `visiveis` cresce uma coluna por vez. Começa em 0 e sobe até o fim; com
  // movimento reduzido, salta direto para o total.
  const [visiveis, setVisiveis] = useState(0)
  const container = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduzido) {
      setVisiveis(MESES.length)
      return
    }

    let indice = 0
    const relogio = window.setInterval(() => {
      indice += 1
      setVisiveis(indice)
      if (indice >= MESES.length) window.clearInterval(relogio)
    }, 110)

    return () => window.clearInterval(relogio)
  }, [])

  return (
    <figure ref={container} className="fita" aria-describedby="fita-legenda">
      <div className="fita-cabeca">
        <span className="fita-rotulo">Saldo projetado</span>
        <span className="fita-conta">conta de demonstração</span>
      </div>

      <div className="fita-grade" role="img" aria-label={`Saldo projetado mês a mês. O caixa fica negativo em ${MESES[VIRADA].rotulo}, em ${formatar(MESES[VIRADA].saldo)}.`}>
        {/* A linha do zero é a única régua que importa aqui: tudo que a fita
            conta é "de que lado dela cada mês cai". */}
        <span className="fita-zero" aria-hidden />

        {MESES.map((mes, indice) => {
          const negativo = mes.saldo < 0
          const altura = (Math.abs(mes.saldo) / TETO) * 100
          const pintado = indice < visiveis

          return (
            <div key={mes.rotulo} className="fita-coluna" data-virada={indice === VIRADA || undefined}>
              <div className="fita-trilho">
                <span
                  className={negativo ? "fita-barra fita-barra--sai" : "fita-barra fita-barra--entra"}
                  style={{ height: pintado ? `${altura / 2}%` : "0%" }}
                />
              </div>
              <span className="fita-mes">{mes.rotulo}</span>
            </div>
          )
        })}
      </div>

      <figcaption id="fita-legenda" className="fita-legenda">
        <span className="fita-marca" aria-hidden />O caixa vira em <strong>fevereiro</strong> —{" "}
        <span className="fita-valor">{formatar(MESES[VIRADA].saldo)}</span>. Dá para evitar cortando{" "}
        <span className="fita-valor">R$ 532,00</span> por mês até lá.
      </figcaption>
    </figure>
  )
}
