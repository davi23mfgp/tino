"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Check } from "lucide-react"

import { rotuloCompetencia } from "@/lib/datas"
import { formatarMoeda } from "@/lib/dinheiro"
import { pesoDoJuro } from "@/lib/tino/leitura-dividas"
import { cn } from "@/lib/utils"
import pesos from "@/components/peso-do-juro.module.css"
import estilos from "./mes-a-mes.module.css"

export interface PassoDoPlano {
  competencia: string
  sobraCentavos: number
  dividaRestanteCentavos: number
  pagamentos: { id: string; nome: string; valorCentavos: number; motivo: string }[]
  quitadas: string[]
}

/**
 * O roteiro do plano em três peças, na ordem que o Davi escolheu no canvas
 * (23/09): o detalhe de um mês em cima, o gráfico da dívida caindo no meio e a
 * lista mês a mês embaixo. As três dividem o mesmo mês selecionado — tocar no
 * gráfico, numa pílula ou numa linha da lista troca o detalhe de cima.
 *
 * Sai o "Sobra no mês" que fechava cada mês: ele era a soma dos pagamentos
 * listados logo acima, com um nome que sugeria dinheiro livre. Só aparece
 * agora quando é negativo, porque aí diz uma coisa nova — falta dinheiro.
 */
export function PlanoMesAMes({
  passos,
  ordem,
  mesLivre,
}: {
  passos: PassoDoPlano[]
  ordem: { id: string; nome: string; jurosMensalBps: number }[]
  mesLivre: string | null
}) {
  const [selecionado, setSelecionado] = useState(passos[0]?.competencia ?? "")
  const detalhe = useRef<HTMLElement>(null)
  const pesoPorId = useMemo(() => new Map(ordem.map((alvo) => [alvo.id, pesoDoJuro(alvo.jurosMensalBps)])), [ordem])
  const nomePorId = useMemo(() => new Map(ordem.map((alvo) => [alvo.id, alvo.nome])), [ordem])
  const passo = passos.find((item) => item.competencia === selecionado) ?? passos[0]
  if (!passo) return null

  const totalDoMes = passo.pagamentos.reduce((soma, item) => soma + item.valorCentavos, 0)
  const titulo = rotuloCompetencia(passo.competencia)

  // Da lista, que fica longe do detalhe, a escolha leva a tela até ele — sem
  // isso o toque parece não ter feito nada.
  function escolherDaLista(competencia: string) {
    setSelecionado(competencia)
    detalhe.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
  }

  return (
    <div className={estilos.grade}>
      <section ref={detalhe} className={cn("ficha", estilos.detalhe)} aria-live="polite">
        <header>
          <h2>{titulo.charAt(0).toUpperCase() + titulo.slice(1)}</h2>
          <small>resta {formatarMoeda(passo.dividaRestanteCentavos)}</small>
        </header>
        <p className={estilos.totalMes}>
          {formatarMoeda(totalDoMes)} <span>para pagar</span>
        </p>

        {totalDoMes > 0 && (
          <div className={estilos.empilhada} aria-hidden>
            {passo.pagamentos.map((item) => (
              <i
                key={item.id}
                className={pesos.peso}
                data-peso={pesoPorId.get(item.id) ?? "sem-juro"}
                style={{ width: `${(item.valorCentavos / totalDoMes) * 100}%` }}
              />
            ))}
          </div>
        )}

        <ul className={estilos.pagamentos}>
          {passo.pagamentos.map((item) => (
            <li key={item.id} className={pesos.peso} data-peso={pesoPorId.get(item.id) ?? "sem-juro"}>
              <i aria-hidden />
              <span>
                {item.nome}
                <small>{item.motivo}</small>
              </span>
              <b>{formatarMoeda(item.valorCentavos)}</b>
            </li>
          ))}
        </ul>

        {passo.quitadas.length > 0 && (
          <p className={estilos.quitou}>
            <Check className="size-4" aria-hidden />
            {passo.quitadas.map((id) => nomePorId.get(id) ?? id).join(", ")} {passo.quitadas.length === 1 ? "acaba" : "acabam"} neste mês
          </p>
        )}
        {passo.sobraCentavos < 0 && (
          <p className={estilos.falta}>Neste mês faltam {formatarMoeda(-passo.sobraCentavos)} para o custo de vida e as parcelas.</p>
        )}
      </section>

      <section className={cn("ficha", estilos.bloco)}>
        <header>
          <h2>Dívida até zerar</h2>
          {mesLivre && <small>livre em <b>{rotuloCompetencia(mesLivre, true)}</b></small>}
        </header>
        <Grafico passos={passos} selecionado={passo.competencia} aoEscolher={setSelecionado} pesoPorId={pesoPorId} />
        <p className={estilos.legenda}>
          <span><i className={estilos.linhaLegenda} />ainda devendo</span>
          <span>
            {(["caro", "medio", "leve"] as const).map((peso) => (
              <i key={peso} className={cn(pesos.peso, estilos.pontoLegenda)} data-peso={peso} />
            ))}
            uma dívida acaba
          </span>
        </p>
        <div className={estilos.pilulas}>
          {passos.map((item) => (
            <button
              key={item.competencia}
              type="button"
              aria-pressed={item.competencia === passo.competencia}
              onClick={() => setSelecionado(item.competencia)}
            >
              {rotuloCompetencia(item.competencia, true)}
            </button>
          ))}
        </div>
      </section>

      <ListaMeses passos={passos} selecionado={passo.competencia} aoEscolher={escolherDaLista} nomePorId={nomePorId} />
    </div>
  )
}

