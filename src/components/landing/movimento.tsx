"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { ArrowDownLeft, CreditCard, Wallet } from "lucide-react"
import { TelaNoCelular, type QualTela } from "@/app/(site)/tela-no-celular"
import { Porquinho } from "@/app/(site)/porquinho"

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
const TELAS: {tela:QualTela;rotulo:string}[]=[{tela:"inicio",rotulo:"Seu mês"},{tela:"movimento",rotulo:"Movimentos"},{tela:"cartoes",rotulo:"Cartões"}]
export function PalcoDoProduto() {
  const ref=useRef<HTMLDivElement>(null)
  const [tela,setTela]=useState<QualTela>("inicio")
  useEffect(()=>{
    const el=ref.current
    if(!el) return
    const preferencia=window.matchMedia("(prefers-reduced-motion: reduce)")
    let quadro=0
    const atualizar=()=>{
      quadro=0
      const rect=el.getBoundingClientRect()
      const progresso=Math.max(-1,Math.min(1,(window.innerHeight*.5-rect.top)/window.innerHeight))
      el.style.setProperty("--product-travel",preferencia.matches?"0":String(progresso))
    }
    const agendar=()=>{if(!quadro)quadro=requestAnimationFrame(atualizar)}
    atualizar(); window.addEventListener("scroll",agendar,{passive:true}); window.addEventListener("resize",agendar); preferencia.addEventListener("change",agendar)
    return ()=>{cancelAnimationFrame(quadro);window.removeEventListener("scroll",agendar);window.removeEventListener("resize",agendar);preferencia.removeEventListener("change",agendar)}
  },[])
  return <div className="product-showcase" ref={ref}>
    <div className="product-orbit" aria-hidden />
    <div className="product-float product-float-left" aria-hidden><span className="product-float-icon"><ArrowDownLeft size={20}/></span><div><small>Entradas do mês</small><strong>R$ 8.600,00</strong></div><span className="product-mini-bars">{[25,40,31,52,42,60].map((h,i)=><i key={i} style={{height:h}}/>)}</span></div>
    <div className="product-float product-float-right" aria-hidden><CreditCard size={22}/><small>Cartão em dia</small><strong>Mais controle.<br/>Menos surpresa.</strong><span className="product-float-check">✓</span></div>
    <div className="product-mascot"><Porquinho tamanho={140} flutua prioritario/></div>
    <div className="product-phone" id="produto-tela" aria-live="polite"><TelaNoCelular tela={tela}/></div>
    <div className="product-controls" role="group" aria-label="Explorar telas de demonstração">{TELAS.map(item=><button key={item.tela} type="button" aria-pressed={tela===item.tela} aria-controls="produto-tela" onClick={()=>setTela(item.tela)}>{item.rotulo}</button>)}</div>
    <p className="landing-note product-caption"><Wallet size={14} aria-hidden/> Seu Tino, no seu bolso. Dados de demonstração.</p>
  </div>
}