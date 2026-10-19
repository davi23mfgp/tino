"use client"
import { MarcaPersonalizada } from "@/components/identidades-visuais"
import { CLASSE_DIALOGO_LOJA, EscolherLoja } from "@/components/escolher-loja"
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

import { useCallback, useEffect, useRef, useState } from "react"

import { buscar, enviar, TRANSACOES_ATUALIZADAS } from "@/lib/cliente"
import { competenciaAtual, competenciaMaisMeses, rotuloCompetencia, ultimasCompetencias } from "@/lib/datas"
import { formatarMoeda } from "@/lib/dinheiro"
import { Vazio } from "@/components/ui/painel"
import { FichaLancamento, type LancamentoDaFicha } from "@/components/ficha-lancamento"
import { showToast } from "@/components/ui/toast"
import { EsqueletoLinhas } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { SimboloCategoria, type CategoriaSelecionavel } from "@/components/seletor-categoria"
import { porDia, rotuloDia } from "@/lib/extrato-dias"
import { FaixaDeDias, type DiaComMovimento } from "@/components/faixa-de-dias"
import { FiltrosDoExtrato, nomeCurtoDaConta, type ContaDoFiltro, type TipoDoFiltro } from "@/components/filtros-do-extrato"
import { ChevronLeft, ChevronRight, Search } from "lucide-react"
import estilos from "./extrato.module.css"

interface Transacao {
  id: string
  data: string
  descricao: string
  descricaoOriginal?: string | null
  origem?: string
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
  const [contas,setContas]=useState<ContaDoFiltro[]>([])
  useEffect(()=>{buscar<ContaDoFiltro[]>("/api/contas").then(setContas).catch(()=>showToast("Não foi possível carregar contas.",{variant:"error"}))},[])
  // "mes" mostra o período inteiro; "dia" prende a lista ao dia da faixa.
  const [modo, setModo] = useState<"mes" | "dia">("mes")
  const [dia, setDia] = useState(() => new Date().toISOString().slice(0, 10))
  const [dias, setDias] = useState<DiaComMovimento[]>([])
  const [busca, setBusca] = useState("")
  const [lojaDe, setLojaDe] = useState<Transacao | null>(null)
  const [aberto, setAberto] = useState<Transacao | null>(null)
  // Excluídos que ainda podem voltar com "Desfazer": somem da lista na hora e
  // só saem do banco depois de 5 segundos.
  const [ocultos, setOcultos] = useState<Set<string>>(new Set())
  const [semCategoria, setSemCategoria] = useState(false)
  const [tipo, setTipo] = useState<TipoDoFiltro>("todos")
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
  if (modo === "dia") parametros.set("dia", dia)
  const filtro = parametros.toString()

  // Os pontos da faixa vêm de uma consulta agregada do mês inteiro: montá-los
  // a partir da lista deixaria metade do mês sem ponto, porque ela é paginada.
  useEffect(() => {
    let ativo = true
    buscar<DiaComMovimento[]>(`/api/transacoes/dias?competencia=${competencia}`)
      .then((linhas) => { if (ativo) setDias(linhas) })
      .catch(() => { if (ativo) setDias([]) })
    return () => { ativo = false }
  }, [competencia, atualizacao])

