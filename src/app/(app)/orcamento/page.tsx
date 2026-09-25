"use client"

import { useCallback, useEffect, useState } from "react"
import { ChevronLeft, ChevronRight, RotateCcw, Sparkles } from "lucide-react"

import { buscar, enviar } from "@/lib/cliente"
import { competenciaAtual, rotuloCompetencia, ultimasCompetencias, competenciaMaisMeses } from "@/lib/datas"
import { formatarMoeda, paraCentavos } from "@/lib/dinheiro"
import { Vazio } from "@/components/ui/painel"
import { SimboloCategoria } from "@/components/seletor-categoria"
import { OrcamentoCasal } from "@/components/orcamento-casal"
import { DivisaoDaRenda } from "@/components/divisao-da-renda"
import estilos from "./orcamento.module.css"

/**
 * Orçamento por categoria.
 *
 * O limite é editado direto na linha, sem tela de cadastro à parte: orçamento
 * que exige navegar para outro lugar para ajustar um valor não é revisado, e
 * orçamento não revisado deixa de valer em duas semanas.
 */

interface Categoria {
  id: string
  nome: string
  grupo: string
}

interface Linha {
  id: string
  categoriaId: string
  categoria: Categoria
  limiteCentavos: number
  gastoCentavos: number
  restanteCentavos: number
  percentual: number
  estourou: boolean
}

interface Orcamento {
  competencia: string
  linhas: Linha[]
  semOrcamento: { categoria: Categoria; gastoCentavos: number }[]
  limiteTotalCentavos: number
  gastoTotalCentavos: number
}


