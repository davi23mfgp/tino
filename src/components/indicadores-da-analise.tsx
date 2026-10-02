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

/** Grade uniforme ocupa a largura e mantém referências acessíveis sob demanda. */
export function IndicadoresDaAnalise({ indicadores }: { indicadores: Indicador[] }) {
  const ordem = { CRITICO: 0, ATENCAO: 1, BOM: 2, SEM_DADO: 3 }
  const ordenados = [...indicadores].sort((a, b) => ordem[a.faixa] - ordem[b.faixa])
  return <div className={`${estilos.cartoes} ${estilos.gradeIndicadores}`}>
    {ordenados.map((indicador) => {
      const destino = ONDE_RESOLVER_INDICADOR[indicador.chave]
      const referencia = indicador.escala
        ? `${indicador.escala.menorMelhor ? "Até" : "A partir de"} ${indicador.chave === "liquidez" ? `${indicador.escala.bom} meses` : `${indicador.escala.bom / 100}%`}`
        : "Sem faixa de referência"
      const estado = indicador.faixa === "BOM" ? "Adequado" : indicador.faixa === "SEM_DADO" ? (indicador.escala ? "Sem dado" : "Contexto") : SELO[indicador.faixa]
      return <article key={indicador.chave} className={estilos.cartao} data-faixa={indicador.faixa}>
        <header><h3>{indicador.nome}</h3><span className={estilos.estadoCompacto}><i aria-hidden />{estado}</span></header>
        <b className={`${estilos.valor} valor-sensivel`}>{indicador.valor}</b>
        {indicador.escala ? <Regua numero={indicador.numero} escala={indicador.escala} /> : <span className={estilos.semRegua} />}
        <p className={estilos.referenciaCurta}>{referencia}</p>
        <footer className={estilos.rodapeIndicador}>
          <details><summary>Referência</summary><p>{indicador.referencia}</p><p>{indicador.leitura}</p></details>
          {destino && <Link href={destino.href} aria-label={`${destino.texto}: ${indicador.nome}`}>Abrir →</Link>}
        </footer>
      </article>
    })}

  </div>
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
