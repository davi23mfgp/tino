"use client"

import { useEffect, useRef, useState } from "react"
import { valorDaContagem, duracaoDaContagem } from "@/lib/animacao-de-entrada"
import { formatarMoeda } from "@/lib/dinheiro"

/** O numero sobe de zero ate o valor quando entra na tela.
 *
 * Comeca renderizado com o valor final, e nao com zero: se o JavaScript nao
 * rodar, ou a pessoa passar rapido, o que fica na tela e o preco certo. A
 * contagem so substitui isso depois que o observador dispara.
 */
export function NumeroQueSobe({centavos,className=""}:{centavos:number;className?:string}) {
  const ref=useRef<HTMLSpanElement>(null)
  const [valor,setValor]=useState(centavos)

  useEffect(()=>{
    const el=ref.current
    if(!el) return
    if(window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return

    let quadro=0
    const correr=()=>{
      const duracao=duracaoDaContagem(centavos)
      const comeco=performance.now()
      const passo=(agora:number)=>{
        const t=(agora-comeco)/duracao
        setValor(valorDaContagem(centavos,t))
        if(t<1) quadro=requestAnimationFrame(passo)
      }
      quadro=requestAnimationFrame(passo)
    }
    const observador=new IntersectionObserver(entradas=>{
      if(entradas.some(entrada=>entrada.isIntersecting)){ observador.disconnect(); correr() }
    },{threshold:0.4})
    observador.observe(el)
    return ()=>{cancelAnimationFrame(quadro);observador.disconnect()}
  },[centavos])

  return <span ref={ref} className={className}>{formatarMoeda(valor)}</span>
}
