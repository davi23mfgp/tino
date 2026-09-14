"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { Wallet } from "lucide-react"
import { TelasEmpilhadas, ORDEM_DAS_TELAS, type QualTela } from "@/app/(site)/tela-no-celular"
import { progressoDoPalco, entradaDoPalco, telaDoProgresso, centroDaTela, ajusteDoPalco } from "@/lib/palco-do-produto"

export function Revelar({children,className=""}:{children:ReactNode;className?:string}) {
  const ref=useRef<HTMLDivElement>(null)
  useEffect(()=>{
    const el=ref.current
    if(!el || !("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const observador=new IntersectionObserver(entradas=>{
      if(entradas.some(entrada=>entrada.isIntersecting)) { el.dataset.reveal="visible"; observador.disconnect() }
    },{threshold:0.08})
    // Sem JavaScript, o HTML continua legivel; a animacao e apenas uma melhoria.
    el.dataset.reveal="pending"; observador.observe(el)
    return ()=>observador.disconnect()
  },[])
  return <div ref={ref} className={className}>{children}</div>
}
const TELAS: {tela:QualTela;rotulo:string;titulo:string;apoio:string}[] = [
  {tela:"inicio",rotulo:"Seu mês",titulo:"Abre e já sabe.",apoio:"O resultado do mês, o que entrou, o que saiu e o que ainda vence."},
  {tela:"movimento",rotulo:"Movimentos",titulo:"Cada gasto no lugar.",apoio:"Anotou ou importou, o lançamento já aparece com categoria e data."},
  {tela:"cartoes",rotulo:"Cartões",titulo:"A fatura sem susto.",apoio:"Duas faturas, o limite livre e as parcelas que ainda vêm."},
]

/** O palco do produto: o celular fica preso na tela enquanto a pessoa rola,
 * e a rolagem é que troca a tela do app.
 *
 * A conta é uma só — o quanto o trilho (`.product-scroller`) já passou pela
 * janela, de 0 a 1. Desse número saem três coisas: a entrada do aparelho
 * (`--entrada`), o deslocamento dos cartões flutuantes (`--product-travel`)
 * e qual das três telas está visível. Sem biblioteca de animação: é uma
 * variável de CSS atualizada dentro de `requestAnimationFrame`.
 *
 * Quem pediu menos movimento (`prefers-reduced-motion`) não ganha trilho
 * nenhum: o CSS desfaz a altura e o `sticky`, e a troca de tela fica só nos
 * botões, que continuam funcionando do mesmo jeito.
 */
export function PalcoDoProduto() {
  const trilho=useRef<HTMLDivElement>(null)
  const [tela,setTela]=useState<QualTela>("inicio")
  const [manual,setManual]=useState(false)

  useEffect(()=>{
    const el=trilho.current
    if(!el) return
    const preferencia=window.matchMedia("(prefers-reduced-motion: reduce)")
    let quadro=0
    const atualizar=()=>{
      quadro=0
      if(preferencia.matches) { el.style.setProperty("--entrada","1"); el.style.setProperty("--product-travel","0"); el.style.setProperty("--ajuste",ajusteDoPalco(window.innerHeight,window.innerWidth<820?240:170).toFixed(3)); return }
      const rect=el.getBoundingClientRect()
      const progresso=progressoDoPalco(rect.top,rect.height,window.innerHeight)
      el.style.setProperty("--ajuste",ajusteDoPalco(window.innerHeight,window.innerWidth<820?240:170).toFixed(3))
      el.style.setProperty("--entrada",entradaDoPalco(progresso).toFixed(3))
      el.style.setProperty("--product-travel",(progresso*2-1).toFixed(3))
      setManual(false)
      setTela(ORDEM_DAS_TELAS[telaDoProgresso(progresso,ORDEM_DAS_TELAS.length)])
    }
    const agendar=()=>{if(!quadro)quadro=requestAnimationFrame(atualizar)}
    atualizar()
    window.addEventListener("scroll",agendar,{passive:true})
    window.addEventListener("resize",agendar)
    preferencia.addEventListener("change",agendar)
    return ()=>{cancelAnimationFrame(quadro);window.removeEventListener("scroll",agendar);window.removeEventListener("resize",agendar);preferencia.removeEventListener("change",agendar)}
  },[])

  // O botao leva a rolagem ate o trecho daquela tela: quem clica continua
  // dentro da mesma historia, em vez de brigar com o scroll um passo depois.
  function irPara(destino:QualTela) {
    const el=trilho.current
    const indice=ORDEM_DAS_TELAS.indexOf(destino)
    setTela(destino); setManual(true)
    if(!el) return
    const curso=el.offsetHeight-window.innerHeight
    if(curso<=0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    window.scrollTo({top:el.offsetTop+curso*centroDaTela(indice,ORDEM_DAS_TELAS.length),behavior:"smooth"})
  }

  const atual=TELAS.find(item=>item.tela===tela) ?? TELAS[0]
  return <div className="product-scroller" ref={trilho}>
    <div className="product-sticky">
      <div className="product-showcase">
        <div className="product-orbit" aria-hidden />
        <div className="product-phone" id="produto-tela"><TelasEmpilhadas ativa={tela}/></div>
        <div className="product-legenda" aria-live="polite">
          <p className="eyebrow">{atual.rotulo}</p>
          <p className="product-legenda-titulo">{atual.titulo}</p>
          <p className="landing-note">{atual.apoio}</p>
        </div>
        <div className="product-controls" role="group" aria-label="Explorar telas de demonstração" data-manual={manual}>{TELAS.map(item=><button key={item.tela} type="button" aria-pressed={tela===item.tela} aria-controls="produto-tela" onClick={()=>irPara(item.tela)}>{item.rotulo}</button>)}</div>
        <p className="landing-note product-caption"><Wallet size={14} aria-hidden/> Seu Tino, no seu bolso. Dados de demonstração.</p>
      </div>
    </div>
  </div>
}