export default function OrcamentoPagina() {
  const [competencia, setCompetencia] = useState(competenciaAtual())
  const [dados, setDados] = useState<Orcamento | null>(null)
  const [rascunho, setRascunho] = useState<Record<string, string>>({})
  const [repetir, setRepetir] = useState(0)
  const [ocupado, setOcupado] = useState(false)
  const [mensagem, setMensagem] = useState<string | null>(null)
  // Categorias sem limite em que a pessoa tocou "+ limite": sobem para a lista
  // com o campo aberto, mesmo antes de ter valor digitado.
  const [abertas, setAbertas] = useState<Set<string>>(new Set())

  const carregar = useCallback(async () => {
    const resposta = await buscar<Orcamento>(`/api/orcamento?competencia=${competencia}`)
    setDados(resposta)
    setAbertas(new Set())
    setRascunho(
      Object.fromEntries(
        resposta.linhas.map((linha) => [linha.categoriaId, paraTexto(linha.limiteCentavos)]),
      ),
    )
  }, [competencia])

  useEffect(() => {
    carregar().catch(()=>setMensagem("Não foi possível carregar o orçamento. Recarregue a página."))
  }, [carregar])

  async function salvar() {
    setOcupado(true)
    setMensagem(null)

    try {
      const linhas = Object.entries(rascunho)
        .filter(([, valor]) => valor.trim())
        .map(([categoriaId, valor]) => ({ categoriaId, limiteCentavos: paraCentavos(valor) }))

      const resultado = await enviar<{ mesesAfetados: number }>(
        "/api/orcamento",
        { competencia, linhas, repetirMeses: repetir },
        "PUT",
      )
      setMensagem(
        resultado.mesesAfetados > 1
          ? `Salvo para ${resultado.mesesAfetados} meses.`
          : "Salvo para este mês.",
      )
      await carregar()
    } catch (erro) {
      setMensagem(erro instanceof Error ? erro.message : "Não consegui salvar.")
    } finally {
      setOcupado(false)
    }
  }

  /**
   * Sugestão pela mediana dos últimos 6 meses.
   * Mediana e não média: um mês atípico (viagem, conserto de carro) puxaria a
   * média e inflaria o limite para sempre.
   */
  async function sugerir() {
    setOcupado(true)
    try {
      const resposta = await buscar<{ sugestoes: { categoriaId: string; sugestaoCentavos: number }[] }>(
        `/api/orcamento?competencia=${competencia}`,
        { method: "POST" },
      )

      setRascunho((atual) => {
        const novo = { ...atual }
        for (const sugestao of resposta.sugestoes) {
          novo[sugestao.categoriaId] = (sugestao.sugestaoCentavos / 100).toFixed(2).replace(".", ",")
        }
        return novo
      })

      setMensagem(
        resposta.sugestoes.length > 0
          ? `${resposta.sugestoes.length} limite(s) preenchido(s) pela mediana dos últimos 6 meses. Ajuste e salve.`
          : "Ainda não há histórico suficiente para sugerir.",
      )
    } finally {
      setOcupado(false)
    }
  }

  /**
   * Continuar o mês passado: traz os limites dele para o rascunho deste mês.
   * Nada é gravado até a pessoa salvar — ela pode mexer em um ou outro antes.
   */
  async function repetirMesPassado() {
    setOcupado(true)
    setMensagem(null)
    try {
      const anterior = await buscar<Orcamento>(`/api/orcamento?competencia=${mesPassado}`)
      if (anterior.linhas.length === 0) {
        setMensagem(`${rotuloCompetencia(mesPassado)} não tinha limites definidos.`)
        return
      }
      setRascunho((atual) => {
        const novo = { ...atual }
        for (const linha of anterior.linhas) novo[linha.categoriaId] = paraTexto(linha.limiteCentavos)
        return novo
      })
      setMensagem(`${anterior.linhas.length} limite(s) de ${rotuloCompetencia(mesPassado).split(" ")[0]} trazidos. Confira e salve.`)
    } catch {
      setMensagem("Não consegui trazer os limites do mês passado.")
    } finally {
      setOcupado(false)
    }
  }

  const mesPassado = competenciaMaisMeses(competencia, -1)
  const competencias = ultimasCompetencias(6).concat([1, 2, 3].map((n) => competenciaMaisMeses(competenciaAtual(), n)))
  const indice = competencias.indexOf(competencia)
  const limiteDe = (categoriaId: string) => {
    const texto = rascunho[categoriaId]
    return texto && texto.trim() ? paraCentavos(texto) : 0
  }
  // A barra e o "faltam/passou" seguem o rascunho: quem digita um limite vê na
  // hora se a categoria fica verde ou vermelha, antes de salvar.
  const linhas = (dados?.linhas ?? []).map((linha) => ({ ...linha, limiteCentavos: limiteDe(linha.categoriaId) }))
  const novas = (dados?.semOrcamento ?? []).filter((linha) => abertas.has(linha.categoria.id) || limiteDe(linha.categoria.id) > 0)
  const semLimite = (dados?.semOrcamento ?? []).filter((linha) => !novas.includes(linha))
  const limitePlanejado = [...linhas.map((l) => l.limiteCentavos), ...novas.map((l) => limiteDe(l.categoria.id))].reduce((a, b) => a + b, 0)
  const gasto = linhas.reduce((soma, linha) => soma + linha.gastoCentavos, 0) + novas.reduce((soma, linha) => soma + linha.gastoCentavos, 0)
  // Compara em centavos, categoria a categoria: "1200" e "1.200,00" são o
  // mesmo limite e não devem acender o botão de salvar.
  const salvos = new Map((dados?.linhas ?? []).map((l) => [l.categoriaId, l.limiteCentavos]))
  const alterado = dados !== null && [...new Set([...salvos.keys(), ...Object.keys(rascunho)])].some((id) => (salvos.get(id) ?? 0) !== limiteDe(id))
  // A mais apertada primeiro: quem abre o orçamento quer ver o que estourou.
  const ordenadas = [...linhas].sort((a, b) => b.gastoCentavos / Math.max(1, b.limiteCentavos) - a.gastoCentavos / Math.max(1, a.limiteCentavos))

  return (
    <div className={estilos.pagina}>
      {/* Orçamento (Davi, 25/09: "categorias, limites, verde dentro e
          vermelho quando passa, mostrando quanto passou ou quanto falta; ajuste
          de limite e continuar o mês passado"). Saíram o bloco branco e os
          quatro quadros, que repetiam o mesmo resumo; a divisão do casal e a
          referência da renda ficaram recolhidas no fim. */}
      <div className={estilos.mes}>
        <button type="button" aria-label="Mês anterior" disabled={indice <= 0} onClick={() => setCompetencia(competencias[indice - 1])}><ChevronLeft aria-hidden /></button>
        <b>{rotuloCompetencia(competencia)}</b>
        <button type="button" aria-label="Próximo mês" disabled={indice >= competencias.length - 1} onClick={() => setCompetencia(competencias[indice + 1])}><ChevronRight aria-hidden /></button>
      </div>

      <div className={estilos.topo}>
        <section className={estilos.resumo}>
          {limitePlanejado > 0 ? (
            <>
              <div className={estilos.linhaResumo}>
                <div>
                  <small>Gasto no mês</small>
                  <b className="valor-sensivel">{formatarMoeda(gasto)}</b>
                  <small>de {formatarMoeda(limitePlanejado)} de limite</small>
                </div>
                <strong data-estourou={gasto > limitePlanejado || undefined}>
                  {gasto > limitePlanejado ? `passou ${formatarMoeda(gasto - limitePlanejado)}` : `faltam ${formatarMoeda(limitePlanejado - gasto)}`}
                </strong>
              </div>
              <Trilho gasto={gasto} limite={limitePlanejado} grosso />
            </>
          ) : (
            <div className={estilos.linhaResumo}>
              <div>
                <small>Nenhum limite definido para {rotuloCompetencia(competencia).split(" ")[0]}</small>
                <b>Defina quanto quer gastar em cada categoria</b>
              </div>
            </div>
          )}
        </section>
        <div className={estilos.atalhos}>
          <button type="button" onClick={() => void repetirMesPassado()} disabled={ocupado}><RotateCcw aria-hidden />Repetir limites de {rotuloCompetencia(mesPassado).split(" ")[0]}</button>
          <button type="button" onClick={() => void sugerir()} disabled={ocupado}><Sparkles aria-hidden />Usar meu histórico</button>
        </div>
      </div>

      {mensagem && <p className={estilos.mensagem} role="status">{mensagem}</p>}

      {(ordenadas.length > 0 || novas.length > 0) && (
        <section className={estilos.bloco}>
          <header><h2>Categorias</h2><small>{ordenadas.length + novas.length} com limite</small></header>
          <ul className={estilos.lista}>
            {[...ordenadas.map((l) => ({ categoria: l.categoria, gasto: l.gastoCentavos })), ...novas.map((l) => ({ categoria: l.categoria, gasto: l.gastoCentavos }))].map(({ categoria, gasto: gastoDaCategoria }) => {
              const limite = limiteDe(categoria.id)
              const passou = limite > 0 && gastoDaCategoria > limite
              return (
                <li key={categoria.id}>
                  <span className={estilos.icone}><SimboloCategoria categoria={categoria} /></span>
                  <div className={estilos.corpoLinha}>
                    <div className={estilos.nomeValor}>
                      <b>{categoria.nome}</b>
                      <b className="valor-sensivel" data-estourou={passou || undefined}>{formatarMoeda(gastoDaCategoria)}</b>
                    </div>
                    <Trilho gasto={gastoDaCategoria} limite={limite} />
                    <div className={estilos.rodapeLinha}>
                      <span data-estourou={passou || undefined}>
                        {limite === 0 ? "sem limite" : passou ? `passou ${formatarMoeda(gastoDaCategoria - limite)}` : `faltam ${formatarMoeda(limite - gastoDaCategoria)}`}
                      </span>
                      <label className={estilos.limite}>
                        <span>limite</span>
                        <input
                          aria-label={`Limite de ${categoria.nome}`}
                          value={rascunho[categoria.id] ?? ""}
                          onChange={(evento) => setRascunho((atual) => ({ ...atual, [categoria.id]: evento.target.value }))}
                          inputMode="decimal"
                          placeholder="0,00"
                        />
                      </label>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {dados && ordenadas.length === 0 && novas.length === 0 && semLimite.length === 0 && (
        <Vazio titulo="Nenhum gasto nem limite neste mês" texto="Use seu histórico ou repita os limites do mês passado." />
      )}

      {semLimite.length > 0 && (
        <section className={estilos.bloco}>
          <header><h2>Sem limite</h2><small>gastou sem limite definido</small></header>
          <ul className={estilos.lista}>
            {semLimite.map((linha) => (
              <li key={linha.categoria.id} data-sem>
                <span className={estilos.icone}><SimboloCategoria categoria={linha.categoria} /></span>
                <div className={estilos.nomeValor}><span>{linha.categoria.nome}</span><b className="valor-sensivel">{formatarMoeda(linha.gastoCentavos)}</b></div>
                <button type="button" className={estilos.definir} onClick={() => setAbertas((atual) => new Set(atual).add(linha.categoria.id))}>+ limite</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <details className={estilos.recolhido}>
        <summary>Dividir com quem mora com você</summary>
        <OrcamentoCasal gastoComumCentavos={dados?.linhas.reduce((soma, linha) => soma + linha.gastoCentavos, 0) ?? 0} />
      </details>
      {/* A divisão da renda veio de /investir: é decisão de orçamento —
          quanto vai para necessidades, lazer, educação, longo prazo e
          reserva —, e o lugar de decidir isso é aqui. */}
      <details className={estilos.recolhido}>
        <summary>Divisão da renda · 60 · 10 · 10 · 15 · 5</summary>
        <DivisaoDaRenda />
      </details>

      {/* Salvar só aparece quando há o que salvar, preso ao pé da tela: o
          botão no meio do resumo ficava longe do limite que a pessoa acabou de
          mudar, lá embaixo na lista. */}
      {alterado && (
        <div className={estilos.salvar}>
          <label>
            Repetir por
            <select value={String(repetir)} onChange={(evento) => setRepetir(Number(evento.target.value))}>
              {[0, 2, 5, 11].map((n) => <option key={n} value={n}>{n === 0 ? "só este mês" : `${n + 1} meses`}</option>)}
            </select>
          </label>
          <button type="button" onClick={() => void salvar()} disabled={ocupado}>{ocupado ? "Salvando…" : "Salvar"}</button>
        </div>
      )}
    </div>
  )
}

/// Traço de uso: verde enquanto cabe no limite, vermelho quando passa.
function Trilho({ gasto, limite, grosso = false }: { gasto: number; limite: number; grosso?: boolean }) {
  const passou = limite > 0 && gasto > limite
  const largura = limite > 0 ? Math.min(100, (gasto / limite) * 100) : 0
  return (
    <span className={estilos.trilho} data-grosso={grosso || undefined} aria-hidden>
      <i data-estourou={passou || undefined} style={{ width: `${largura}%` }} />
    </span>
  )
}

const paraTexto = (centavos: number) => (centavos / 100).toFixed(2).replace(".", ",")
