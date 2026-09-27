"use client"

import { useMemo, useState } from "react"
import Link from "next/link"

import { enviar } from "@/lib/cliente"
import { formatarMoeda } from "@/lib/dinheiro"
import { rotuloCompetencia } from "@/lib/datas"
import { montarFluxoMensal, type DadosDoFluxo, type ItemDoFluxo } from "@/lib/fluxo-mensal"
import { showToast } from "@/components/ui/toast"
import estilos from "./fluxo-do-mes.module.css"

const semCentavosZerados = (centavos: number) => formatarMoeda(centavos).replace(/,00$/, "")
/// "11,5" para R$ 11.467: doze colunas no celular não cabem "R$ 11.467".
function emMil(centavos: number) {
  if (Math.abs(centavos) < 5_000) return "0"
  return `${centavos < 0 ? "−" : ""}${(Math.abs(centavos) / 100_000).toFixed(1).replace(".", ",")}`
}
const nomeDoMes = (competencia: string) => rotuloCompetencia(competencia).split(" ")[0]

/**
 * Fluxo de caixa (Davi, 27/09: opção B do canvas com a frase da C).
 *
 * Em cima, a conta do mês numa frase — tem, entra, sai, sobra —, que é como a
 * pessoa faz de cabeça. No meio, o caixa no fim de cada mês: verde acima da
 * linha do zero, vermelho abaixo. Embaixo, o que compõe o mês escolhido, cada
 * linha com o interruptor que a tira do fluxo. Tirar recalcula na hora, aqui
 * mesmo, e grava em segundo plano.
 */