  // Trocar o mês leva a faixa junto; sem isto ela ficaria no mês anterior
  // mostrando dias que a lista não tem.
  useEffect(() => {
    if (dia.slice(0, 7) === competencia) return
    const hoje = new Date().toISOString().slice(0, 10)
    setDia(hoje.slice(0, 7) === competencia ? hoje : `${competencia}-01`)
  }, [competencia, dia])

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
    parcial: Partial<Pick<Transacao, "descricao" | "valorCentavos" | "categoriaId" | "data">> & { criarRegra?: boolean },
  ): Promise<boolean> {
    if (salvamentoEmCurso.current) return false
    salvamentoEmCurso.current = true
    setSalvando(id)
    try {
      await enviar(`/api/transacoes/${id}`, parcial, "PATCH")
      // A ficha aberta mostra o valor novo sem esperar a lista recarregar.
      setAberto((atual) => (atual && atual.id === id ? { ...atual, ...parcial, categoria: parcial.categoriaId !== undefined ? categorias.find((c) => c.id === parcial.categoriaId) ?? null : atual.categoria } as Transacao : atual))
      // A revisão usa os filtros atuais, mesmo se eles mudarem enquanto o PATCH termina.
      atualizar()
      return true
    } catch (falha) {
      showToast("Não consegui salvar", {
        description: falha instanceof Error ? falha.message : "Tente novamente.",
        variant: "error",
      })
      return false
    } finally {
      salvamentoEmCurso.current = false
      setSalvando(null)
    }
  }

  /**
   * Excluir sem "tem certeza?": o lançamento some na hora e o Desfazer fica
   * 5 segundos na tela (revisão de uso, 19/10/2026). Só depois o DELETE sai;
   * se o servidor recusar (aporte de meta, por exemplo), ele volta com o motivo.
   */
  function excluir(lancamento: LancamentoDaFicha) {
    const id = lancamento.id
    setAberto(null)
    setOcultos((atual) => new Set(atual).add(id))
    let desfeito = false
    const voltar = () => setOcultos((atual) => { const novo = new Set(atual); novo.delete(id); return novo })
    showToast(`${lancamento.descricao} excluído`, {
      description: formatarMoeda(lancamento.valorCentavos),
      action: { label: "Desfazer", onClick: () => { desfeito = true; voltar() } },
    })
    setTimeout(async () => {
      if (desfeito) return
      try {
        await buscar(`/api/transacoes/${id}`, { method: "DELETE" })
        atualizar()
      } catch (falha) {
        voltar()
        showToast("Não consegui excluir", { description: falha instanceof Error ? falha.message : "Tente novamente.", variant: "error" })
      }
    }, 5000)
  }

  const ocupado = carregando || carregandoMais || salvando !== null
  const saldo = totais ? totais.receitasCentavos - totais.despesasCentavos : null
  const competencias = ultimasCompetencias(18).reverse()
  const ultimaCompetencia = competencias[0]
  const primeiraCompetencia = competencias[competencias.length - 1]
  const filtrando = Boolean(busca || contaFiltro || categoriaFiltro || semCategoria || tipo !== "todos")
  // Conta filtrada não corta um lado: o mês daquela conta tem entradas e
  // saídas inteiras, e a sobra dela é uma resposta de verdade.
  const usoPorCategoria = new Map<string, number>()
  for (const transacao of transacoes) {
    if (transacao.categoriaId) usoPorCategoria.set(transacao.categoriaId, (usoPorCategoria.get(transacao.categoriaId) ?? 0) + 1)
  }
  const ladosInteiros = !busca && !categoriaFiltro && !semCategoria && tipo === "todos"
  function limparFiltros() {
    setBusca("")
    setContaFiltro("")
    setCategoriaFiltro(null)
    setSemCategoria(false)
    setTipo("todos")
  }

  return (
    <div className={estilos.pagina}>
      {/* Extrato (Davi, 24/09: a tela da opção A do canvas; o botão de filtro
          abre a folha da opção B). O saldo do período aparecia duas vezes —
          na frase do topo e na grade logo abaixo — e havia três botões de
          adicionar na mesma tela. Ficou um resumo só, o botão de adicionar do
          app, e os filtros numa linha. */}
      <div className={estilos.controles}>
        <div className={estilos.mes}>
          <button type="button" aria-label="Mês anterior" disabled={competencia <= primeiraCompetencia} onClick={() => setCompetencia(competenciaMaisMeses(competencia, -1))}>
            <ChevronLeft aria-hidden className="size-5" />
          </button>
          {/* O seletor nativo continua por baixo do título: pular de setembro
              para março nas setas seriam seis toques. */}
          <label>
            <span className="sr-only">Escolher o mês</span>
            <b>{rotuloCompetencia(competencia)}</b>
            <select value={competencia} onChange={(evento) => setCompetencia(evento.target.value)}>
              {competencias.map((mes) => (
                <option key={mes} value={mes}>{rotuloCompetencia(mes)}</option>
              ))}
            </select>
          </label>
          <button type="button" aria-label="Próximo mês" disabled={competencia >= ultimaCompetencia} onClick={() => setCompetencia(competenciaMaisMeses(competencia, 1))}>
            <ChevronRight aria-hidden className="size-5" />
          </button>
        </div>

        <FaixaDeDias
          diaSelecionado={dia}
          destacar={modo === "dia"}
          dias={dias}
          aoEscolher={(escolhido) => {
            setDia(escolhido)
            // Escolher um dia é pedir aquele dia: alternar à mão depois de
            // tocar no número seria um passo a mais para o óbvio.
            setModo("dia")
            if (escolhido.slice(0, 7) !== competencia) setCompetencia(escolhido.slice(0, 7))
          }}
        />

        {/* "Sobrou" só quando o filtro deixa os dois lados inteiros. Com
            "Saídas" ligado, entrou zero por definição, e a tela dizia "faltou
            R$ 350" de um mês que fechou no azul. No lugar, a contagem. */}
        <dl className={estilos.tres} aria-label="Resumo do que o filtro mostra" aria-busy={carregando}>
          {tipo !== "DESPESA" && (
            <div>
              <dt>Entrou</dt>
              <dd className="numero valor-sensivel text-positivo">{totais ? <ValorComCentavos centavos={totais.receitasCentavos} /> : "…"}</dd>
            </div>
          )}
          {tipo !== "RECEITA" && (
            <div>
              <dt>Saiu</dt>
              <dd className="numero valor-sensivel">{totais ? <ValorComCentavos centavos={totais.despesasCentavos} /> : "…"}</dd>
            </div>
          )}
          {ladosInteiros ? (
            <div>
              <dt>{saldo !== null && saldo < 0 ? "Faltou" : "Sobrou"}</dt>
              <dd className={cn("numero valor-sensivel", saldo !== null && saldo < 0 ? "text-negativo" : "text-positivo")}>
                {saldo === null ? "…" : <ValorComCentavos centavos={Math.abs(saldo)} />}
              </dd>
            </div>
          ) : (
            <div>
              <dt>Lançamentos</dt>
              <dd className="numero">{contagem && totais ? (tipo === "RECEITA" ? contagem.entradas : tipo === "DESPESA" ? contagem.saidas : contagem.entradas + contagem.saidas) : "…"}</dd>
            </div>
          )}
        </dl>

        <FiltrosDoExtrato
          tipo={tipo}
          aoMudarTipo={setTipo}
          contaId={contaFiltro}
          aoMudarConta={setContaFiltro}
          categoriaId={semCategoria ? null : categoriaFiltro}
          aoMudarCategoria={(id) => { setCategoriaFiltro(id); if (id) setSemCategoria(false) }}
          semCategoria={semCategoria}
          aoMudarSemCategoria={(sem) => { setSemCategoria(sem); if (sem) setCategoriaFiltro(null) }}
          diaEscolhido={modo === "dia" ? dia : null}
          aoSoltarDia={() => setModo("mes")}
          contas={contas}
          categorias={categorias}
          usoPorCategoria={usoPorCategoria}
          encontrados={
            carregando || !contagem || !totais
              ? null
              : {
                  lancamentos: tipo === "RECEITA" ? contagem.entradas : tipo === "DESPESA" ? contagem.saidas : contagem.entradas + contagem.saidas,
                  totalCentavos: tipo === "RECEITA" ? totais.receitasCentavos : tipo === "DESPESA" ? totais.despesasCentavos : null,
                }
          }
          aoLimpar={limparFiltros}
        >
          <label className={estilos.busca}>
            <Search aria-hidden className="size-4 shrink-0" />
            <span className="sr-only">Buscar lançamento</span>
            <input type="search" value={busca} onChange={(evento) => setBusca(evento.target.value)} placeholder="Buscar lançamento" />
          </label>
        </FiltrosDoExtrato>
      </div>

      <section className={cn("ficha", estilos.movimentos)} aria-label="Lançamentos">
        <p className="sr-only" role="status">
          {carregando ? "Atualizando…" : `${transacoes.length} movimentações`}
        </p>

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
            texto={filtrando ? "Tente outra busca ou limpe os filtros." : "Adicione um lançamento ou escolha outro mês."}
            acao={filtrando ? (
              <button type="button" className={CLASSE_BOTAO} onClick={limparFiltros}>
                Limpar filtros
              </button>
            ) : undefined}
          />
        )}

        <div className={estilos.lista}>
          {porDia(transacoes.filter((transacao) => !ocultos.has(transacao.id))).map((grupo) => (
            <section key={grupo.dia} className={estilos.grupoDia}>
              <h3>
                <span>{rotuloDia(grupo.dia)}</span>
                <b className={cn("numero valor-sensivel", grupo.totalCentavos > 0 && "text-positivo")}>
                  {grupo.totalCentavos < 0 ? "-" : "+"}{formatarMoeda(Math.abs(grupo.totalCentavos))}
                </b>
              </h3>
              <ul aria-label={`Lançamentos de ${rotuloDia(grupo.dia)}`} aria-busy={ocupado}>
                {grupo.itens.map((transacao) => {
                  const transferencia = transacao.tipo === "TRANSFERENCIA"
                  return (
                    <li key={transacao.id} className={estilos.linha}>
                      {/* A linha inteira abre a ficha (passo 57): antes o nome e o
                          valor se editavam tocando no texto, sem pista, e excluir
                          não existia. A seta no fim diz que dá para tocar. */}
                      <button type="button" className={estilos.abrir} onClick={() => setAberto(transacao)} aria-label={`Abrir ${transacao.descricao}, ${formatarMoeda(transacao.valorCentavos)}`}>
                        <span className={estilos.simbolo}>
                          <MarcaPersonalizada nome={transacao.descricao} original={textoDoBanco(transacao)} />
                          <SimboloCategoria categoria={transacao.categoria} tipo={transacao.tipo} />
                        </span>
                        <span className={estilos.texto}>
                          <span className={estilos.descricao}>{transacao.descricao}</span>
                          <span className={estilos.sub}>
                            <span>{nomeCurtoDaConta(transacao.conta.nome)}</span>
                            <span aria-hidden>·</span>
                            <span className={cn(!transacao.categoria && !transferencia && estilos.semCategoria)}>{transferencia ? "Transferência" : transacao.categoria?.nome ?? "sem categoria"}</span>
                          </span>
                        </span>
                        <span className={cn(estilos.valor, "numero valor-sensivel", transacao.tipo === "RECEITA" && "text-positivo", transferencia && "text-muted-fg")}>
                          {transferencia ? "" : transacao.tipo === "RECEITA" ? "+" : "-"}{formatarMoeda(transacao.valorCentavos)}
                        </span>
                        <ChevronRight aria-hidden className={estilos.seta} />
                      </button>
                      {salvando === transacao.id && <span role="status" className="sr-only">Salvando…</span>}
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>

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
      </section>

      <FichaLancamento
        lancamento={aberto}
        categorias={categorias}
        aoFechar={() => setAberto(null)}
        aoSalvar={salvarEdicao}
        aoExcluir={excluir}
        aoEscolherLoja={(lancamento) => { setAberto(null); setLojaDe(transacoes.find((t) => t.id === lancamento.id) ?? null) }}
      />
      <Dialog open={lojaDe !== null} onOpenChange={(aberto) => !aberto && setLojaDe(null)}>
        <DialogContent className={`sm:max-w-[560px] ${CLASSE_DIALOGO_LOJA}`}>
          <DialogHeader>
            <DialogTitle>Qual loja é esta?</DialogTitle>
            <DialogDescription>Escolha uma vez: as compras com o mesmo texto passam a sair com o logo.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            {lojaDe && <EscolherLoja descricao={lojaDe.descricao} original={textoDoBanco(lojaDe)} aoFechar={() => setLojaDe(null)} />}
          </DialogBody>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/// O texto como o banco escreveu, para achar a loja pelo intermediário
/// ("EBW*SPOTIFY"). Só de importação: no lançamento à mão o original é o que
/// a pessoa digitou, e na captura é o aviso inteiro do celular — onde o nome
/// do app do banco (Mercado Pago, PicPay) poria o logo errado na compra.
function textoDoBanco(transacao: Transacao) {
  return transacao.origem && transacao.origem !== "MANUAL" && transacao.origem !== "RECORRENCIA" ? transacao.descricaoOriginal : null
}

/// "R$ 8.600" e ",00" menor: três valores com centavos não cabem lado a lado
/// num celular de 360px, e cortar os centavos faria entrou menos saiu não
/// fechar com o sobrou.
function ValorComCentavos({ centavos }: { centavos: number }) {
  const texto = formatarMoeda(centavos)
  const corte = texto.lastIndexOf(",")
  if (corte < 0) return <>{texto}</>
  return (
    <>
      {texto.slice(0, corte)}
      <small>{texto.slice(corte)}</small>
    </>
  )
}
