"use client"

import { useState } from "react"

import { IconeFerramenta } from "@/lib/icone-ferramenta"

/**
 * Submenu de uma tela: uma área por vez, no lugar de tudo empilhado.
 *
 * A análise era uma página de rolagem infinita com três blocos que, fechados,
 * viravam três barras cinzas e, abertos, viravam três telas de conteúdo. As
 * duas saídas eram ruins. Aqui as áreas viram um segundo nível de abas, no
 * mesmo desenho do primeiro: quem entra vê uma área inteira, e troca de área
 * no toque.
 *
 * O conteúdo de todas continua montado — são seções de servidor já renderizadas
 * —, então trocar de aba não refaz nenhuma conta nem pisca a tela. O que muda é
 * qual delas está visível.
 */
export function AbasInternas({ abas }: { abas: { chave: string; titulo: string; conteudo: React.ReactNode }[] }) {
  const [ativa, setAtiva] = useState(abas[0]?.chave ?? "")

  return (
    <>
      <nav aria-label="Áreas desta tela" className="app-subabas app-subabas--interna">
        {abas.map((aba) => (
          <button
            key={aba.chave}
            type="button"
            onClick={() => setAtiva(aba.chave)}
            data-ativo={aba.chave === ativa}
            aria-current={aba.chave === ativa ? "true" : undefined}
          >
            <IconeFerramenta rotulo={aba.titulo} />
            <span className="truncate">{aba.titulo}</span>
          </button>
        ))}
      </nav>

      {abas.map((aba) => (
        <div key={aba.chave} hidden={aba.chave !== ativa} className="space-y-4">
          {aba.conteudo}
        </div>
      ))}
    </>
  )
}
