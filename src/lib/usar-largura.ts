"use client"

import { useEffect, useState } from "react"

/**
 * Quantos itens cabem na janela, conforme a largura da tela.
 *
 * Existe por um defeito medido em 13/09: o gráfico "Faturas por mês" abria
 * seis colunas fixas, e em 320px isso empurrava a página inteira para 402px
 * de largura — rolagem horizontal, que a aceitação proíbe. Esconder coluna
 * por CSS não resolveria, porque os controles anterior/próximo precisam saber
 * quantos meses a janela andou.
 *
 * Começa pelo maior valor e ajusta depois de montar. O salto acontece uma vez
 * só, no primeiro quadro, e é preferível ao contrário: renderizar pequeno no
 * servidor faria o desktop piscar com três colunas antes de virar seis.
 */
export function useJanela(faixas: { ate: number; itens: number }[], padrao: number) {
  const [itens, setItens] = useState(padrao)

  useEffect(() => {
    function medir() {
      const largura = window.innerWidth
      const faixa = faixas.find((opcao) => largura <= opcao.ate)
      setItens(faixa ? faixa.itens : padrao)
    }
    medir()
    window.addEventListener("resize", medir)
    return () => window.removeEventListener("resize", medir)
    // `faixas` é literal na chamada; comparar por conteúdo evitaria um efeito
    // por render, mas aqui o custo é um `resize` listener, não vale a trava.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [padrao])

  return itens
}
