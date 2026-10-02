"use client"

import { useEffect, useRef, useState } from "react"
import { Pause, Play } from "lucide-react"
import { PreviaAtual } from "./demonstracao-sistema"
import { TELAS_MEI } from "./previa-sistema"

const TELAS = [
  { arquivo: "inicio", nome: "Início", descricao: "Resultado do mês, saldo, entradas, saídas e cartões." },
  { arquivo: "cartoes", nome: "Cartões", descricao: "Seus cartões, faturas e compromissos futuros." },
  { arquivo: "extrato", nome: "Extrato", descricao: "Lançamentos, categorias e filtros do extrato." },
  { arquivo: "dividas", nome: "Dívidas", descricao: "Quanto deve, qual atacar primeiro e quando fica livre." },
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
export function DemonstracaoReal({ modoMei = false }: { modoMei?: boolean }) {
  const telas = modoMei ? TELAS_MEI.map((tela) => ({ arquivo: tela.chave, nome: tela.nome, descricao: tela.apoio })) : TELAS
  const [ativa, definirAtiva] = useState(0)
  const [pausada, definirPausada] = useState(false)
  const [reduzido, definirReduzido] = useState(false)
  const [visivel, definirVisivel] = useState(false)
  const palco = useRef<HTMLDivElement>(null)
  const cena = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const consulta = matchMedia("(prefers-reduced-motion: reduce)")
    const atualizar = () => definirReduzido(consulta.matches)
    atualizar(); consulta.addEventListener("change", atualizar)
    const observador = new IntersectionObserver(([entrada]) => definirVisivel(entrada.isIntersecting), { threshold: 0.15 })
    if (palco.current) observador.observe(palco.current)
    return () => { consulta.removeEventListener("change", atualizar); observador.disconnect() }
  }, [])
  useEffect(() => {
    if (modoMei || pausada || reduzido || !visivel) return
    const intervalo = setInterval(() => {
      if (!document.hidden) definirAtiva(atual => (atual + 1) % telas.length)
    }, 5500)
    return () => clearInterval(intervalo)
  }, [modoMei, pausada, reduzido, visivel, telas.length])
  // No MEI, a etapa acompanha a rolagem da página. O observador do carrossel
  // pessoal continua independente, pois sua demonstração avança pelo tempo.
  useEffect(() => {
    if (!modoMei || reduzido || pausada) return
    const atualizar = () => {
      if (!palco.current || !cena.current) return
      const inicio = palco.current.getBoundingClientRect().top + window.scrollY
      const percurso = Math.max(1, palco.current.offsetHeight - cena.current.offsetHeight)
      const progresso = Math.max(0, Math.min(1, (window.scrollY - inicio) / percurso))
      definirAtiva(Math.min(telas.length - 1, Math.floor(progresso * telas.length)))
    }
    atualizar()
    window.addEventListener("scroll", atualizar, { passive: true })
    window.addEventListener("resize", atualizar)
    return () => { window.removeEventListener("scroll", atualizar); window.removeEventListener("resize", atualizar) }
  }, [modoMei, pausada, reduzido, telas.length])
  const escolher = (indice: number) => {
    definirAtiva(indice)
    if (!modoMei || pausada || reduzido || !palco.current || !cena.current) {
      definirPausada(true)
      return
    }
    const inicio = palco.current.getBoundingClientRect().top + window.scrollY
    const percurso = palco.current.offsetHeight - cena.current.offsetHeight
    window.scrollTo({ top: inicio + percurso * (indice + 0.1) / telas.length, behavior: "smooth" })
  }
  return <div className="lp-demonstracao" ref={palco} data-pausada={pausada || reduzido}>
    <div className="lp-demonstracao-conteudo" ref={cena}>
    <div className="lp-flutuante lp-flutuante-um"><span className="lp-ponto" /> {modoMei ? "Vendas do dia" : "Escola do Téo"}<small>{modoMei ? "Balcão · dados de exemplo" : "Educação · 10 de setembro"}</small><strong>{modoMei ? "R$ 1.240,00" : "R$ 795,00"}</strong></div>
    <div className="lp-flutuante lp-flutuante-dois">{modoMei ? <><span>Caixa conferido</span><strong>R$ 560,00</strong><small>Dinheiro · dados de exemplo</small></> : <><span>Fatura atual · Platinum</span><strong>R$ 579,00</strong><div className="lp-mini-bancos"><img src="/bancos/bb.png" alt="Banco do Brasil" /><small>Fecha dia 28 · vence dia 6</small></div></>}</div>
    <div className="lp-janela" role="group" aria-label={modoMei ? "Prévia do Tino MEI com dados fictícios" : "Telas reais do aplicativo Tino com dados de demonstração"}>
      <div className="lp-janela-barra" aria-hidden="true">
        <i /><i /><i />
        <span>tino.app</span>
      </div>
      <div className={modoMei ? "lp-visor lp-visor-mei" : "lp-visor"}>
        {modoMei ? TELAS_MEI.map((tela, indice) => <div key={tela.chave} className="lp-tela-real" data-ativa={indice === ativa} aria-hidden={indice !== ativa} inert={indice !== ativa}><PreviaAtual tela={tela.chave} /></div>) : telas.map((tela, indice) => <img key={tela.arquivo} className="lp-tela-real" data-ativa={indice === ativa} src={`/demonstracao/${tela.arquivo}-desktop.webp`} alt={`${tela.nome}: ${tela.descricao}`} aria-hidden={indice !== ativa} width={1265} height={712} loading={indice === 0 ? "eager" : "lazy"} />)}
      </div>
    </div>
    <div className="lp-flutuante lp-flutuante-tres"><span>{modoMei ? "Recebimentos a acompanhar" : "Antes de entrar no saldo"}</span><strong>{modoMei ? "3 clientes no fiado" : "3 compras para conferir"}</strong><small>{modoMei ? "Total de R$ 360,00" : "Total de R$ 326,80"}</small></div>
    <div className="lp-demo-controles" aria-label="Escolher tela da demonstração">{telas.map((tela, indice) => <button key={tela.arquivo} aria-pressed={ativa === indice} onClick={() => escolher(indice)}>{tela.nome}</button>)}<button aria-label={pausada || reduzido ? "Reproduzir demonstração" : "Pausar demonstração"} disabled={reduzido} onClick={() => definirPausada(!pausada)}>{pausada || reduzido ? <Play size={16} /> : <Pause size={16} />}</button></div>
    <p className="lp-legenda-demo">{modoMei ? "Prévia do Tino MEI · dados fictícios" : "Interface real do Tino · dados de demonstração"}</p>
    </div>
  </div>
}
