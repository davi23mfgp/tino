import Link from "next/link"
import { ChevronRight } from "lucide-react"

import { formatarMoeda } from "@/lib/dinheiro"
import type { Diagnostico, Indicador } from "@/lib/tino/diagnostico"
import { ONDE_RESOLVER, ONDE_RESOLVER_INDICADOR } from "@/lib/tino/onde-resolver"
import estilos from "./analise.module.css"

const SELO = { ATENCAO: "atenção", CRITICO: "no vermelho" } as const
const SITUACAO = { SAUDAVEL: "saudável", ATENCAO: "atenção", APERTADO: "apertado", CRITICO: "crítico" } as const
const foraDaFaixa = (indicador: Indicador) => indicador.faixa === "ATENCAO" || indicador.faixa === "CRITICO"

/**
 * O topo da Análise (Davi, 28/09: opção C do canvas).
 *
 * O título conta quantos indicadores estão fora da faixa, e não o resultado
 * do mês: o resultado já aparece embaixo, e o que a pessoa veio saber na
 * análise é se precisa agir. Ao lado, o que fazer, cada passo um link inteiro
 * até a tela onde aquilo se resolve.
 */
export function TopoDaAnalise({ diagnostico, mes }: { diagnostico: Diagnostico; mes: string }) {
  const fora = diagnostico.indicadores.filter(foraDaFaixa)
  const vermelhos = fora.filter((indicador) => indicador.faixa === "CRITICO").length
  const resultado = diagnostico.dre.resultadoCentavos
  const titulo = fora.length === 0 ? "Todos os indicadores na faixa boa" : fora.length === 1 ? "1 indicador pede atenção" : `${fora.length} indicadores pedem atenção`
  const apoio = [
    fora.length === 0 ? null : vermelhos === 0 ? "nenhum no vermelho" : vermelhos === 1 ? "1 no vermelho" : `${vermelhos} no vermelho`,
    // O mês ainda não terminou: "até hoje", para ninguém ler como fechamento.
    resultado >= 0 ? `sobraram ${formatarMoeda(resultado)} até hoje` : `faltaram ${formatarMoeda(-resultado)} até hoje`,
  ].filter(Boolean).join(" · ")

  return <div className={estilos.topo}>
    <section className={`superficie-clara ${estilos.parecer}`}>
      {/* A nota vem com a escala e a situação: "60" sozinho não diz se é bom. */}
      <span className={estilos.rotulo}>{mes} · nota {diagnostico.nota} de 100 · {SITUACAO[diagnostico.situacao]}</span>
      <h2>{titulo}</h2>
      <p className="apoio-claro valor-sensivel">{apoio}</p>
    </section>

    {diagnostico.prioridades.length > 0 && (
      <section className={estilos.bloco}>
        <header className={estilos.cabecalho}><h2>O que fazer</h2><small>{diagnostico.prioridades.length === 1 ? "1 passo" : `${diagnostico.prioridades.length} passos, nesta ordem`}</small></header>
        <ol className={estilos.passos}>
          {diagnostico.prioridades.map((prioridade) => {
            const destino = ONDE_RESOLVER[prioridade.chave] ?? { href: "/transacoes", texto: "Abrir" }
            return <li key={prioridade.ordem}>
              <Link href={destino.href} aria-label={`${prioridade.titulo}: ${destino.texto}`}>
                <i aria-hidden>{prioridade.ordem}</i>
                <span>
                  <strong>{prioridade.titulo}</strong>
                  <small>{prioridade.acao}</small>
                  {prioridade.impactoMensalCentavos ? <em className="valor-sensivel">economiza {formatarMoeda(prioridade.impactoMensalCentavos)} por mês</em> : null}
                </span>
                <ChevronRight aria-hidden />
              </Link>
            </li>
          })}
        </ol>
      </section>
    )}
  </div>
}

