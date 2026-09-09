"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { buscar, enviar, TRANSACOES_ATUALIZADAS } from "@/lib/cliente"
import { competenciaAtual, rotuloCompetencia, ultimasCompetencias } from "@/lib/datas"
import { formatarMoeda } from "@/lib/dinheiro"
import { Cartao, Vazio } from "@/components/ui/painel"
import { EditavelTexto, EditavelMoeda } from "@/components/ui/editavel"
import { FabAdicionar } from "@/components/fab-adicionar"
import { showToast } from "@/components/ui/toast"
import { SelectNative } from "@/components/ui/select-native"
import { Checkbox } from "@/components/ui/checkbox"
import { EsqueletoLinhas } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { iconeDaCategoria } from "@/lib/icone-categoria"

interface Transacao {
  id: string
  data: string
  descricao: string
  valorCentavos: number
  tipo: "RECEITA" | "DESPESA" | "TRANSFERENCIA"
  categoriaId: string | null
  categoria: { nome: string; cor: string; grupo?: string | null } | null
  conta: { nome: string }
}

interface Categoria {
  id: string
  nome: string
}

interface Resultado {
  transacoes: Transacao[]
  proximoCursor: string | null
  totais: { receitasCentavos: number; despesasCentavos: number }
}

const TAMANHO_PAGINA = 25
const CLASSE_BOTAO = "min-h-11 rounded-full border border-pauta px-4 py-2 text-sm font-medium hover:bg-papel-2 disabled:cursor-not-allowed disabled:opacity-50"