/**
 * A dívida restante mês a mês, uma linha só.
 *
 * Mede a largura real do cartão em vez de esticar um desenho fixo: com
 * `viewBox` esticado, as bolinhas viram elipses e o texto dos meses engorda
 * no computador. Tocar em qualquer ponto escolhe o mês mais próximo — alvo
 * de toque do tamanho do gráfico inteiro, não de uma bolinha de 10px.
 */
function Grafico({
  passos,
  selecionado,
  aoEscolher,
  pesoPorId,
}: {
  passos: PassoDoPlano[]
  selecionado: string
  aoEscolher: (competencia: string) => void
  pesoPorId: Map<string, string>
}) {
  const caixa = useRef<HTMLDivElement>(null)
  const [largura, setLargura] = useState(320)

  useEffect(() => {
    const elemento = caixa.current
    if (!elemento) return
    const observador = new ResizeObserver(([entrada]) => setLargura(Math.max(200, Math.round(entrada.contentRect.width))))
    observador.observe(elemento)
    return () => observador.disconnect()
  }, [])

  const altura = 160
  const base = altura - 24
  const margem = 10
  const maximo = Math.max(1, ...passos.map((passo) => passo.dividaRestanteCentavos))
  const x = (indice: number) => margem + (passos.length > 1 ? (indice * (largura - margem * 2)) / (passos.length - 1) : (largura - margem * 2) / 2)
  const y = (valor: number) => 12 + (1 - valor / maximo) * (base - 12)
  const linha = passos.map((passo, indice) => `${x(indice).toFixed(1)},${y(passo.dividaRestanteCentavos).toFixed(1)}`).join(" ")
  const area = `M${x(0)},${base} L${linha.replaceAll(" ", " L")} L${x(passos.length - 1)},${base} Z`
  const indiceSelecionado = Math.max(0, passos.findIndex((passo) => passo.competencia === selecionado))
  // Rótulos no começo, no fim e em até dois pontos no meio: um por mês
  // encavala no celular.
  const rotulos = [...new Set([0, Math.round((passos.length - 1) / 3), Math.round(((passos.length - 1) * 2) / 3), passos.length - 1])]

  function escolherPeloPonteiro(evento: React.PointerEvent<SVGSVGElement>) {
    const retangulo = evento.currentTarget.getBoundingClientRect()
    const relativo = evento.clientX - retangulo.left
    const passo = (largura - margem * 2) / Math.max(1, passos.length - 1)
    const indice = Math.min(passos.length - 1, Math.max(0, Math.round((relativo - margem) / passo)))
    aoEscolher(passos[indice].competencia)
  }

  const inicio = passos[0]
  const fim = passos[passos.length - 1]
  return (
    <div ref={caixa} className={estilos.grafico}>
      <svg
        width={largura}
        height={altura}
        role="img"
        aria-label={`Dívida restante: ${formatarMoeda(inicio.dividaRestanteCentavos)} em ${rotuloCompetencia(inicio.competencia, true)}, ${formatarMoeda(fim.dividaRestanteCentavos)} em ${rotuloCompetencia(fim.competencia, true)}. Escolha o mês nas pílulas abaixo.`}
        onPointerDown={escolherPeloPonteiro}
      >
        <defs>
          <linearGradient id="area-plano" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" style={{ stopColor: "var(--acao)", stopOpacity: 0.3 }} />
            <stop offset="1" style={{ stopColor: "var(--acao)", stopOpacity: 0 }} />
          </linearGradient>
        </defs>
        <line x1={margem} x2={largura - margem} y1={base} y2={base} className={estilos.eixo} />
        <path d={area} fill="url(#area-plano)" />
        <polyline points={linha} className={estilos.linha} />
        <line x1={x(indiceSelecionado)} x2={x(indiceSelecionado)} y1={8} y2={base} className={estilos.guia} />
        {passos.map((passo, indice) =>
          passo.quitadas.length > 0 ? (
            <circle
              key={passo.competencia}
              cx={x(indice)}
              cy={y(passo.dividaRestanteCentavos)}
              r={5}
              className={cn(pesos.peso, estilos.quitacao)}
              data-peso={pesoPorId.get(passo.quitadas[0]) ?? "sem-juro"}
            />
          ) : null,
        )}
        <circle cx={x(indiceSelecionado)} cy={y(passos[indiceSelecionado].dividaRestanteCentavos)} r={6} className={estilos.marcador} />
        {rotulos.map((indice) => (
          <text
            key={indice}
            x={x(indice)}
            y={altura - 6}
            textAnchor={indice === 0 ? "start" : indice === passos.length - 1 ? "end" : "middle"}
            className={estilos.mesEixo}
          >
            {rotuloCompetencia(passos[indice].competencia, true)}
          </text>
        ))}
      </svg>
    </div>
  )
}

