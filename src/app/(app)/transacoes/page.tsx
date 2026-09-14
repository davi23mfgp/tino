"use client"
import { MarcaPersonalizada } from "@/components/identidades-visuais"

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
import Link from "next/link"
import { SeletorCategoria, SimboloCategoria, type CategoriaSelecionavel } from "@/components/seletor-categoria"
import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import estilos from "./extrato.module.css"

interface Transacao {
  id: string
  data: string
  descricao: string
  valorCentavos: number
  tipo: "RECEITA" | "DESPESA" | "TRANSFERENCIA"
  categoriaId: string | null
  categoria: { nome: string; cor: string; grupo?: string | null; icone?: string | null } | null
  conta: { nome: string }
}

type Categoria = CategoriaSelecionavel

interface Resultado {
  transacoes: Transacao[]
  proximoCursor: string | null
  contagem: { entradas: number; saidas: number }
  totais: { receitasCentavos: number; despesasCentavos: number }
}

const TAMANHO_PAGINA = 25
const CLASSE_BOTAO = "min-h-11 rounded-full border border-pauta px-4 py-2 text-sm font-medium hover:bg-papel-2 disabled:cursor-not-allowed disabled:opacity-50"

export default function Transacoes() {
  const [competencia, setCompetencia] = useState(competenciaAtual())
  const [contaFiltro,setContaFiltro]=useState("")
  const [contas,setContas]=useState<{id:string;nome:string}[]>([])
  useEffect(()=>{buscar<{id:string;nome:string}[]>("/api/contas").then(setContas).catch(()=>showToast("Não foi possível carregar contas.",{variant:"error"}))},[])
  const [busca, setBusca] = useState("")
  const [semCategoria, setSemCategoria] = useState(false)
  const [tipo, setTipo] = useState("todos")
  const [categoriaFiltro, setCategoriaFiltro] = useState<string | null>(null)
  useEffect(() => {
    const parametros = new URLSearchParams(window.location.search)
    const categoria = parametros.get("categoriaId")
    if (categoria === "sem") setSemCategoria(true)
    else if (categoria) setCategoriaFiltro(categoria)
    const conta = parametros.get("contaId")
    if (conta) setContaFiltro(conta)
  }, [])
  const [contagem, setContagem] = useState<{ entradas: number; saidas: number } | null>(null)
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
  if (tipo !== "todos") parametros.set("tipo", tipo)
  if (categoriaFiltro && !semCategoria) parametros.set("categoriaId", categoriaFiltro)
  if(contaFiltro)parametros.set("contaId",contaFiltro)
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
      setContagem(dados.contagem)
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
    <div className={estilos.pagina}>
      <Cartao estatico className={estilos.controles}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Movimentações</h2>
          <FabAdicionar inline />
        </div>
        <div className={estilos.busca}>
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
        <div className={estilos.filtros}>
          <ToggleGroup type="single" value={tipo} onValueChange={valor => {if(valor) setTipo(valor)}} aria-label="Tipo de movimento">
            <ToggleGroupItem value="todos">Todos</ToggleGroupItem>
            <ToggleGroupItem value="RECEITA">Entradas</ToggleGroupItem>
            <ToggleGroupItem value="DESPESA">Saídas</ToggleGroupItem>
          </ToggleGroup>
          <SelectNative aria-label="Filtrar conta ou cartão" value={contaFiltro} onChange={e=>setContaFiltro(e.target.value)}><option value="">Todas as contas e cartões</option>{contas.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}</SelectNative>
          <SeletorCategoria opcoes={categorias} valor={categoriaFiltro} aoMudar={id => {setCategoriaFiltro(id);setSemCategoria(false)}} vazio="Todas as categorias" rotulo="Filtrar categoria" desabilitado={carregandoCategorias || erroCategorias} />
        </div>
        <details className={estilos.maisFiltros}>
          <summary className="min-h-11 cursor-pointer py-3 font-medium">
            Mais filtros{semCategoria ? " · 1 ativo" : ""}
          </summary>
          <label className="flex min-h-11 items-center gap-2">
            <Checkbox checked={semCategoria} onChange={(evento) => setSemCategoria(evento.target.checked)} />
            Só sem categoria
          </label>
          <Button asChild variant="link"><Link href="/categorias">Personalizar categorias</Link></Button>
        </details>
        {(busca || contaFiltro || categoriaFiltro || semCategoria || tipo !== "todos") && <div className={estilos.ativos}><span>{[busca && `Busca: ${busca}`, contas.find(c => c.id === contaFiltro)?.nome, categorias.find(c => c.id === categoriaFiltro)?.nome, semCategoria && "Sem categoria", tipo === "RECEITA" && "Entradas", tipo === "DESPESA" && "Saídas"].filter(Boolean).join(" · ")}</span><button onClick={() => { setBusca(""); setContaFiltro(""); setCategoriaFiltro(null); setSemCategoria(false); setTipo("todos") }}>Limpar filtros</button></div>}
        <div className={estilos.resumo}>
          <dl aria-label="Resumo do período filtrado" aria-busy={carregando}>
            {[
              { rotulo: "Entradas", valor: totais?.receitasCentavos, tom: "text-positivo" },
              { rotulo: "Saídas", valor: totais?.despesasCentavos, tom: "" },
              { rotulo: "Saldo do período", valor: saldo, tom: saldo !== null && saldo < 0 ? "text-negativo" : "" },
            ].map((metrica) => (
              <div key={metrica.rotulo}>
                <dt className="text-sm text-muted-fg">{metrica.rotulo}</dt>
                <dd className={cn("numero whitespace-nowrap text-lg font-semibold sm:mt-1", metrica.tom)}>
                  {metrica.valor == null ? "—" : formatarMoeda(metrica.valor)}
                </dd>
              </div>
            ))}
          </dl>
          <div className={estilos.contagem} aria-live="polite">
            <p>{contagem ? `${contagem.entradas} entradas · ${contagem.saidas} saídas neste filtro` : `${transacoes.filter(item => item.tipo === "RECEITA").length} entradas · ${transacoes.filter(item => item.tipo === "DESPESA").length} saídas carregadas`}</p>
          </div>
        </div>
      </Cartao>

      <Cartao estatico className={estilos.movimentos}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium" role="status">
            {carregando ? "Atualizando…" : `${transacoes.length} movimentações`}
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
            texto={busca || semCategoria || categoriaFiltro || tipo !== "todos" ? "Tente outra busca ou limpe os filtros." : "Adicione um lançamento ou escolha outro mês."}
            acao={busca || semCategoria || categoriaFiltro || tipo !== "todos" ? (
              <button type="button" className={CLASSE_BOTAO} onClick={() => { setBusca(""); setSemCategoria(false); setCategoriaFiltro(null); setTipo("todos") }}>
                Limpar filtros
              </button>
            ) : undefined}
          />
        )}

        <ul className={estilos.lista} aria-label="Lançamentos" aria-busy={ocupado}>
          {transacoes.map((transacao) => {
            const transferencia = transacao.tipo === "TRANSFERENCIA"
            return (
              <li key={transacao.id} className={estilos.linha}>
                <span className={estilos.simbolo}><MarcaPersonalizada nome={transacao.descricao}/><SimboloCategoria categoria={transacao.categoria} tipo={transacao.tipo} /></span>
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
                <div className={estilos.categoria}>
                  {transferencia ? <span className="text-xs text-muted-fg">Transferência</span> : <SeletorCategoria
                    opcoes={categorias} valor={transacao.categoriaId} rotulo={`Categoria de ${transacao.descricao}`}
                    desabilitado={ocupado || carregandoCategorias || erroCategorias} className="w-full justify-start"
                    aoMudar={categoriaId => void salvarEdicao(transacao.id, {categoriaId, criarRegra: categoriaId !== null})}
                  />}
                </div>
                <div className={cn(estilos.valor, transacao.tipo === "RECEITA" && "text-positivo")}>
                  {transferencia ? (
                    <span className="numero break-words text-sm text-muted-fg">{formatarMoeda(transacao.valorCentavos)}</span>
                  ) : (
                    <>
                      <span aria-label={transacao.tipo === "RECEITA" ? "Entrada" : "Saída"}>{transacao.tipo === "RECEITA" ? "+" : "−"}</span>
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