export default function Transacoes() {
  const [competencia, setCompetencia] = useState(competenciaAtual())
  const [busca, setBusca] = useState("")
  const [semCategoria, setSemCategoria] = useState(false)
  const [transacoes, setTransacoes] = useState<Transacao[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [totais, setTotais] = useState<Resultado["totais"] | null>(null)
  const [proximoCursor, setProximoCursor] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [carregandoMais, setCarregandoMais] = useState(false)
  const [erro, setErro] = useState<{ mensagem: string; cursor: string | null } | null>(null)
  const [erroCategorias, setErroCategorias] = useState(false)
  const [carregandoCategorias, setCarregandoCategorias] = useState(true)
  const [tentativaCategorias, setTentativaCategorias] = useState(0)
  const [atualizacao, setAtualizacao] = useState(0)
  const [salvando, setSalvando] = useState<string | null>(null)
  const requisicao = useRef<AbortController | null>(null)
  const salvamentoEmCurso = useRef(false)
  const carregados = useRef({ filtro: "", quantidade: 0 })

  const parametros = new URLSearchParams({ competencia, limite: String(TAMANHO_PAGINA) })
  if (busca.trim()) parametros.set("busca", busca.trim())
  if (semCategoria) parametros.set("semCategoria", "1")
  const filtro = parametros.toString()

  const carregar = useCallback(async (cursor: string | null = null) => {
    requisicao.current?.abort()
    const controle = new AbortController()
    requisicao.current = controle
    const mesmoFiltro = carregados.current.filtro === filtro
    const quantidade = mesmoFiltro ? Math.max(TAMANHO_PAGINA, carregados.current.quantidade) : TAMANHO_PAGINA

    setErro(null)
    setCarregando(!cursor)
    setCarregandoMais(Boolean(cursor))
    if (!cursor) {
      setTotais(null)
      if (!mesmoFiltro) {
        carregados.current = { filtro, quantidade: 0 }
        setTransacoes([])
        setProximoCursor(null)
      }
    }

    try {
      let proximo = cursor
      let linhas: Transacao[] = []
      let dados: Resultado
      // Uma edição recarrega também as páginas já abertas, sem perder a posição na lista.
      do {
        const consulta = new URLSearchParams(filtro)
        if (proximo) consulta.set("cursor", proximo)
        dados = await buscar<Resultado>(`/api/transacoes?${consulta}`, { signal: controle.signal })
        if (controle.signal.aborted) return
        linhas = linhas.concat(dados.transacoes)
        proximo = dados.proximoCursor
      } while (!cursor && proximo && linhas.length < quantidade)

      if (cursor) {
        setTransacoes((atuais) => {
          const ids = new Set(atuais.map((transacao) => transacao.id))
          return atuais.concat(linhas.filter((transacao) => !ids.has(transacao.id)))
        })
        carregados.current.quantidade += linhas.length
      } else {
        setTransacoes(linhas)
        carregados.current = { filtro, quantidade: linhas.length }
      }
      setProximoCursor(proximo)
      setTotais(dados.totais)
    } catch (falha) {
      if (!controle.signal.aborted) {
        setErro({
          mensagem: falha instanceof Error ? falha.message : "Não consegui carregar os lançamentos.",
          cursor,
        })
      }
    } finally {
      if (!controle.signal.aborted) {
        setCarregando(false)
        setCarregandoMais(false)
      }
    }
  }, [filtro])

  useEffect(() => {
    void carregar()
    return () => requisicao.current?.abort()
  }, [carregar, atualizacao])

  useEffect(() => {
    const controle = new AbortController()
    setCarregandoCategorias(true)
    setErroCategorias(false)
    buscar<Categoria[]>("/api/categorias", { signal: controle.signal })
      .then((lista) => {
        if (!controle.signal.aborted) setCategorias(lista)
      })
      .catch(() => {
        if (!controle.signal.aborted) setErroCategorias(true)
      })
      .finally(() => {
        if (!controle.signal.aborted) setCarregandoCategorias(false)
      })
    return () => controle.abort()
  }, [tentativaCategorias])

  function atualizar() {
    setAtualizacao((versao) => versao + 1)
  }

  useEffect(() => {
    const atualizarLista = () => setAtualizacao(versao => versao + 1)
    window.addEventListener(TRANSACOES_ATUALIZADAS, atualizarLista)
    return () => window.removeEventListener(TRANSACOES_ATUALIZADAS, atualizarLista)
  }, [])

  async function salvarEdicao(
    id: string,
    parcial: Partial<Pick<Transacao, "descricao" | "valorCentavos" | "categoriaId">> & { criarRegra?: boolean },
  ) {
    if (salvamentoEmCurso.current) return
    salvamentoEmCurso.current = true
    setSalvando(id)
    try {
      await enviar(`/api/transacoes/${id}`, parcial, "PATCH")
      // A revisão usa os filtros atuais, mesmo se eles mudarem enquanto o PATCH termina.
      atualizar()
    } catch (falha) {
      showToast("Não consegui salvar", {
        description: falha instanceof Error ? falha.message : "Tente novamente.",
        variant: "error",
      })
    } finally {
      salvamentoEmCurso.current = false
      setSalvando(null)
    }
  }

  const ocupado = carregando || carregandoMais || salvando !== null
  const saldo = totais ? totais.receitasCentavos - totais.despesasCentavos : null

  return (
    <div className="space-y-4">
      <Cartao estatico>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Seus lançamentos</h2>
          <FabAdicionar inline />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
          <label className="min-w-0 space-y-1 text-sm">
            <span className="block font-medium">Mês</span>
            <SelectNative
              tamanho="pilula"
              value={competencia}
              onChange={(evento) => setCompetencia(evento.target.value)}
              className="min-h-11"
            >
              {ultimasCompetencias(18).reverse().map((mes) => (
                <option key={mes} value={mes}>{rotuloCompetencia(mes)}</option>
              ))}
            </SelectNative>
          </label>
          <label className="min-w-0 space-y-1 text-sm">
            <span className="block font-medium">Buscar</span>
            <input
              type="search"
              value={busca}
              onChange={(evento) => setBusca(evento.target.value)}
              placeholder="Descrição do lançamento"
              className="min-h-11 w-full min-w-0 rounded-full border border-pauta bg-background px-4 py-2 text-sm outline-none focus:border-acao/50"
            />
          </label>
        </div>
        <details className="mt-3 text-sm">
          <summary className="min-h-11 cursor-pointer py-3 font-medium">
            Mais filtros{semCategoria ? " · 1 ativo" : ""}
          </summary>
          <label className="flex min-h-11 items-center gap-2">
            <Checkbox checked={semCategoria} onChange={(evento) => setSemCategoria(evento.target.checked)} />
            Só sem categoria
          </label>
        </details>
        <div className="mt-3 border-t border-pauta pt-4">
          <p className="mb-3 text-xs text-muted-fg">Totais de todos os lançamentos neste filtro</p>
          <dl className="grid gap-3 sm:grid-cols-3" aria-busy={carregando}>
            {[
              { rotulo: "Entradas", valor: totais?.receitasCentavos, tom: "text-positivo" },
              { rotulo: "Saídas", valor: totais?.despesasCentavos, tom: "" },
              { rotulo: "Saldo do período", valor: saldo, tom: saldo !== null && saldo < 0 ? "text-negativo" : "" },
            ].map((metrica) => (
              <div key={metrica.rotulo} className="flex min-w-0 flex-wrap items-baseline justify-between gap-1 sm:block">
                <dt className="text-sm text-muted-fg">{metrica.rotulo}</dt>
                <dd className={cn("numero break-words text-lg font-semibold sm:mt-1", metrica.tom)}>
                  {metrica.valor == null ? "—" : formatarMoeda(metrica.valor)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </Cartao>

      <Cartao estatico>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium" role="status">
            {carregando ? "Atualizando lançamentos…" : `${transacoes.length} lançamento(s) carregado(s)`}
          </p>
          <p className="text-xs text-muted-fg">Toque na descrição ou no valor para editar.</p>
        </div>

        {erroCategorias && (
          <div role="alert" className="mb-4 rounded-xl bg-papel-2 p-3 text-sm">
            <p>Não consegui carregar as categorias.</p>
            <button type="button" className={cn(CLASSE_BOTAO, "mt-2")} onClick={() => setTentativaCategorias((tentativa) => tentativa + 1)}>
              Tentar categorias novamente
            </button>
          </div>
        )}

        {carregando && transacoes.length === 0 && <EsqueletoLinhas linhas={4} />}
        {!carregando && !erro && transacoes.length === 0 && (
          <Vazio
            titulo="Nenhum lançamento encontrado"
            texto={busca || semCategoria ? "Tente outra busca ou limpe os filtros." : "Adicione um lançamento ou escolha outro mês."}
            acao={busca || semCategoria ? (
              <button type="button" className={CLASSE_BOTAO} onClick={() => { setBusca(""); setSemCategoria(false) }}>
                Limpar filtros
              </button>
            ) : undefined}
          />
        )}

        <ul className="space-y-3 sm:space-y-0 sm:divide-y sm:divide-pauta" aria-label="Lançamentos" aria-busy={ocupado}>
          {transacoes.map((transacao) => {
            const Icone = iconeDaCategoria(transacao.categoria, transacao.tipo)
            const transferencia = transacao.tipo === "TRANSFERENCIA"
            return (
              <li key={transacao.id} className="grid min-w-0 grid-cols-[40px_minmax(0,1fr)] gap-x-3 gap-y-2 rounded-xl border border-pauta p-3 sm:grid-cols-[40px_minmax(0,1fr)_minmax(140px,190px)_auto] sm:items-center sm:rounded-none sm:border-0 sm:px-0 sm:py-3">
                <span aria-hidden className="grid size-10 place-items-center rounded-full bg-foreground/[0.07] text-muted-fg">
                  <Icone className="size-[18px]" />
                </span>
                <div className="min-w-0">
                  <EditavelTexto
                    valor={transacao.descricao}
                    aoSalvar={(descricao) => salvarEdicao(transacao.id, { descricao })}
                    desabilitado={ocupado}
                    className="block w-full whitespace-normal break-words"
                  />
                  <p className="mt-1 break-words text-xs text-muted-fg">
                    {new Date(transacao.data).toLocaleDateString("pt-BR", { timeZone: "UTC" })} · {transacao.conta.nome}
                  </p>
                </div>
                <details className="col-span-2 min-w-0 sm:col-span-1">
                  <summary className="flex min-h-11 cursor-pointer items-center text-xs text-muted-fg">{transacao.categoria?.nome ?? "Sem categoria"} <span className="ml-2" aria-hidden>⌄</span></summary>
                  {transferencia ? (
                    <span className="text-xs text-muted-fg">Transferência entre contas</span>
                  ) : (
                    <SelectNative
                      tamanho="pilula"
                      aria-label={`Categoria de ${transacao.descricao}`}
                      value={transacao.categoriaId ?? ""}
                      disabled={ocupado || carregandoCategorias || erroCategorias}
                      onChange={(evento) => {
                        const categoriaId = evento.target.value || null
                        void salvarEdicao(transacao.id, { categoriaId, criarRegra: categoriaId !== null })
                      }}
                      className={cn("min-h-11 w-full truncate", !transacao.categoriaId && "text-atencao")}
                    >
                      <option value="">Sem categoria</option>
                      {categorias.map((categoria) => <option key={categoria.id} value={categoria.id}>{categoria.nome}</option>)}
                    </SelectNative>
                  )}
                </details>
                <div className={cn("col-span-2 flex min-w-0 flex-wrap items-center justify-end gap-1 sm:col-span-1", transacao.tipo === "RECEITA" && "text-positivo")}>
                  {transferencia ? (
                    <span className="numero break-words text-sm text-muted-fg">{formatarMoeda(transacao.valorCentavos)}</span>
                  ) : (
                    <>
                      <span className="text-xs">{transacao.tipo === "RECEITA" ? "Entrada +" : "Saída −"}</span>
                      <EditavelMoeda
                        valorCentavos={transacao.valorCentavos}
                        aoSalvar={(valorCentavos) => salvarEdicao(transacao.id, { valorCentavos })}
                        desabilitado={ocupado}
                        className="min-h-11"
                      />
                    </>
                  )}
                  {salvando === transacao.id && <span role="status" className="text-xs text-muted-fg">Salvando…</span>}
                </div>
              </li>
            )
          })}
        </ul>

        {erro && (
          <div role="alert" className="mt-4 rounded-xl bg-papel-2 p-3 text-sm">
            <p>{erro.cursor ? "Não consegui carregar mais lançamentos." : "Não consegui atualizar os lançamentos."}</p>
            <p className="mt-1 text-muted-fg">{erro.mensagem}</p>
            <button type="button" disabled={ocupado} className={cn(CLASSE_BOTAO, "mt-3")} onClick={() => void carregar(erro.cursor)}>
              Tentar novamente
            </button>
          </div>
        )}
        {proximoCursor && !erro && (
          <div className="mt-4 text-center">
            <button type="button" disabled={ocupado} className={CLASSE_BOTAO} onClick={() => void carregar(proximoCursor)}>
              {carregandoMais ? "Carregando…" : "Carregar mais"}
            </button>
          </div>
        )}
      </Cartao>
    </div>
  )
}