/**
 * Uma linha por mês, filtrada por ano. Plano de trinta meses empilhado não é
 * navegável; o ano corta a lista no recorte que a pessoa já tem em mente.
 */
function ListaMeses({
  passos,
  selecionado,
  aoEscolher,
  nomePorId,
}: {
  passos: PassoDoPlano[]
  selecionado: string
  aoEscolher: (competencia: string) => void
  nomePorId: Map<string, string>
}) {
  const anos = [...new Set(passos.map((passo) => passo.competencia.slice(0, 4)))]
  const [ano, setAno] = useState(anos[0] ?? "")
  const doAno = passos.filter((passo) => passo.competencia.startsWith(ano))

  return (
    <section className={cn("ficha", estilos.bloco, estilos.lista)}>
      <header>
        <h2>Mês a mês</h2>
        {anos.length > 1 && (
          <div className={estilos.anos} role="group" aria-label="Ano do roteiro">
            {anos.map((valor) => (
              <button key={valor} type="button" aria-pressed={ano === valor} onClick={() => setAno(valor)}>
                {valor}
              </button>
            ))}
          </div>
        )}
      </header>
      <ul>
        {doAno.map((passo) => {
          const pago = passo.pagamentos.reduce((soma, item) => soma + item.valorCentavos, 0)
          return (
            <li key={passo.competencia}>
              <button type="button" aria-pressed={passo.competencia === selecionado} onClick={() => aoEscolher(passo.competencia)}>
                <b>{rotuloCompetencia(passo.competencia, true)}</b>
                <span>
                  paga {formatarMoeda(pago)}
                  {passo.quitadas.length > 0 ? (
                    <small className={estilos.quitada}>
                      <Check className="size-3.5" aria-hidden />
                      {passo.quitadas.map((id) => nomePorId.get(id) ?? id).join(", ")} {passo.quitadas.length === 1 ? "quitada" : "quitadas"}
                    </small>
                  ) : (
                    <small>{passo.pagamentos.length} {passo.pagamentos.length === 1 ? "dívida" : "dívidas"}</small>
                  )}
                </span>
                <span className={estilos.resta}>
                  resta
                  <b>{formatarMoeda(passo.dividaRestanteCentavos)}</b>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
