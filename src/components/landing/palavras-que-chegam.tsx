"use client"

import { useEffect, useRef, type ReactNode } from "react"
import { atrasoDaPalavra } from "@/lib/animacao-de-entrada"

/** O titulo chega desfocado, palavra por palavra, quando entra na tela.
 *
 * A quebra em palavras acontece no DOM depois da montagem, e nao no JSX, por
 * um motivo pratico: os titulos da vitrine tem `<br/>` e `<span>` no meio, e
 * exigir texto puro obrigaria a reescrever todos eles. Andando pelos nos de
 * texto, qualquer marcacao continua valendo — e sem JavaScript o titulo
 * permanece um titulo comum, inteiro e legivel.
 */
export function PalavrasQueChegam({children,className=""}:{children:ReactNode;className?:string}) {
  const ref=useRef<HTMLDivElement>(null)

  useEffect(()=>{
    const el=ref.current
    if(!el) return
    // Em desenvolvimento o React monta o efeito duas vezes; sem esta trava a
    // segunda passada quebraria em palavras o que a primeira ja quebrou,
    // aninhando caixa dentro de caixa.
    if(el.dataset.estado) return
    if(window.matchMedia("(prefers-reduced-motion: reduce)").matches){ el.dataset.estado="dentro"; return }

    const nos:Text[]=[]
    const andarilho=document.createTreeWalker(el,NodeFilter.SHOW_TEXT)
    for(let no=andarilho.nextNode();no;no=andarilho.nextNode()) nos.push(no as Text)

    let indice=0
    for(const no of nos){
      const texto=no.nodeValue ?? ""
      if(!texto.trim()) continue
      const pedaco=document.createDocumentFragment()
      // O separador entra no `split` para que os espacos sobrevivam: sem
      // eles as palavras colam umas nas outras quando viram caixas.
      for(const parte of texto.split(/(\s+)/)){
        if(!parte) continue
        if(!parte.trim()){ pedaco.appendChild(document.createTextNode(parte)); continue }
        const palavra=document.createElement("span")
        palavra.className="palavra"
        palavra.style.setProperty("--atraso",`${atrasoDaPalavra(indice++)}ms`)
        palavra.textContent=parte
        pedaco.appendChild(palavra)
      }
      no.parentNode?.replaceChild(pedaco,no)
    }

    el.dataset.estado="fora"
    if(!("IntersectionObserver" in window)){ el.dataset.estado="dentro"; return }
    const observador=new IntersectionObserver(entradas=>{
      if(entradas.some(entrada=>entrada.isIntersecting)){ el.dataset.estado="dentro"; observador.disconnect() }
    },{threshold:0.2})
    observador.observe(el)
    // Rede de seguranca so para o que ja esta na tela: se o observador nao
    // disparar por qualquer motivo, o titulo aparece assim mesmo. Titulo
    // invisivel e pior que titulo sem animacao. O que esta abaixo da dobra
    // fica com o observador, senao a pagina inteira se revelaria sozinha
    // depois de dois segundos e meio.
    const rede=window.setTimeout(()=>{
      if(el.getBoundingClientRect().top<window.innerHeight) el.dataset.estado="dentro"
    },2500)
    return ()=>{observador.disconnect();window.clearTimeout(rede)}
  },[])

  return <div ref={ref} className={`palavras ${className}`}>{children}</div>
}
