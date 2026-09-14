"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { ArrowDown, ArrowDownLeft, ArrowRight, ArrowUpRight, Check, CreditCard, Pause, Play, RotateCcw, Sparkles } from "lucide-react"
import { Leao } from "@/app/(site)/leao"
import estilos from "./cena-financeira.module.css"

/** Uma única cena: os cartões nascem separados e pousam no painel.
 * O scroll só altera variáveis de composição, sem capturar a rolagem.
 * Pausa e movimento reduzido mantêm o mesmo conteúdo em uma cena estática.
 */
export function CenaFinanceira({ dias }: { dias: number }) {
  const trilho = useRef<HTMLElement>(null)
  const copia = useRef<HTMLDivElement>(null)
  const [pausado, setPausado] = useState(false)
  const [rodada, setRodada] = useState(0)

  useEffect(() => {
    const elemento = trilho.current
    if (!elemento) return
    const preferencia = window.matchMedia("(prefers-reduced-motion: reduce)")
    let quadro = 0
    const atualizar = () => {
      quadro = 0
      elemento.dataset.reduzido = String(preferencia.matches)
      if (pausado && !preferencia.matches) return
      const caixa = elemento.getBoundingClientRect()
      const progresso = preferencia.matches || window.innerWidth <= 900 ? 0 : Math.min(1, Math.max(0, -caixa.top / Math.max(1, caixa.height - window.innerHeight)))
      elemento.style.setProperty("--viagem", progresso.toFixed(4))
      if (copia.current) copia.current.inert = progresso > .35
    }
    const agendar = () => { if (!quadro) quadro = requestAnimationFrame(atualizar) }
    atualizar()
    window.addEventListener("scroll", agendar, { passive: true })
    window.addEventListener("resize", agendar)
    preferencia.addEventListener("change", agendar)
    return () => {
      cancelAnimationFrame(quadro)
      window.removeEventListener("scroll", agendar)
      window.removeEventListener("resize", agendar)
      preferencia.removeEventListener("change", agendar)
    }
  }, [pausado])

  return <section ref={trilho} className={estilos.trilho} data-pausado={pausado} aria-labelledby="titulo-abertura">
    <div className={estilos.fixo}>
      <div className={estilos.luz} aria-hidden />
      <div className={estilos.grade} aria-hidden />
      <div ref={copia} className={estilos.copia}>
        <p className={estilos.etiqueta}><span /> Seu dinheiro. Uma nova perspectiva.</p>
        <h1 id="titulo-abertura">A vida anda.<br />Seu dinheiro<br /><em>acompanha.</em></h1>
        <p className={estilos.apoio}>Contas, cartões e planos.<br />Tudo começa a fazer sentido.</p>
        <div className={estilos.acoes}>
          <Link href="/cadastro">Começar minha virada <ArrowUpRight size={18} /></Link>
          <span>{dias} dias grátis<br />Sem cartão de crédito</span>
        </div>
      </div>

      <div className={estilos.proximo} aria-hidden>
        <span>DO SEU JEITO. NO SEU RITMO.</span>
        <h2>As peças se encaixam.</h2>
        <p>Você enxerga o todo. E sabe por onde começar.</p>
      </div>

      <div className={estilos.camera}>
        <div className={estilos.montagem} key={rodada}>
          <div className={estilos.janela} aria-hidden><span /><span /><span /><b>Seu espaço, no Tino</b><i>● Conectado com você</i></div>
          <article className={`${estilos.peca} ${estilos.saldo}`}>
            <header><span>Seu mês, num olhar</span><ArrowUpRight size={17} /></header>
            <small>Saldo disponível</small><strong>R$ 15.166<span>,00</span></strong>
            <div className={estilos.resumo}><span><ArrowDownLeft size={14} /> Entrou <b>R$ 8.600</b></span><span><ArrowUpRight size={14} /> Saiu <b>R$ 4.164</b></span></div>
          </article>
          <article className={`${estilos.peca} ${estilos.grafico}`}>
            <header><span>Seu próximo capítulo</span><span>6 meses <ArrowRight size={13} /></span></header>
            <div className={estilos.graficoNumero}><strong>Mais clareza.</strong><small>Para decidir o que vem depois.</small></div>
            <svg viewBox="0 0 560 210" fill="none" aria-hidden>
              <defs><linearGradient id="cena-preenchimento" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#a9e9cd" stopOpacity=".25"/><stop offset="1" stopColor="#a9e9cd" stopOpacity="0"/></linearGradient></defs>
              <path className={estilos.linhas} d="M0 50H560M0 105H560M0 160H560" />
              <path className={estilos.area} d="M0 179C50 180 42 132 92 146S152 180 199 119S244 140 290 92S353 100 401 65S484 73 560 18V210H0Z" fill="url(#cena-preenchimento)" />
              <path className={estilos.curva} pathLength="1" d="M0 179C50 180 42 132 92 146S152 180 199 119S244 140 290 92S353 100 401 65S484 73 560 18" />
              <circle className={estilos.ponto} cx="401" cy="65" r="6" />
            </svg>
            <footer><span>Hoje</span><span>Seu futuro começa aqui <ArrowUpRight size={12} /></span></footer>
          </article>
          <article className={`${estilos.peca} ${estilos.cartao}`}>
            <header><b>tino.</b><CreditCard size={22} /></header>
            <div className={estilos.chip} aria-hidden />
            <small>Seu cartão, sob controle.</small><strong>R$ 579<span>,00</span></strong>
            <footer><span>Fatura do mês</span><span>•••• 8842</span></footer>
          </article>
          <article className={`${estilos.peca} ${estilos.categorias}`}>
            <header><span>Cada gasto no lugar</span><span>Este mês</span></header>
            {[{ nome: "Moradia", valor: "R$ 2.025", largura: "82%" }, { nome: "Educação", valor: "R$ 780", largura: "48%" }, { nome: "Mercado", valor: "R$ 326", largura: "29%" }].map(item => <div className={estilos.categoria} key={item.nome}><span>{item.nome}<b>{item.valor}</b></span><i><span style={{ width: item.largura }} /></i></div>)}
          </article>
          <aside className={`${estilos.peca} ${estilos.aviso}`}><span className={estilos.confirmacao}><Check size={16} /></span><div><b>Agora você vê o todo.</b><small>O próximo passo fica mais simples.</small></div><Sparkles size={16} /></aside>
          <div className={estilos.assinatura}><Leao tamanho={78} /><span>Um pouco de tino.<br /><b>Uma grande diferença.</b></span></div>
        </div>
      </div>

      <div className={estilos.rodape}>
        <a href="#no-seu-bolso"><ArrowDown size={15} /> Role para ver tudo se conectar</a>
        <div><span>Cena ilustrativa · dados de demonstração</span><button type="button" aria-label={pausado ? "Retomar animação" : "Pausar animação"} onClick={() => setPausado(!pausado)}>{pausado ? <Play size={14} /> : <Pause size={14} />}</button><button type="button" aria-label="Repetir entrada da cena" onClick={() => { setPausado(false); setRodada(rodada + 1) }}><RotateCcw size={14} /></button></div>
      </div>
    </div>
  </section>
}