export function FluxoDoMes({ dados, contas }: { dados: DadosDoFluxo; contas: { id: string; nome: string; saldoCentavos: number }[] }) {
  const [fora, setFora] = useState(() => new Set(dados.fora))
  const meses = useMemo(() => montarFluxoMensal({ ...dados, fora: [...fora] }), [dados, fora])
  // Na última semana do mês, o que falta dele é pouco: abre no mês seguinte,
  // que é o que a pessoa está planejando. A barra do mês corrente continua lá.
  const diasQueFaltam = new Date(Date.UTC(Number(dados.hoje.slice(0, 4)), Number(dados.hoje.slice(5, 7)), 0)).getUTCDate() - Number(dados.hoje.slice(8, 10))
  const [escolhido, setEscolhido] = useState(diasQueFaltam < 7 && meses.length > 1 ? 1 : 0)
  const mes = meses[escolhido]

  async function alternar(chave: string, tirar: boolean) {
    setFora((atual) => { const novo = new Set(atual); if (tirar) novo.add(chave); else novo.delete(chave); return novo })
    try { await enviar("/api/fluxo", { chave, fora: tirar }, "PUT") }
    catch (erro) {
      setFora((atual) => { const novo = new Set(atual); if (tirar) novo.delete(chave); else novo.add(chave); return novo })
      showToast("Não consegui guardar", { description: erro instanceof Error ? erro.message : "Tente de novo.", variant: "error" })
    }
  }

  const maior = Math.max(1, ...meses.map((linha) => Math.max(0, linha.terminaCentavos)))
  const menor = Math.min(0, ...meses.map((linha) => linha.terminaCentavos))
  const faixa = maior - menor || 1
  const zero = (maior / faixa) * 100

  if (!mes) return null
  const sobra = mes.terminaCentavos
  const entradas = mes.itens.filter((item) => item.tipo === "ENTRADA")
  const saidas = mes.itens.filter((item) => item.tipo === "SAIDA")

  return <div className={estilos.pagina}>
    <section className={estilos.frase} aria-live="polite">
      <small>{escolhido === 0 ? `Até o fim de ${nomeDoMes(mes.competencia)}` : `Em ${nomeDoMes(mes.competencia)}`}</small>
      <p><b>Tem <span className="valor-sensivel">{semCentavosZerados(mes.comecaCentavos)}</span>, entra <span className="valor-sensivel">{semCentavosZerados(mes.entraCentavos)}</span>, sai <span className="valor-sensivel">{semCentavosZerados(mes.saiCentavos)}</span>.</b></p>
      <p data-tom={sobra < 0 ? "falta" : "sobra"}>{sobra < 0 ? "Falta" : "Sobra"} <b className="valor-sensivel">{semCentavosZerados(Math.abs(sobra))}</b> no fim do mês.</p>
    </section>

    <div className={estilos.corpo}>
      <section className={estilos.bloco}>
        <header className={estilos.cabecalho}><h2>Caixa no fim de cada mês</h2><small>em mil reais</small></header>
        <div className={estilos.contas} role="group" aria-label="Contas no fluxo">
          <span>No fluxo:</span>
          {contas.map((conta) => {
            const dentro = !fora.has(`conta:${conta.id}`)
            return <button key={conta.id} type="button" aria-pressed={dentro} onClick={() => void alternar(`conta:${conta.id}`, dentro)}><i aria-hidden />{conta.nome} · <span className="valor-sensivel">{semCentavosZerados(conta.saldoCentavos)}</span></button>
          })}
        </div>
        <div className={estilos.grafico} style={{ "--zero": `${zero}%` } as React.CSSProperties}>
          {meses.map((linha, indice) => {
            const valor = linha.terminaCentavos
            const altura = (Math.abs(valor) / faixa) * 100
            return <button key={linha.competencia} type="button" aria-pressed={indice === escolhido} onClick={() => setEscolhido(indice)} aria-label={`${rotuloCompetencia(linha.competencia)}: ${valor < 0 ? "falta" : "sobra"} ${formatarMoeda(Math.abs(valor))} no fim do mês`} data-negativo={valor < 0 || undefined}>
              <span className={estilos.coluna}>
                <i style={valor >= 0 ? { bottom: `${100 - zero}%`, height: `${altura}%` } : { top: `${zero}%`, height: `${altura}%` }} />
                <b style={valor >= 0 ? { bottom: `calc(${100 - zero + altura}% + 3px)` } : { top: `calc(${zero + altura}% + 3px)` }}>{emMil(valor)}</b>
              </span>
              <small>{rotuloCompetencia(linha.competencia, true).split("/")[0]}</small>
            </button>
          })}
        </div>
      </section>

      <section className={estilos.bloco} data-lista>
        <header className={estilos.cabecalho}><h2>{nomeDoMes(mes.competencia)[0].toUpperCase() + nomeDoMes(mes.competencia).slice(1)} · o que entra na conta</h2><small>toque para tirar</small></header>
        {mes.itens.length === 0 ? <p className={estilos.vazio}>Nada previsto para o resto do mês.</p> : (
          <ul className={estilos.itens}>
            {[...entradas, ...saidas].map((item, indice) => <Linha key={`${item.chave}-${indice}`} item={item} aoAlternar={() => void alternar(item.chave, !item.fora)} />)}
          </ul>
        )}
        <p className={estilos.nota}>≈ vem da média dos últimos meses. <Link href="/simulador">Simular uma mudança</Link></p>
      </section>
    </div>
  </div>
}

function Linha({ item, aoAlternar }: { item: ItemDoFluxo; aoAlternar: () => void }) {
  return <li data-fora={item.fora || undefined}>
    <span className={estilos.texto}><strong>{item.rotulo}</strong><small>{item.estimado ? "≈ " : ""}{item.detalhe}</small></span>
    <b data-tipo={item.tipo} className="valor-sensivel">{item.tipo === "ENTRADA" ? "+ " : "− "}{semCentavosZerados(item.centavos)}</b>
    <button type="button" role="switch" aria-checked={!item.fora} aria-label={`${item.fora ? "Voltar" : "Tirar"} ${item.rotulo} ${item.fora ? "para o" : "do"} fluxo`} onClick={aoAlternar} className={estilos.interruptor}><i /></button>
  </li>
}
