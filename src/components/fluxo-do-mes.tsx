"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"

import { enviar } from "@/lib/cliente"
import { formatarMoeda } from "@/lib/dinheiro"
import { rotuloCompetencia } from "@/lib/datas"
import { montarFluxoMensal, type DadosDoFluxo, type ItemDoFluxo } from "@/lib/fluxo-mensal"
import { showToast } from "@/components/ui/toast"
import estilos from "./fluxo-do-mes.module.css"

const semCentavosZerados = (centavos: number) => formatarMoeda(centavos).replace(/,00$/, "")
const nomeDoMes = (competencia: string) => rotuloCompetencia(competencia).split(" ")[0]
/// "R$ 6.982" / "−R$ 1.602": o valor do mês em reais inteiros, sem centavos.
const emReais = (centavos: number) => `${centavos < 0 ? "−" : ""}${semCentavosZerados(Math.round(Math.abs(centavos) / 100) * 100)}`
type Grupo = "todas" | "cartao" | "fixas" | "outras"
const GRUPOS: [Grupo, string][] = [["todas", "Todas"], ["cartao", "Cartões"], ["fixas", "Contas fixas"], ["outras", "Outras"]]
/// Pela chave da linha: a fatura, a conta fixa, e o resto (dívidas e gasto do dia a dia).
const grupoDaSaida = (item: ItemDoFluxo): Grupo => item.chave.startsWith("cartao:") ? "cartao" : item.chave.startsWith("recorrencia:") ? "fixas" : "outras"

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
  const [lado, setLado] = useState<"ENTRADA" | "SAIDA">("SAIDA")
  const [grupo, setGrupo] = useState<Grupo>("todas")
  const rolagem = useRef<HTMLDivElement>(null)
  // A barra escolhida fica à vista quando o gráfico desliza (celular).
  useEffect(() => {
    const trilho = rolagem.current
    const barra = trilho?.querySelector<HTMLElement>(`[data-mes="${escolhido}"]`)
    if (trilho && barra && trilho.scrollWidth > trilho.clientWidth) trilho.scrollTo({ left: barra.offsetLeft - trilho.clientWidth / 2 + barra.offsetWidth / 2, behavior: "smooth" })
  }, [escolhido])

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
  const saidasDoGrupo = saidas.filter((item) => grupo === "todas" || grupoDaSaida(item) === grupo)

  return <div className={estilos.pagina}>
    <section className={estilos.frase} aria-live="polite">
      <small>{escolhido === 0 ? `Até o fim de ${nomeDoMes(mes.competencia)}` : `Em ${nomeDoMes(mes.competencia)}`}</small>
      <p><b>Tem <span className="valor-sensivel">{semCentavosZerados(mes.comecaCentavos)}</span>, entra <span className="valor-sensivel">{semCentavosZerados(mes.entraCentavos)}</span>, sai <span className="valor-sensivel">{semCentavosZerados(mes.saiCentavos)}</span>.</b></p>
      <p data-tom={sobra < 0 ? "falta" : "sobra"}>{sobra < 0 ? "Falta" : "Sobra"} <b className="valor-sensivel">{semCentavosZerados(Math.abs(sobra))}</b> no fim do mês.</p>
    </section>

    <section className={estilos.bloco}>
      <header className={estilos.cabecalho}><h2>Caixa no fim de cada mês</h2><small>toque num mês</small></header>
      <div className={estilos.contas} role="group" aria-label="Contas no fluxo">
        <span>No fluxo:</span>
        {contas.map((conta) => {
          const dentro = !fora.has(`conta:${conta.id}`)
          return <button key={conta.id} type="button" aria-pressed={dentro} onClick={() => void alternar(`conta:${conta.id}`, dentro)}><i aria-hidden />{conta.nome} · <span className="valor-sensivel">{semCentavosZerados(conta.saldoCentavos)}</span></button>
        })}
      </div>
      {/* No celular o gráfico desliza de lado: com o valor inteiro em reais
          (Davi, 27/09: "7,0" não dizia que era R$ 7 mil), doze colunas não
          cabem em 390px. No computador, cabem todas. */}
      <div className={estilos.rolagem} ref={rolagem}>
        <div className={estilos.grafico} style={{ "--zero": `${zero}%` } as React.CSSProperties}>
          {meses.map((linha, indice) => {
            const valor = linha.terminaCentavos
            const altura = (Math.abs(valor) / faixa) * 100
            return <button key={linha.competencia} type="button" data-mes={indice} aria-pressed={indice === escolhido} onClick={() => setEscolhido(indice)} aria-label={`${rotuloCompetencia(linha.competencia)}: ${valor < 0 ? "falta" : "sobra"} ${formatarMoeda(Math.abs(valor))} no fim do mês`} data-negativo={valor < 0 || undefined}>
              <span className={estilos.coluna}>
                <i style={valor >= 0 ? { bottom: `${100 - zero}%`, height: `${altura}%` } : { top: `${zero}%`, height: `${altura}%` }} />
                <b className="valor-sensivel" style={valor >= 0 ? { bottom: `calc(${100 - zero + altura}% + 3px)` } : { top: `calc(${zero + altura}% + 3px)` }}>{emReais(valor)}</b>
              </span>
              <small>{rotuloCompetencia(linha.competencia, true).split("/")[0]}</small>
            </button>
          })}
        </div>
      </div>
    </section>

    {/* Entradas e saídas separadas (Davi, 27/09: "com filtros, pra não ter
        que procurar numa lista imensa"). No celular, uma de cada vez pelo
        seletor; no computador, lado a lado, ocupando o espaço embaixo do
        gráfico que antes ficava vazio. */}
    <div className={estilos.seletor} role="tablist" aria-label="Entradas ou saídas">
      <button type="button" role="tab" aria-selected={lado === "ENTRADA"} onClick={() => setLado("ENTRADA")}>Entradas <b className="valor-sensivel">{semCentavosZerados(mes.entraCentavos)}</b></button>
      <button type="button" role="tab" aria-selected={lado === "SAIDA"} onClick={() => setLado("SAIDA")}>Saídas <b className="valor-sensivel">{semCentavosZerados(mes.saiCentavos)}</b></button>
    </div>
    <div className={estilos.lados}>
      <section className={estilos.bloco} data-lista data-lado-ativo={lado === "ENTRADA" || undefined}>
        <header className={estilos.cabecalho}><h2>Entradas de {nomeDoMes(mes.competencia)}</h2><b className="valor-sensivel" data-tipo="ENTRADA">+ {semCentavosZerados(mes.entraCentavos)}</b></header>
        {entradas.length === 0 ? <p className={estilos.vazio}>Nada previsto para entrar.</p> : (
          <ul className={estilos.itens}>{entradas.map((item, indice) => <Linha key={`${item.chave}-${indice}`} item={item} aoAlternar={() => void alternar(item.chave, !item.fora)} />)}</ul>
        )}
      </section>
      <section className={estilos.bloco} data-lista data-lado-ativo={lado === "SAIDA" || undefined}>
        <header className={estilos.cabecalho}><h2>Saídas de {nomeDoMes(mes.competencia)}</h2><b className="valor-sensivel" data-tipo="SAIDA">− {semCentavosZerados(mes.saiCentavos)}</b></header>
        <div className={estilos.filtros} role="group" aria-label="Filtrar saídas">
          {GRUPOS.map(([valor, rotulo]) => {
            const doGrupo = saidas.filter((item) => valor === "todas" || grupoDaSaida(item) === valor)
            if (valor !== "todas" && doGrupo.length === 0) return null
            return <button key={valor} type="button" aria-pressed={grupo === valor} onClick={() => setGrupo(valor)}>{rotulo}{valor !== "todas" ? ` · ${doGrupo.length}` : ""}</button>
          })}
        </div>
        {saidasDoGrupo.length === 0 ? <p className={estilos.vazio}>Nada previsto para sair.</p> : (
          <ul className={estilos.itens}>{saidasDoGrupo.map((item, indice) => <Linha key={`${item.chave}-${indice}`} item={item} aoAlternar={() => void alternar(item.chave, !item.fora)} />)}</ul>
        )}
      </section>
    </div>
    <p className={estilos.nota}>≈ vem da média dos últimos meses. Desligue o que não quer contar. <Link href="/simulador">Simular uma mudança</Link></p>
  </div>
}

function Linha({ item, aoAlternar }: { item: ItemDoFluxo; aoAlternar: () => void }) {
  return <li data-fora={item.fora || undefined}>
    <span className={estilos.texto}><strong>{item.rotulo}</strong><small>{item.estimado ? "≈ " : ""}{item.detalhe}</small></span>
    <b data-tipo={item.tipo} className="valor-sensivel">{item.tipo === "ENTRADA" ? "+ " : "− "}{semCentavosZerados(item.centavos)}</b>
    <button type="button" role="switch" aria-checked={!item.fora} aria-label={`${item.fora ? "Voltar" : "Tirar"} ${item.rotulo} ${item.fora ? "para o" : "do"} fluxo`} onClick={aoAlternar} className={estilos.interruptor}><i /></button>
  </li>
}
