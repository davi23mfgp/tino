"use client"

import { competenciaMaisMeses, rotuloCompetencia } from "@/lib/datas"
import { formatarMoeda } from "@/lib/dinheiro"
import { iconeDaCategoria } from "@/lib/icone-categoria"
import estilos from "./abas-cartao.module.css"

import type { CompraParcelada } from "@/lib/cartoes"

const semCentavosZerados = (centavos: number) => formatarMoeda(centavos).replace(/,00$/, "")
/// Acima disto os traços viram fiapos; a barra contínua diz o mesmo.
const MAX_TRACOS = 24

/**
 * Compras parceladas (Davi, 26/09: opção A do canvas).
 *
 * No topo, quanto falta pagar e as barras dos próximos meses: é a pergunta
 * "quanto do mês que vem já está gasto", que nenhuma linha sozinha responde.
 * Cada compra mostra as parcelas em traços — um por parcela, cheios os pagos —
 * porque "3 de 10" lido num traço é mais rápido que numa conta. O seletor de
 * mês que ficava em cada compra saiu: as barras do topo já dão o mês a mês.
 */
export function ParcelamentosDoCartao({ parcelamentos, categorias, mes, aoAbrir }: {
  parcelamentos: CompraParcelada[]
  categorias: { id: string; nome: string }[]
  mes: string
  aoAbrir: (parcelamento: CompraParcelada) => void
}) {
  const abertas = parcelamentos.flatMap((linha) => linha.parcelas.filter((parcela) => !parcela.paga))
  const faltaCentavos = abertas.reduce((soma, parcela) => soma + parcela.valorCentavos, 0)
  const ultima = [...abertas].sort((a, b) => a.competencia.localeCompare(b.competencia)).at(-1)
  const meses = Array.from({ length: 6 }, (_, indice) => {
    const competencia = competenciaMaisMeses(mes, indice)
    return { competencia, centavos: abertas.filter((parcela) => parcela.competencia === competencia).reduce((soma, parcela) => soma + parcela.valorCentavos, 0) }
  })
  const maior = Math.max(1, ...meses.map((linha) => linha.centavos))

  return <div className={estilos.aba}>
    <section className={estilos.bloco} data-respiro>
      <div className={estilos.topoNumero}>
        <div><small>Falta pagar</small><b className="valor-sensivel">{semCentavosZerados(faltaCentavos)}</b></div>
        <p>{parcelamentos.length} {parcelamentos.length === 1 ? "compra" : "compras"}{ultima ? <><br />última em {rotuloCompetencia(ultima.competencia, true)}</> : null}</p>
      </div>
      <div className={estilos.meses} role="img" aria-label={meses.map((linha) => `${rotuloCompetencia(linha.competencia, true)}: ${formatarMoeda(linha.centavos)}`).join("; ")}>
        {meses.map((linha, indice) => (
          <div key={linha.competencia} data-atual={indice === 0 || undefined} title={formatarMoeda(linha.centavos)}>
            <span><i style={{ height: `${linha.centavos ? Math.max(6, (linha.centavos / maior) * 100) : 0}%` }} /></span>
            <small>{rotuloCompetencia(linha.competencia, true).split("/")[0]}</small>
          </div>
        ))}
      </div>
      <p className={estilos.legendaMeses}>{formatarMoeda(meses[0].centavos)} em {rotuloCompetencia(meses[0].competencia, true)}</p>
    </section>

    <section className={estilos.bloco}>
      <ul>
        {parcelamentos.map((parcelamento) => {
          const restantes = parcelamento.parcelasTotal - parcelamento.parcelasPagas
          const fim = parcelamento.parcelas.at(-1)?.competencia
          const Icone = iconeDaCategoria(categorias.find((linha) => linha.id === parcelamento.categoriaId) ?? null, "DESPESA")
          return <li key={parcelamento.id}>
            <button type="button" className={estilos.parcela} onClick={() => aoAbrir(parcelamento)} aria-label={`Abrir ${parcelamento.descricao}`}>
              <span className={estilos.linhaParcela}>
                <span className={estilos.icone}><Icone aria-hidden /></span>
                <span className={estilos.texto}><strong>{parcelamento.descricao}</strong><small>{semCentavosZerados(parcelamento.parcelaCentavos)}/mês{fim ? ` · até ${rotuloCompetencia(fim, true)}` : ""}</small></span>
                <span className={estilos.contagem}><b>{parcelamento.parcelasPagas}<span>/{parcelamento.parcelasTotal}</span></b><small className="valor-sensivel">{restantes ? `faltam ${semCentavosZerados(restantes * parcelamento.parcelaCentavos)}` : "quitada"}</small></span>
              </span>
              {parcelamento.parcelasTotal <= MAX_TRACOS ? (
                <span className={estilos.tracos} aria-hidden>{Array.from({ length: parcelamento.parcelasTotal }, (_, indice) => <i key={indice} data-paga={indice < parcelamento.parcelasPagas || undefined} />)}</span>
              ) : (
                <span className={estilos.trilho} aria-hidden><i style={{ width: `${(parcelamento.parcelasPagas / parcelamento.parcelasTotal) * 100}%` }} /></span>
              )}
            </button>
          </li>
        })}
      </ul>
    </section>
  </div>
}
