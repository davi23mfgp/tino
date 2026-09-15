"use client"

import { useEffect, useRef, useState } from "react"
import { Pause, Play } from "lucide-react"

const TELAS = [
  { arquivo: "inicio", nome: "Início", descricao: "Resultado do mês, saldo, entradas, saídas e cartões." },
  { arquivo: "cartoes", nome: "Cartões", descricao: "Seus cartões, faturas e compromissos futuros." },
  { arquivo: "extrato", nome: "Extrato", descricao: "Lançamentos, categorias e filtros do extrato." },
]

/**
 * As telas do Tino na primeira dobra.
 *
 * Era um celular desenhado com a tela dentro. O aparelho ocupava metade da
 * dobra para mostrar um retângulo de 340px — o produto aparecia pequeno
 * justamente onde ele precisa aparecer grande. Agora é a plataforma em
 * tamanho de plataforma, numa moldura de janela.
 *
 * Capturas do app, na conta demo. Nunca consulta dados de visitantes.
 */
export function DemonstracaoReal() {
  const [ativa, definirAtiva] = useState(0)
  const [pausada, definirPausada] = useState(false)
  const [reduzido, definirReduzido] = useState(false)
  const [visivel, definirVisivel] = useState(false)
  const palco = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const consulta = matchMedia("(prefers-reduced-motion: reduce)")
    const atualizar = () => definirReduzido(consulta.matches)
    atualizar(); consulta.addEventListener("change", atualizar)
    const observador = new IntersectionObserver(([entrada]) => definirVisivel(entrada.isIntersecting), { threshold: 0.15 })
    if (palco.current) observador.observe(palco.current)
    return () => { consulta.removeEventListener("change", atualizar); observador.disconnect() }
  }, [])
  useEffect(() => {
    if (pausada || reduzido || !visivel) return
    const intervalo = setInterval(() => {
      if (!document.hidden) definirAtiva(atual => (atual + 1) % TELAS.length)
    }, 5500)
    return () => clearInterval(intervalo)
  }, [pausada, reduzido, visivel])
  return <div className="lp-demonstracao" ref={palco} data-pausada={pausada || reduzido}>
    <div className="lp-flutuante lp-flutuante-um"><span className="lp-ponto" /> Escola do Téo<small>Educação · 10 de setembro</small><strong>R$ 780,00</strong></div>
    <div className="lp-flutuante lp-flutuante-dois"><span>Fatura atual · Platinum</span><strong>R$ 579,00</strong><div className="lp-mini-bancos"><img src="/bancos/bb.ico" alt="Banco do Brasil" /><small>Fecha dia 28 · vence dia 6</small></div></div>
    <div className="lp-janela" role="group" aria-label="Telas reais do aplicativo Tino com dados de demonstração">
      <div className="lp-janela-barra" aria-hidden="true">
        <i /><i /><i />
        <span>tino.app</span>
      </div>
      <div className="lp-visor">
        {TELAS.map((tela, indice) => <img key={tela.arquivo} className="lp-tela-real" data-ativa={indice === ativa} src={`/demonstracao/${tela.arquivo}-desktop.png`} alt={`${tela.nome}: ${tela.descricao}`} aria-hidden={indice !== ativa} width={1265} height={712} loading={indice === 0 ? "eager" : "lazy"} />)}
      </div>
    </div>
    <div className="lp-flutuante lp-flutuante-tres"><span>Antes de entrar no saldo</span><strong>3 compras para conferir</strong><small>Total de R$ 326,80</small></div>
    <div className="lp-demo-controles" aria-label="Escolher tela da demonstração">{TELAS.map((tela, indice) => <button key={tela.arquivo} aria-pressed={ativa === indice} onClick={() => { definirAtiva(indice); definirPausada(true) }}>{tela.nome}</button>)}<button aria-label={pausada || reduzido ? "Reproduzir demonstração" : "Pausar demonstração"} disabled={reduzido} onClick={() => definirPausada(!pausada)}>{pausada || reduzido ? <Play size={16} /> : <Pause size={16} />}</button></div>
    <p className="lp-legenda-demo">Interface real do Tino · dados de demonstração</p>
  </div>
}
