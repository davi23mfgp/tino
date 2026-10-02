"use client"

import { useRef, useState, useEffect } from "react"
import { motion, AnimatePresence, useScroll, useMotionValueEvent, useReducedMotion } from "motion/react"
import { ArrowDown, Pause, Play } from "lucide-react"
import { Leao } from "@/app/(site)/leao"
import { PreviaSistema, CabecalhoPrevia, ICONES_TELA, TELAS_MEI, TELAS_PESSOAIS, type TelaDemonstracao } from "./previa-sistema"
import estilos from "./demonstracao-sistema.module.css"

/** Scroll nativo conduz a visita, sem iframe autenticado nem captura antiga.
 * Botões escolhem uma etapa; pausa e movimento reduzido permitem visita manual.
 */
export function DemonstracaoSistema({ modoMei = false }: { modoMei?: boolean }) {
  const trilho = useRef<HTMLElement>(null)
  const visor = useRef<HTMLDivElement>(null)
  const conteudo = useRef<HTMLDivElement>(null)
  const telas = modoMei ? TELAS_MEI : TELAS_PESSOAIS
  const [ativa, definirAtiva] = useState(0)
  const [pausada, definirPausada] = useState(false)
  const reduzido = useReducedMotion()
  const manual = pausada || Boolean(reduzido)
  const { scrollYProgress } = useScroll({ target: trilho, offset: ["start start", "end end"] })
  useMotionValueEvent(scrollYProgress, "change", (progresso) => {
    if (manual) return
    const posicao = Math.min(telas.length - 0.001, Math.max(0, progresso) * telas.length)
    definirAtiva(Math.floor(posicao))
    if (visor.current && conteudo.current) {
      const distancia = Math.max(0, conteudo.current.scrollHeight - visor.current.clientHeight)
      visor.current.scrollTop = distancia * Math.min(1, Math.max(0, (posicao % 1 - 0.18) / 0.66))
    }
  })
  useEffect(() => { if (visor.current) visor.current.scrollTop = 0 }, [ativa])
  const escolher = (indice: number) => {
    definirAtiva(indice)
    if (manual || !trilho.current) return
    const altura = trilho.current.offsetHeight - window.innerHeight
    const topo = trilho.current.getBoundingClientRect().top + window.scrollY
    window.scrollTo({ top: topo + altura * (indice + 0.12) / telas.length, behavior: "smooth" })
  }
  const tela = telas[ativa]
  return <section id="demonstracao" ref={trilho} className={estilos.trilho} data-manual={Boolean(reduzido)} aria-label={modoMei ? "Visita ao Tino MEI" : "Visita ao Tino pessoal"}>
    <div className={estilos.fixo}>
      <header className={estilos.narrativa}><div><span>{modoMei ? "Dentro do seu negócio" : "Dentro do seu dinheiro"} · {ativa + 1}/{telas.length}</span><h2>{tela.chamada}</h2><p>{tela.apoio}</p></div><span className={estilos.dica}><ArrowDown size={16} />{manual ? "Escolha uma tela abaixo" : "Role para explorar"}</span></header>
      <div className={estilos.janela}>
        <div className={estilos.barraJanela}><span className={estilos.pontos} aria-hidden>● ● ●</span><span>tino. / {modoMei ? "meu negócio" : "meu dinheiro"}</span><span className={estilos.selo}>Demonstração</span></div>
        <div className={estilos.sistema}>
          <aside className={estilos.menu}><div className={estilos.marca}><Leao tamanho={26} /><b>tino{modoMei ? "+" : "."}</b></div><nav aria-label="Telas da demonstração">{telas.map((item, i) => { const Icone = ICONES_TELA[item.chave]; return <button type="button" key={item.chave} aria-pressed={ativa === i} onClick={() => escolher(i)}><Icone size={16} />{item.nome}</button> })}</nav><small>Dados fictícios.<br />Nenhuma conta conectada.</small></aside>
          <div className={estilos.previa}>
            <CabecalhoPrevia titulo={tela.nome} modoMei={modoMei} />
            <div className={estilos.visor} ref={visor} tabIndex={0} aria-label={`Prévia de ${tela.nome}; role para ver mais`}>
              <AnimatePresence mode="wait" initial={false}><motion.div ref={conteudo} key={tela.chave} className={estilos.conteudo} initial={reduzido ? false : { opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: reduzido ? 0 : -12 }} transition={{ duration: reduzido ? 0 : 0.28 }}><PreviaSistema tela={tela.chave} /></motion.div></AnimatePresence>
            </div>
          </div>
        </div>
      </div>
      <div className={estilos.controles}><div role="group" aria-label="Escolher etapa da visita">{telas.map((item, i) => <button type="button" key={item.chave} aria-pressed={i === ativa} onClick={() => escolher(i)}><span>{i + 1}</span>{item.nome}</button>)}</div><button type="button" onClick={() => definirPausada((valor) => !valor)} aria-label={pausada ? "Retomar visita pela rolagem" : "Pausar visita pela rolagem"} aria-pressed={pausada} disabled={Boolean(reduzido)}>{manual ? <Play size={16} /> : <Pause size={16} />}</button></div>
      <p className={estilos.legenda}>Prévia interativa com dados fictícios. Não registra compras nem vendas.</p>
    </div>
  </section>
}

/** Reutilizada nas seções da landing para não anunciar o visual antigo. */
export function PreviaAtual({ tela }: { tela: TelaDemonstracao }) {
  const mei = ["balcao", "estoque", "fiado", "caixa"].includes(tela)
  const nome = [...TELAS_PESSOAIS, ...TELAS_MEI].find((item) => item.chave === tela)?.nome ?? (tela === "extrato" ? "Extrato" : tela === "dividas" ? "Dívidas" : "Tino")
  return <div className={`${estilos.previa} ${estilos.previaEstatica}`}><CabecalhoPrevia titulo={nome} modoMei={mei} /><div className={estilos.conteudo}><PreviaSistema tela={tela} /></div><small className={estilos.legenda}>Dados fictícios de demonstração.</small></div>
}
