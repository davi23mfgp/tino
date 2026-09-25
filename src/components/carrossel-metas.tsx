"use client"

import { useRef, useState } from "react"

import estilos from "./carrossel-metas.module.css"

export type AvisoDeMeta = { id: string; titulo: string; apoio: string; percentual: number }

/**
 * O bloco claro de /metas (Davi, 25/09): um aviso por meta ativa, deslizando
 * de lado, com o botão de nova meta dentro dele.
 *
 * Antes o bloco falava só da meta mais perto de fechar, e quem tem três metas
 * precisava descer a tela para saber das outras duas. A ordem continua a
 * mesma — a mais perto primeiro —, então o aviso de abertura não mudou.
 */
export function CarrosselDeMetas({ avisos, vazio, acao }: { avisos: AvisoDeMeta[]; vazio: { titulo: string; apoio: string }; acao: React.ReactNode }) {
  const trilho = useRef<HTMLDivElement>(null)
  const [atual, setAtual] = useState(0)

  // Os pontos são botões: no computador não há dedo para deslizar, e a
  // rolagem de lado com o mouse é coisa que pouca gente sabe fazer.
  function ir(indice: number) {
    const alvo = trilho.current?.children[indice] as HTMLElement | undefined
    trilho.current?.scrollTo({ left: alvo?.offsetLeft ?? 0, behavior: "smooth" })
  }

  return (
    <section className={`superficie-clara ${estilos.bloco}`} aria-roledescription="carrossel" aria-label="Suas metas">
      <header className={estilos.topo}>
        <p className={estilos.rotulo}>Metas</p>
        {acao}
      </header>

      {avisos.length === 0 ? (
        <div className={estilos.aviso}><h2>{vazio.titulo}</h2><p className="apoio-claro">{vazio.apoio}</p></div>
      ) : (
        <div
          ref={trilho}
          className={estilos.trilho}
          onScroll={(evento) => {
            const largura = evento.currentTarget.clientWidth
            if (largura) setAtual(Math.round(evento.currentTarget.scrollLeft / largura))
          }}
        >
          {avisos.map((aviso, indice) => (
            <div key={aviso.id} className={estilos.aviso} aria-roledescription="slide" aria-label={`${indice + 1} de ${avisos.length}`}>
              <h2>{aviso.titulo}</h2>
              <p className="apoio-claro">{aviso.apoio}</p>
              <span className={estilos.barra} aria-hidden><i style={{ width: `${Math.max(2, aviso.percentual)}%` }} /></span>
            </div>
          ))}
        </div>
      )}

      {avisos.length > 1 && (
        <div className={estilos.pontos}>
          {avisos.map((aviso, indice) => (
            <button key={aviso.id} type="button" aria-label={`Ver aviso ${indice + 1}`} data-ligado={indice === atual || undefined} onClick={() => ir(indice)}><i /></button>
          ))}
        </div>
      )}
    </section>
  )
}
