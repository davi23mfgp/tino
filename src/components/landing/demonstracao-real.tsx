"use client"

import { useEffect, useRef, useState } from "react"
import { motion, useMotionValue, useSpring } from "motion/react"
import { Pause, Play, Check, ArrowUpRight, ScanLine } from "lucide-react"

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
export function DemonstracaoReal() {
  const [ativa, definirAtiva] = useState(0)
  const [pausada, definirPausada] = useState(false)
  const [reduzido, definirReduzido] = useState(false)
  const [visivel, definirVisivel] = useState(false)
  const palco = useRef<HTMLDivElement>(null)
  const inclinacaoX = useMotionValue(0)
  const inclinacaoY = useMotionValue(0)
  const giroX = useSpring(inclinacaoX, { stiffness: 90, damping: 24 })
  const giroY = useSpring(inclinacaoY, { stiffness: 90, damping: 24 })
  // Inclinação só com mouse; toque continua dedicado à navegação no celular.
  const aoMover = (evento: React.PointerEvent<HTMLDivElement>) => {
    if (reduzido || pausada || evento.pointerType !== "mouse") return
    const limites = evento.currentTarget.getBoundingClientRect()
    inclinacaoX.set((0.5 - (evento.clientY - limites.top) / limites.height) * 5)
    inclinacaoY.set(((evento.clientX - limites.left) / limites.width - 0.5) * 5)
  }
  const centralizar = () => { inclinacaoX.set(0); inclinacaoY.set(0) }
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
  return <div id="demonstracao" className="lp-demonstracao" ref={palco} data-pausada={pausada || reduzido || !visivel}>
    <div className="lp-halo-demo" aria-hidden />
    <motion.div className="lp-cena-motion" onPointerMove={aoMover} onPointerLeave={centralizar} style={{ rotateX: reduzido ? 0 : giroX, rotateY: reduzido ? 0 : giroY, transformPerspective: 1400 }} initial={{ opacity: 0, y: reduzido ? 0 : 48 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}>
    <div className="lp-flutuante lp-flutuante-um"><span className="lp-float-icone"><ArrowUpRight size={18} aria-hidden /></span><span className="lp-float-titulo">Escola do Téo</span><small>Educação · 10 de setembro</small><strong>R$ 795,00</strong></div>
    <div className="lp-flutuante lp-flutuante-dois"><span className="lp-float-etiqueta">Cartões sob controle <Check size={14} aria-hidden /></span><span>Fatura atual · Platinum</span><strong>R$ 579,00</strong><div className="lp-mini-bancos"><img src="/bancos/bb.png" alt="Banco do Brasil" /><small>Fecha dia 28 · vence dia 6</small></div></div>
    <div className="lp-janela" role="group" aria-label="Telas reais do aplicativo Tino com dados de demonstração">
      <div className="lp-janela-barra" aria-hidden="true">
        <i /><i /><i />
        <span>tino.app</span>
      </div>
      <div className="lp-visor">
        {TELAS.map((tela, indice) => <img key={tela.arquivo} className="lp-tela-real" data-ativa={indice === ativa} src={`/demonstracao/${tela.arquivo}-desktop.webp`} alt={`${tela.nome}: ${tela.descricao}`} aria-hidden={indice !== ativa} width={1265} height={712} loading={indice === 0 ? "eager" : "lazy"} />)}
      </div>
    </div>
    <div className="lp-flutuante lp-flutuante-tres"><span className="lp-float-etiqueta"><ScanLine size={14} aria-hidden /> Você confere primeiro</span><span>Antes de entrar no saldo</span><strong>3 compras para conferir</strong><small>Total de R$ 326,80</small></div>
    </motion.div>
    <div className="lp-demo-controles" aria-label="Escolher tela da demonstração">{TELAS.map((tela, indice) => <button key={tela.arquivo} aria-pressed={ativa === indice} onClick={() => { definirAtiva(indice); definirPausada(true) }}>{tela.nome}</button>)}<button aria-label={pausada || reduzido ? "Reproduzir demonstração" : "Pausar demonstração"} disabled={reduzido} onClick={() => { centralizar(); definirPausada(!pausada) }}>{pausada || reduzido ? <Play size={16} /> : <Pause size={16} />}</button></div>
    <p className="lp-legenda-demo">Interface real do Tino · dados de demonstração</p>
  </div>
}
