"use client"

import { CompromissosMetas } from "@/components/compromissos-metas"
import { useCallback, useEffect, useState } from "react"
import { Check, Plus, Trash2 } from "lucide-react"

import { buscar, enviar } from "@/lib/cliente"
import { formatarDecimal, formatarMoeda, formatarPercentual, paraCentavos } from "@/lib/dinheiro"
import { REFERENCIA_CUSTO_FIXO } from "@/lib/tino/diagnostico"
import { showToast } from "@/components/ui/toast"
import { MarcaPersonalizada } from "@/components/identidades-visuais"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { SelectNative } from "@/components/ui/select-native"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import estilos from "./recorrencias.module.css"

/**
 * Contas fixas (Davi, 27/09: opção A do canvas com o texto da B nas linhas —
 * "em 9 dias" em vez da categoria sozinha).
 *
 * É a tela que faz a projeção valer alguma coisa: sem saber o que sai todo mês
 * de qualquer jeito, o app só sabe olhar para trás. Aluguel, luz, assinatura e
 * salário entram aqui uma vez e alimentam projeção, reserva e plano.
 *
 * O resumo diz quanto da renda as contas levam, com a faixa do app; a lista,
 * por vencimento, diz qual é a próxima e em quantos dias.
 * Antes o custo fixo aparecia duas vezes antes da lista, e no celular cada
 * linha espremia o nome até "Plan…" para caber Lançar e lixeira.
 */

interface Recorrencia {
  id: string
  descricao: string
  valorCentavos: number
  tipo: "RECEITA" | "DESPESA"
  periodicidade: string
  diaVencimento: number
  proximaData: string
  valorVariavel: boolean
  ativa: boolean
  contaId: string
  categoriaId: string | null
  conta: { nome: string }
  categoria: { nome: string; grupo?: string | null } | null
}

interface Resposta {
  recorrencias: Recorrencia[]
  custoFixoMensalCentavos: number
  receitaFixaMensalCentavos: number
}

const PERIODOS = [
  { valor: "MENSAL", rotulo: "todo mês" },
  { valor: "BIMESTRAL", rotulo: "a cada 2 meses" },
  { valor: "TRIMESTRAL", rotulo: "a cada 3 meses" },
  { valor: "SEMESTRAL", rotulo: "a cada 6 meses" },
  { valor: "ANUAL", rotulo: "uma vez por ano" },
]
const MES_CURTO = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]

const VAZIO = {
  id: "",
  descricao: "",
  valor: "",
  tipo: "DESPESA" as "RECEITA" | "DESPESA",
  periodicidade: "MENSAL",
  dia: "10",
  contaId: "",
  categoriaId: "",
  variavel: false,
}
type Formulario = typeof VAZIO

const semCentavosZerados = (centavos: number) => formatarMoeda(centavos).replace(/,00$/, "")
/// "AAAA-MM-DD" de hoje no fuso do Brasil: à meia-noite em UTC ainda é ontem
/// aqui, e a conta de amanhã apareceria como "hoje".
const hojeIso = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" })
const diasAte = (iso: string) => Math.round((Date.parse(`${iso.slice(0, 10)}T00:00:00Z`) - Date.parse(`${hojeIso()}T00:00:00Z`)) / 86_400_000)
const dataCurta = (iso: string) => `${Number(iso.slice(8, 10))} ${MES_CURTO[Number(iso.slice(5, 7)) - 1]}`
function quando(iso: string) {
  const dias = diasAte(iso)
  if (dias < 0) return { texto: dias === -1 ? "venceu ontem" : `venceu há ${-dias} dias`, atrasada: true }
  if (dias === 0) return { texto: "vence hoje", atrasada: false }
  return { texto: dias === 1 ? "amanhã" : `em ${dias} dias`, atrasada: false }
}

