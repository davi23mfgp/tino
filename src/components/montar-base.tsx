"use client"

import { useState, type ReactNode } from "react"
import { Check } from "lucide-react"

import { paraCentavos } from "@/lib/dinheiro"
import estilos from "./montar-base.module.css"

/**
 * Base pronta (passo 55, Davi escolheu "A com B" em 19/10/2026): a pessoa marca
 * numa grade o que tem, e depois responde um item por vez, com o anel dizendo
 * quanto falta. Serve a Contas fixas e ao Orçamento, para as duas abas falarem
 * a mesma língua.
 *
 * O item chega só com o nome, nunca com valor: o valor é da pessoa (regra 3).
 * Quem deixa o valor em branco pula o item, e nada entra sem ela digitar.
 */

export interface ItemDaBase {
  id: string
  nome: string
  icone: ReactNode
  /** Frase curta embaixo da pergunta: o porquê ou como achar o valor. */
  dica?: string
  /** Começa marcado na grade: a pessoa só desmarca o que não tem. */
  marcado?: boolean
}

export interface RespostaDaBase {
  id: string
  valorCentavos: number
  dia?: number
}

interface Props {
  itens: ItemDaBase[]
  /** "Quais destas você paga todo mês?" */
  pergunta: string
  /** Pergunta de cada item; recebe o nome em minúsculas. */
  perguntaDoItem: (nome: string) => string
  rotuloValor: string
  comDia?: boolean
  rotuloPular: string
  /** "Adicionar 3 contas", recebe a quantidade já respondida. */
  rotuloConcluir: (quantidade: number) => string
  rodapeGrade?: ReactNode
  aoConcluir: (respostas: RespostaDaBase[]) => Promise<void>
}

export function MontarBase({ itens, pergunta, perguntaDoItem, rotuloValor, comDia, rotuloPular, rotuloConcluir, rodapeGrade, aoConcluir }: Props) {
  const [marcados, setMarcados] = useState<Set<string>>(() => new Set(itens.filter((item) => item.marcado).map((item) => item.id)))
  const [fila, setFila] = useState<ItemDaBase[] | null>(null)
  const [posicao, setPosicao] = useState(0)
  const [respostas, setRespostas] = useState<RespostaDaBase[]>([])
  const [valor, setValor] = useState("")
  const [dia, setDia] = useState("10")
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState("")

  function alternar(id: string) {
    setMarcados((atual) => {
      const novo = new Set(atual)
      if (novo.has(id)) novo.delete(id)
      else novo.add(id)
      return novo
    })
  }

  async function concluir(lista: RespostaDaBase[]) {
    if (lista.length === 0) {
      setFila(null)
      setRespostas([])
      return
    }
    setOcupado(true)
    setErro("")
    try {
      await aoConcluir(lista)
    } catch (excecao) {
      setErro(excecao instanceof Error ? excecao.message : "Não foi possível salvar. Tente de novo.")
    } finally {
      setOcupado(false)
    }
  }

  function avancar(resposta: RespostaDaBase | null) {
    const lista = resposta ? [...respostas, resposta] : respostas
    setRespostas(lista)
    setValor("")
    // O dia volta ao padrão: herdar o do item anterior fazia a Luz vencer no
    // mesmo dia do Aluguel sem a pessoa ter digitado (achado no teste de 19/10).
    setDia("10")
    setErro("")
    if (fila && posicao + 1 < fila.length) setPosicao(posicao + 1)
    else void concluir(lista)
  }

  if (!fila) {
    return (
      <section className={estilos.bloco} aria-label="Montar com a lista pronta">
        <p className={estilos.passo}>Passo 1 de 2</p>
        <h2 className={estilos.titulo}>{pergunta}</h2>
        <p className={estilos.apoio}>Toque para marcar. Depois você diz só o valor{comDia ? " e o dia" : ""}, um de cada vez.</p>
        <div className={estilos.grade}>
          {itens.map((item) => {
            const ligado = marcados.has(item.id)
            return (
              <button key={item.id} type="button" className={estilos.cartao} aria-pressed={ligado} onClick={() => alternar(item.id)}>
                {ligado && <span className={estilos.marca} aria-hidden><Check /></span>}
                <span className={estilos.icone} aria-hidden>{item.icone}</span>
                <b>{item.nome}</b>
              </button>
            )
          })}
        </div>
        {rodapeGrade}
        <button type="button" className={estilos.principal} disabled={marcados.size === 0}
          onClick={() => { setFila(itens.filter((item) => marcados.has(item.id))); setPosicao(0); setRespostas([]) }}>
          {marcados.size === 0 ? "Marque pelo menos um" : `Continuar com ${marcados.size}`}
        </button>
      </section>
    )
  }

  const atual = fila[posicao]
  const centavos = valor.trim() ? paraCentavos(valor) : 0
  const diaNumero = Math.min(31, Math.max(1, Number(dia) || 10))
  const raio = 33
  const volta = 2 * Math.PI * raio

  return (
    <section className={estilos.bloco} aria-label="Montar com a lista pronta">
      <div className={estilos.topo}>
        <span className={estilos.anel} role="img" aria-label={`${posicao} de ${fila.length} respondidos`}>
          <svg viewBox="0 0 78 78" aria-hidden>
            <circle cx="39" cy="39" r={raio} />
            <circle cx="39" cy="39" r={raio} data-feito strokeDasharray={`${(volta * posicao) / fila.length} ${volta}`} />
          </svg>
          <span><b>{posicao}</b><small>de {fila.length}</small></span>
        </span>
        <div>
          <p className={estilos.passo}>Passo 2 de 2</p>
          <p className={estilos.apoio}>{respostas.length === 0 ? "Nada salvo ainda." : `${respostas.length} pronto${respostas.length > 1 ? "s" : ""}: ${respostas.map((r) => fila.find((i) => i.id === r.id)?.nome).join(", ")}.`}</p>
        </div>
      </div>

      <form className={estilos.pergunta} onSubmit={(evento) => { evento.preventDefault(); if (centavos > 0) avancar({ id: atual.id, valorCentavos: centavos, dia: comDia ? diaNumero : undefined }) }}>
        <div className={estilos.cabeca}>
          <span className={estilos.iconeGrande} aria-hidden>{atual.icone}</span>
          <div><small>{posicao + 1} de {fila.length}</small><h2>{perguntaDoItem(atual.nome.toLowerCase())}</h2></div>
        </div>
        <div className={estilos.campos} data-com-dia={comDia || undefined}>
          <label>{rotuloValor}<input value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" placeholder="0,00" autoFocus aria-label={`${rotuloValor} de ${atual.nome}`} /></label>
          {comDia && <label>Vence dia<input value={dia} onChange={(e) => setDia(e.target.value.replace(/\D/g, "").slice(0, 2))} inputMode="numeric" aria-label={`Dia do vencimento de ${atual.nome}`} /></label>}
        </div>
        {atual.dica && <p className={estilos.apoio}>{atual.dica}</p>}
        {erro && <p role="alert" className={estilos.erro}>{erro}</p>}
        <button type="submit" className={estilos.principal} disabled={centavos <= 0 || ocupado}><Check aria-hidden />{posicao + 1 === fila.length ? rotuloConcluir(respostas.length + 1) : "Próximo"}</button>
        <button type="button" className={estilos.secundario} disabled={ocupado} onClick={() => avancar(null)}>{rotuloPular}</button>
      </form>
    </section>
  )
}