/**
 * Indicadores: o que está fora da faixa vem primeiro, um cartão cada, com a
 * régua e o caminho para resolver. O que está bem vira uma linha — ocupar o
 * mesmo espaço dava o mesmo peso a quem não pede nada.
 */
export function IndicadoresDaAnalise({ indicadores }: { indicadores: Indicador[] }) {
  // O vermelho antes do amarelo: é o que pesa mais na nota.
  const fora = indicadores.filter(foraDaFaixa).sort((a, b) => (a.faixa === b.faixa ? 0 : a.faixa === "CRITICO" ? -1 : 1))
  const bons = indicadores.filter((indicador) => indicador.faixa === "BOM")
  const semFaixa = indicadores.filter((indicador) => indicador.faixa === "SEM_DADO")

  // Os demais entram na mesma grade dos cartões: no computador ocupam a vaga
  // que sobra na última linha, em vez de uma faixa de ponta a ponta com um
  // item só.
  return <div className={estilos.cartoes}>
    {fora.map((indicador) => {
      const destino = ONDE_RESOLVER_INDICADOR[indicador.chave]
      return <article key={indicador.chave} className={estilos.cartao} data-faixa={indicador.faixa}>
        <header><h3>{indicador.nome}</h3><span className={estilos.selo}>{SELO[indicador.faixa as keyof typeof SELO]}</span></header>
        <b className={estilos.valor}>{indicador.valor}</b>
        {indicador.escala && <Regua numero={indicador.numero} escala={indicador.escala} />}
        <footer>
          <span>{indicador.referencia}</span>
          {destino && <Link href={destino.href}>{destino.texto} →</Link>}
        </footer>
      </article>
    })}

    {(bons.length > 0 || semFaixa.length > 0) && (
      <section className={`${estilos.bloco} ${estilos.demais}`}>
        {bons.length > 0 && <>
          <p className={estilos.rotuloBloco}>Na faixa boa</p>
          <ul>{bons.map((indicador) => <LinhaDoIndicador key={indicador.chave} indicador={indicador} apoio={indicador.referencia} />)}</ul>
        </>}
        {semFaixa.length > 0 && <>
          <p className={estilos.rotuloBloco}>Sem faixa</p>
          {/* Com régua e sem faixa, o que falta é dado (a renda não lançada,
              por exemplo), e a leitura diz qual. Sem régua, a referência
              explica por que não há faixa — o gasto essencial. */}
          <ul>{semFaixa.map((indicador) => <LinhaDoIndicador key={indicador.chave} indicador={indicador} apoio={indicador.escala ? indicador.leitura : indicador.referencia} />)}</ul>
        </>}
      </section>
    )}
  </div>
}

function LinhaDoIndicador({ indicador, apoio }: { indicador: Indicador; apoio: string }) {
  return <li data-faixa={indicador.faixa}>
    <span><strong>{indicador.nome}</strong><small>{apoio}</small></span>
    <b>{indicador.valor}</b>
  </li>
}

/** As três zonas da referência, na ordem em que aparecem da esquerda para a direita. */
function Regua({ numero, escala }: { numero: number; escala: NonNullable<Indicador["escala"]> }) {
  const posicao = (valor: number) => Math.max(0, Math.min(100, (valor / escala.maximo) * 100))
  const bom = posicao(escala.bom)
  const atencao = posicao(escala.atencao)
  const zonas: [string, number, number][] = escala.menorMelhor
    ? [["bom", 0, bom], ["atencao", bom, atencao], ["alto", atencao, 100]]
    : [["alto", 0, atencao], ["atencao", atencao, bom], ["bom", bom, 100]]
  return <span className={estilos.regua} aria-hidden>
    {zonas.map(([zona, de, ate]) => <i key={zona} data-zona={zona} style={{ left: `${de}%`, width: `${Math.max(0, ate - de)}%` }} />)}
    <em style={{ left: `${posicao(numero)}%` }} />
  </span>
}