export default function Recorrencias() {
  const [dados, setDados] = useState<Resposta | null>(null)
  const [contas, setContas] = useState<{ id: string; nome: string }[]>([])
  const [categorias, setCategorias] = useState<{ id: string; nome: string }[]>([])
  const [form, setForm] = useState<Formulario | null>(null)
  const [lado, setLado] = useState<"DESPESA" | "RECEITA">("DESPESA")
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState("")
  const [erroFormulario, setErroFormulario] = useState("")

  const carregar = useCallback(async () => {
    const [resposta, listaContas, listaCategorias] = await Promise.all([
      buscar<Resposta>("/api/recorrencias"),
      buscar<{ id: string; nome: string }[]>("/api/contas"),
      buscar<{ id: string; nome: string }[]>("/api/categorias"),
    ])
    setDados(resposta)
    setContas(listaContas)
    setCategorias(listaCategorias)
  }, [])

  useEffect(() => {
    carregar().catch((erro: unknown) => setErro(erro instanceof Error ? erro.message : "Não foi possível carregar as contas."))
  }, [carregar])

  function abrirNova() {
    setErroFormulario("")
    setForm({ ...VAZIO, tipo: lado, contaId: contas[0]?.id ?? "" })
  }
  function abrirEdicao(recorrencia: Recorrencia) {
    setErroFormulario("")
    setForm({
      id: recorrencia.id,
      descricao: recorrencia.descricao,
      valor: formatarDecimal(recorrencia.valorCentavos / 100, 2),
      tipo: recorrencia.tipo,
      periodicidade: recorrencia.periodicidade,
      dia: String(recorrencia.diaVencimento),
      contaId: recorrencia.contaId,
      categoriaId: recorrencia.categoriaId ?? "",
      variavel: recorrencia.valorVariavel,
    })
  }

  async function salvar(evento: React.FormEvent) {
    evento.preventDefault()
    if (ocupado || !form) return
    setErroFormulario("")
    setOcupado(true)
    try {
      const corpo = {
        descricao: form.descricao,
        valorCentavos: paraCentavos(form.valor),
        tipo: form.tipo,
        periodicidade: form.periodicidade,
        diaVencimento: Number(form.dia) || 10,
        contaId: form.contaId,
        categoriaId: form.categoriaId || undefined,
        valorVariavel: form.variavel,
      }
      if (form.id) await enviar("/api/recorrencias", { id: form.id, ...corpo }, "PATCH")
      else await enviar("/api/recorrencias", corpo)
      setForm(null)
      await carregar()
    } catch (erro) {
      setErroFormulario(erro instanceof Error ? erro.message : "Não foi possível salvar. Tente novamente.")
    } finally {
      setOcupado(false)
    }
  }

  /** Lança a ocorrência do período. Idempotente: dois cliques não geram duas contas. */
  async function lancar(recorrencia: Recorrencia) {
    if (ocupado) return
    setOcupado(true)
    try {
      await enviar("/api/recorrencias", { id: recorrencia.id }, "PUT")
      showToast(`${recorrencia.descricao} lançada no extrato`, { description: `${formatarMoeda(recorrencia.valorCentavos)} · ${dataCurta(recorrencia.proximaData)}` })
      await carregar()
    } catch (erro) {
      showToast("Não foi possível concluir", { description: erro instanceof Error ? erro.message : "Tente novamente.", variant: "error" })
    } finally {
      setOcupado(false)
    }
  }

  /**
   * "Desfazer em vez de confirmar" — item 4 do redesign de 07/09/2026. A
   * linha some na hora, e o DELETE de verdade só sai do navegador depois de
   * 5s sem ninguém desfazer. Remover mora dentro da edição desde 27/09: a
   * lixeira em cada linha tirava o espaço do nome.
   */
  function remover(recorrencia: Recorrencia) {
    if (!dados) return
    const idAlvo = recorrencia.id
    setForm(null)
    setDados({ ...dados, recorrencias: dados.recorrencias.filter((r) => r.id !== idAlvo) })

    let desfeito = false
    showToast(`"${recorrencia.descricao}" removida`, {
      action: {
        label: "Desfazer",
        onClick: () => {
          desfeito = true
          setDados((atual) =>
            atual && !atual.recorrencias.some((r) => r.id === idAlvo)
              ? { ...atual, recorrencias: [...atual.recorrencias, recorrencia] }
              : atual,
          )
        },
      },
    })

    setTimeout(async () => {
      if (desfeito) return
      try {
        await buscar(`/api/recorrencias?id=${idAlvo}`, { method: "DELETE" })
        await carregar()
      } catch (erro) {
        setDados((atual) => atual && !atual.recorrencias.some((r) => r.id === idAlvo) ? { ...atual, recorrencias: [...atual.recorrencias, recorrencia] } : atual)
        showToast("Não foi possível remover a conta", { description: erro instanceof Error ? erro.message : "Tente novamente.", variant: "error" })
      }
    }, 5000)
  }

  if (!dados) return <section className={estilos.bloco}>
    {erro ? <div role="alert"><p className={estilos.apoio}>{erro}</p><button className={estilos.tentar} onClick={() => { setErro(""); carregar().catch((erro: unknown) => setErro(erro instanceof Error ? erro.message : "Não foi possível carregar as contas.")) }}>Tentar novamente</button></div> : <p role="status" className={estilos.apoio}>Carregando suas contas…</p>}
  </section>

  const ativas = dados.recorrencias.filter((linha) => linha.ativa)
  const despesas = ativas.filter((linha) => linha.tipo === "DESPESA")
  const receitas = ativas.filter((linha) => linha.tipo === "RECEITA")
  const lista = (lado === "DESPESA" ? despesas : receitas).slice().sort((a, b) => a.proximaData.localeCompare(b.proximaData))
  const sai = dados.custoFixoMensalCentavos
  const entra = dados.receitaFixaMensalCentavos
  // Custo fixo sobre renda fixa, na régua do diagnóstico: duas réguas para o
  // mesmo número fariam uma tela dizer "bom" e a outra "atenção".
  const pesoBps = entra > 0 ? Math.round((sai / entra) * 10_000) : null
  const faixa = pesoBps === null ? null : pesoBps <= REFERENCIA_CUSTO_FIXO.bom ? "bom" : pesoBps <= REFERENCIA_CUSTO_FIXO.atencao ? "atencao" : "alto"
  const recorrenciaEditada = form?.id ? dados.recorrencias.find((linha) => linha.id === form.id) : undefined

  return (
    <div className={estilos.pagina}>
      <div className={estilos.corpo}>
        <section className={estilos.bloco}>
          <header className={estilos.cabecalho}><p className={estilos.rotulo}>Todo mês</p><button type="button" onClick={abrirNova}><Plus aria-hidden />Nova conta</button></header>
          <dl className={estilos.tres}>
            <div><dt>Sai</dt><dd className="valor-sensivel">{semCentavosZerados(sai)}</dd></div>
            <div><dt>Entra</dt><dd className="valor-sensivel">{semCentavosZerados(entra)}</dd></div>
            <div><dt>Sobra</dt><dd className="valor-sensivel" data-tom={entra - sai >= 0 ? "bom" : "alto"}>{semCentavosZerados(entra - sai)}</dd></div>
          </dl>
          {pesoBps !== null ? (
            <div className={estilos.peso} data-faixa={faixa}>
              <p><span>Da renda fixa</span><span><b>{formatarPercentual(pesoBps, 0)}</b> · bom até {formatarPercentual(REFERENCIA_CUSTO_FIXO.bom, 0)}</span></p>
              <span className={estilos.regua} role="img" aria-label={`Contas fixas levam ${formatarPercentual(pesoBps, 0)} da renda fixa; bom até ${formatarPercentual(REFERENCIA_CUSTO_FIXO.bom, 0)}, atenção até ${formatarPercentual(REFERENCIA_CUSTO_FIXO.atencao, 0)}`}>
                <i style={{ width: `${Math.min(100, pesoBps / 100)}%` }} />
                <em style={{ left: `${REFERENCIA_CUSTO_FIXO.bom / 100}%` }} />
                <em data-atencao style={{ left: `${REFERENCIA_CUSTO_FIXO.atencao / 100}%` }} />
              </span>
            </div>
          ) : (
            // Sem renda fixa não há percentual: dizer quanto da renda as contas
            // levam exigiria inventar a renda.
            <p className={estilos.apoio}>Cadastre sua renda fixa (salário, pró-labore) em <b>Entradas</b> para ver quanto dela as contas levam.</p>
          )}
        </section>

        <div className={estilos.coluna}>
          <div className={estilos.segmento} role="radiogroup" aria-label="Saídas ou entradas">
            <button type="button" role="radio" aria-checked={lado === "DESPESA"} onClick={() => setLado("DESPESA")}>Saídas · {despesas.length}</button>
            <button type="button" role="radio" aria-checked={lado === "RECEITA"} onClick={() => setLado("RECEITA")}>Entradas · {receitas.length}</button>
          </div>
          {lista.length === 0 ? (
            <div className={estilos.vazio}>
              <p>{lado === "DESPESA" ? "Nenhuma conta que sai todo mês." : "Nenhuma entrada fixa. Salário e pró-labore entram aqui."}</p>
              <button type="button" onClick={abrirNova}><Plus aria-hidden />{lado === "DESPESA" ? "Nova conta" : "Nova entrada"}</button>
            </div>
          ) : (
            <section className={estilos.bloco} data-lista>
              <ul>
                {lista.map((recorrencia) => {
                  const prazo = quando(recorrencia.proximaData)
                  const periodo = recorrencia.periodicidade === "MENSAL" ? "" : ` · ${PERIODOS.find((p) => p.valor === recorrencia.periodicidade)?.rotulo}`
                  return <li key={recorrencia.id}>
                    <button type="button" className={estilos.linha} onClick={() => abrirEdicao(recorrencia)} aria-label={`Editar ${recorrencia.descricao}`}>
                      {/* A data num bloco, como na opção A; o "em 9 dias" é o
                          texto da B, que diz o prazo sem fazer conta. */}
                      <span className={estilos.data} data-atrasada={prazo.atrasada || undefined}><b>{Number(recorrencia.proximaData.slice(8, 10))}</b><small>{MES_CURTO[Number(recorrencia.proximaData.slice(5, 7)) - 1]}</small></span>
                      <span className={estilos.texto}>
                        {/* Logo da marca ao lado do nome (Netflix, Enel, Unimed): a
                            conta se acha pela cor antes de ler. Sem marca
                            conhecida, fica só o nome. */}
                        <span className={estilos.nomeComLogo}><MarcaPersonalizada nome={recorrencia.descricao} /><strong>{recorrencia.descricao}</strong></span>
                        <small data-atrasada={prazo.atrasada || undefined}>{prazo.texto}{periodo}{recorrencia.valorVariavel ? " · valor variável" : ""}{recorrencia.categoria ? ` · ${recorrencia.categoria.nome}` : ""}</small>
                      </span>
                      <b className="valor-sensivel">{semCentavosZerados(recorrencia.valorCentavos)}</b>
                    </button>
                    <button type="button" className={estilos.lancar} onClick={() => void lancar(recorrencia)} disabled={ocupado} aria-label={`Lançar ${recorrencia.descricao} de ${dataCurta(recorrencia.proximaData)} no extrato`} title="Lançar no extrato"><Check aria-hidden /></button>
                  </li>
                })}
              </ul>
            </section>
          )}
        </div>
      </div>

      <CompromissosMetas />

      <Dialog open={form !== null} onOpenChange={(aberto) => { if (!ocupado && !aberto) setForm(null) }}>
        <DialogContent className={estilos.dialogo}>
          <DialogHeader>
            <DialogTitle>{form?.id ? "Editar conta fixa" : form?.tipo === "RECEITA" ? "Nova entrada fixa" : "Nova conta fixa"}</DialogTitle>
            <DialogDescription>{form?.id ? "Muda as próximas; o que já foi lançado no extrato fica como está." : "Entra uma vez e alimenta projeção, reserva e plano."}</DialogDescription>
          </DialogHeader>
          {form && <form onSubmit={salvar} className={estilos.formulario}>
            <label>Descrição<Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="aluguel, luz, salário" required /></label>
            <label>Valor (R$)<Input value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} placeholder="0,00" required inputMode="decimal" /></label>
            <label>Entrada ou saída<SelectNative value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as "RECEITA" | "DESPESA" })}><option value="DESPESA">sai da conta</option><option value="RECEITA">entra na conta</option></SelectNative></label>
            <label>Dia do vencimento<Input value={form.dia} onChange={(e) => setForm({ ...form, dia: e.target.value })} inputMode="numeric" /></label>
            <label>Repete<SelectNative value={form.periodicidade} onChange={(e) => setForm({ ...form, periodicidade: e.target.value })}>{PERIODOS.map((periodo) => <option key={periodo.valor} value={periodo.valor}>{periodo.rotulo}</option>)}</SelectNative></label>
            <label>Conta<SelectNative value={form.contaId} onChange={(e) => setForm({ ...form, contaId: e.target.value })}>{contas.map((conta) => <option key={conta.id} value={conta.id}>{conta.nome}</option>)}</SelectNative></label>
            <label data-largo>Categoria<SelectNative value={form.categoriaId} onChange={(e) => setForm({ ...form, categoriaId: e.target.value })}><option value="">sem categoria</option>{categorias.map((categoria) => <option key={categoria.id} value={categoria.id}>{categoria.nome}</option>)}</SelectNative></label>
            {contas.length === 0 && <p role="status" data-largo>Cadastre uma conta em <a href="/configuracoes">Configurações</a> antes de adicionar uma conta fixa.</p>}
            <label data-largo className={estilos.interruptor}>
              <span>O valor muda todo mês (luz, água)<small>a projeção usa o último valor lançado</small></span>
              <Switch checked={form.variavel} onCheckedChange={(variavel) => setForm({ ...form, variavel })} aria-label="O valor muda todo mês" />
            </label>
            {erroFormulario && <p role="alert" data-largo data-erro>{erroFormulario}</p>}
            <button className={estilos.salvar} disabled={ocupado || !form.contaId} data-largo>{ocupado ? "Salvando…" : form.id ? "Salvar" : "Adicionar"}</button>
            {recorrenciaEditada && <button type="button" className={estilos.remover} data-largo onClick={() => remover(recorrenciaEditada)}><Trash2 aria-hidden />Remover conta fixa</button>}
          </form>}
        </DialogContent>
      </Dialog>
    </div>
  )
}
