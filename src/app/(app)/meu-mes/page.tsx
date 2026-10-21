"use client"

import { useCallback, useEffect, useState } from "react"
import { Check, Plus, Trash2, Zap } from "lucide-react"

import { buscar, enviar } from "@/lib/cliente"
import { formatarMoeda, paraCentavos } from "@/lib/dinheiro"
import { FIXO_REFERENCIA_BPS, sugestoesParaPreencher, type ResumoMeuMes } from "@/lib/meu-mes"
import { showToast } from "@/components/ui/toast"
import { fonteDisplay } from "@/app/(site)/tipografia"

import estilos from "./meu-mes.module.css"

interface Fixa {
  id: string
  descricao: string
  valorCentavos: number
  diaVencimento: number
  periodicidade: "MENSAL" | "BIMESTRAL" | "TRIMESTRAL" | "SEMESTRAL" | "ANUAL"
  contaId: string
  categoriaId: string | null
  valorVariavel: boolean
  pagoCentavos: number | null
}
interface Variavel { categoriaId: string; nome: string; limiteCentavos: number; gastoCentavos: number }
interface Dados {
  competencia: string
  fixas: Fixa[]
  variaveis: Variavel[]
  resumo: ResumoMeuMes
  categorias: { id: string; nome: string }[]
  contaPadraoId: string | null
}

/** Qual célula está aberta para digitar: só uma por vez, como numa planilha. */
type Editando = { linha: string; campo: "nome" | "valor" | "dia" } | null

const semCifrao = (centavos: number) => formatarMoeda(centavos, false)
const pct = (bps: number) => `${Math.round(bps / 100)}%`

/**
 * Meu mês (passo 59b, opção D, Davi, 19/10/2026): Orçamento e Contas fixas
 * viraram uma planilha só, custo fixo em cima e custo variável embaixo.
 *
 * A pessoa toca na célula e digita, sem formulário à parte; o "Preencher pelo
 * extrato" põe o limite do dia a dia pelo valor típico dos últimos 6 meses
 * (a mesma sugestão que o Orçamento já usava). Nada é inventado: categoria sem
 * histórico fica de fora, e conta fixa sem valor mostra "+ valor".
 */
export default function MeuMes() {
  const [dados, setDados] = useState<Dados | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [editando, setEditando] = useState<Editando>(null)
  const [texto, setTexto] = useState("")
  const [ocupado, setOcupado] = useState(false)
  const [nova, setNova] = useState<"fixo" | "variavel" | null>(null)

  const carregar = useCallback(async () => {
    try { setErro(null); setDados(await buscar<Dados>("/api/meu-mes")) }
    catch (falha) { setErro(falha instanceof Error ? falha.message : "Não consegui abrir o mês.") }
  }, [])
  useEffect(() => { void carregar() }, [carregar])

  function abrir(linha: string, campo: "nome" | "valor" | "dia", atual: string) {
    setEditando({ linha, campo }); setTexto(atual)
  }

  async function salvar(acao: () => Promise<unknown>, aviso?: string) {
    setOcupado(true)
    try { await acao(); if (aviso) showToast(aviso); setEditando(null); await carregar() }
    catch (falha) { showToast(falha instanceof Error ? falha.message : "Não consegui salvar.", { variant: "error" }) }
    finally { setOcupado(false) }
  }

  function salvarFixa(fixa: Fixa) {
    if (!editando) return
    const mudanca = editando.campo === "nome" ? { descricao: texto.trim() }
      : editando.campo === "valor" ? { valorCentavos: paraCentavos(texto || "0") }
      : { diaVencimento: Math.min(31, Math.max(1, Number(texto) || fixa.diaVencimento)) }
    if (editando.campo === "nome" && !texto.trim()) return setEditando(null)
    // A rota de contas fixas pede o registro inteiro: muda só a célula tocada.
    void salvar(() => enviar("/api/recorrencias", { ...fixa, tipo: "DESPESA", ...mudanca }, "PATCH"))
  }

  function salvarVariavel(linha: Variavel) {
    if (!editando || !dados) return
    if (editando.campo === "nome") {
      if (!texto.trim()) return setEditando(null)
      return void salvar(() => enviar(`/api/categorias/${linha.categoriaId}`, { nome: texto.trim() }, "PATCH"))
    }
    void salvar(() => enviar("/api/orcamento", { competencia: dados.competencia, linhas: [{ categoriaId: linha.categoriaId, limiteCentavos: paraCentavos(texto || "0") }] }, "PUT"))
  }

  async function preencher() {
    if (!dados) return
    setOcupado(true)
    try {
      const { sugestoes } = await enviar<{ sugestoes: { categoriaId: string; sugestaoCentavos: number }[] }>(`/api/orcamento?competencia=${dados.competencia}`, {}, "POST")
      const fixasCat = new Set(dados.fixas.map((f) => f.categoriaId).filter((id): id is string => Boolean(id)))
      const novas = sugestoesParaPreencher(sugestoes, new Set(dados.variaveis.map((v) => v.categoriaId)), fixasCat)
      if (novas.length === 0) { showToast("Nada novo para preencher", { description: "As categorias com gasto no extrato já têm limite." }); return }
      await enviar("/api/orcamento", { competencia: dados.competencia, linhas: novas.map((s) => ({ categoriaId: s.categoriaId, limiteCentavos: s.sugestaoCentavos })) }, "PUT")
      showToast(`${novas.length} ${novas.length === 1 ? "linha preenchida" : "linhas preenchidas"}`, { description: "Pelo valor típico dos últimos 6 meses do seu extrato. Toque para mudar." })
      await carregar()
    } catch (falha) {
      showToast(falha instanceof Error ? falha.message : "Não consegui preencher.", { variant: "error" })
    } finally { setOcupado(false) }
  }

  if (erro) return <p className={estilos.erro}>{erro}</p>
  if (!dados) return <p className={estilos.dica}>Abrindo o mês…</p>
  const { resumo } = dados

  const campoAberto = (linha: string, campo: "nome" | "valor" | "dia", aoSalvar: () => void, aoTirar?: () => void, modo: "text" | "decimal" | "numeric" = "text") =>
    editando?.linha === linha && editando.campo === campo ? (
      <span className={estilos.edicao}>
        <input autoFocus inputMode={modo} value={texto} disabled={ocupado} onChange={(e) => setTexto(e.target.value)} onBlur={aoSalvar}
          onKeyDown={(e) => { if (e.key === "Enter") aoSalvar(); if (e.key === "Escape") setEditando(null) }} aria-label="Novo valor" />
        {aoTirar && <button type="button" className={estilos.tirar} onMouseDown={(e) => e.preventDefault()} onClick={aoTirar} aria-label="Tirar da planilha"><Trash2 aria-hidden /></button>}
      </span>
    ) : null

  const totalPago = dados.fixas.reduce((s, f) => s + (f.pagoCentavos ?? 0), 0)
  const totalGasto = dados.variaveis.reduce((s, v) => s + v.gastoCentavos, 0)

  return (
    <div className={`${estilos.pagina} ${fonteDisplay.variable}`}>
      <div className={estilos.quadros}>
        <div className={estilos.quadro} style={{ "--cor": "var(--cor-fixo)" } as React.CSSProperties}><small><i />Custo fixo</small><b>{formatarMoeda(resumo.fixoCentavos)}</b></div>
        <div className={estilos.quadro} style={{ "--cor": "var(--cor-variavel)" } as React.CSSProperties}><small><i />Variável</small><b>{formatarMoeda(resumo.variavelCentavos)}</b></div>
        <div className={estilos.quadro} style={{ "--cor": "color-mix(in oklab, var(--foreground), transparent 70%)" } as React.CSSProperties}><small><i />Sobra</small>
          <b className={resumo.sobraCentavos !== null && resumo.sobraCentavos < 0 ? estilos.estouro : undefined}>{resumo.sobraCentavos === null ? "sem renda" : formatarMoeda(resumo.sobraCentavos)}</b></div>
      </div>
      {resumo.rendaCentavos !== null && resumo.fixoBps !== null && resumo.variavelBps !== null ? (
        <>
          <div className={estilos.barra} aria-hidden>
            <i style={{ flex: resumo.fixoBps, background: "var(--cor-fixo)" }} />
            <i style={{ flex: resumo.variavelBps, background: "var(--cor-variavel)" }} />
            <i style={{ flex: Math.max(0, 10_000 - resumo.fixoBps - resumo.variavelBps) }} />
          </div>
          <p className={estilos.referencia} data-alerta={resumo.fixoAcimaDaReferencia || undefined}>
            De {formatarMoeda(resumo.rendaCentavos)} de renda: fixo {pct(resumo.fixoBps)} · variável {pct(resumo.variavelBps)}. Referência: fixo até {pct(FIXO_REFERENCIA_BPS)} da renda.
          </p>
        </>
      ) : (
        <p className={estilos.referencia}>Sem renda cadastrada, o Tino não calcula a sobra. Cadastre a renda em Perfil para ver quanto do mês vai para o fixo (referência: até {pct(FIXO_REFERENCIA_BPS)}).</p>
      )}

      <div className={estilos.acoes}>
        <button type="button" className={estilos.botao} data-principal disabled={ocupado} onClick={() => void preencher()}><Zap aria-hidden />Preencher pelo extrato</button>
      </div>
      <p className={estilos.dica}>Toque numa célula para mudar o nome ou o valor. O preenchido vem do seu extrato (valor típico dos últimos 6 meses).</p>

      <div className={estilos.secoes}>
        <section className={estilos.secao} style={{ "--cor": "var(--cor-fixo)" } as React.CSSProperties}>
          <div className={estilos.titulo}><span><i /><h2>Custo fixo</h2><small>vence todo mês</small></span><b>{formatarMoeda(resumo.fixoCentavos)}</b></div>
          <div className={estilos.planilha} style={{ "--colunas": "minmax(0,1.6fr) minmax(52px,.5fr) minmax(0,1fr)" } as React.CSSProperties}>
            <div className={`${estilos.linha} ${estilos.cabecalho}`}><span>Conta</span><span>Dia</span><span>Previsto</span></div>
            {dados.fixas.map((fixa) => (
              <div key={fixa.id} className={estilos.linha}>
                <span>{campoAberto(fixa.id, "nome", () => salvarFixa(fixa), () => void salvar(() => enviar(`/api/recorrencias?id=${fixa.id}`, {}, "DELETE"), `${fixa.descricao} saiu do custo fixo`))
                  ?? <button type="button" className={estilos.celula} data-nome onClick={() => abrir(fixa.id, "nome", fixa.descricao)}>{fixa.descricao}{fixa.periodicidade !== "MENSAL" ? " (não mensal)" : ""}</button>}</span>
                <span>{campoAberto(fixa.id, "dia", () => salvarFixa(fixa), undefined, "numeric")
                  ?? <button type="button" className={`${estilos.celula} ${estilos.apagado} num`} onClick={() => abrir(fixa.id, "dia", String(fixa.diaVencimento))}>{fixa.diaVencimento}</button>}</span>
                <span>{campoAberto(fixa.id, "valor", () => salvarFixa(fixa), undefined, "decimal")
                  ?? <button type="button" className={`${estilos.celula} num`} onClick={() => abrir(fixa.id, "valor", fixa.valorCentavos ? semCifrao(fixa.valorCentavos) : "")}>
                    {fixa.valorCentavos ? semCifrao(fixa.valorCentavos) : <span className={estilos.vazio}>+ valor</span>}
                    {fixa.pagoCentavos !== null && <Check aria-label="pago" className={estilos.pago} style={{ width: 15, marginLeft: 6, verticalAlign: "-2px" }} />}
                  </button>}</span>
              </div>
            ))}
            {dados.fixas.length === 0 && <div className={estilos.linha}><span className={estilos.apagado}>Nenhuma ainda. <a href="/recorrencias">Começar pela lista pronta</a></span><span /><span /></div>}
            <div className={`${estilos.linha} ${estilos.total}`}><span>Total</span><span /><span className="num">{semCifrao(resumo.fixoCentavos)}</span></div>
          </div>
          {nova === "fixo" ? <NovaFixa contaId={dados.contaPadraoId} aoSalvar={(corpo) => salvar(() => enviar("/api/recorrencias", corpo), "Conta fixa adicionada").then(() => setNova(null))} aoCancelar={() => setNova(null)} />
            : <button type="button" className={estilos.nova} onClick={() => setNova("fixo")}><Plus aria-hidden />Nova conta fixa</button>}
          {totalPago > 0 && <p className={estilos.dica}>Já pago neste mês: {formatarMoeda(totalPago)} (as linhas com ✓).</p>}
        </section>

        <section className={estilos.secao} style={{ "--cor": "var(--cor-variavel)" } as React.CSSProperties}>
          <div className={estilos.titulo}><span><i /><h2>Custo variável</h2><small>limite do mês</small></span><b>{formatarMoeda(resumo.variavelCentavos)}</b></div>
          <div className={estilos.planilha} style={{ "--colunas": "minmax(0,1.5fr) minmax(0,1fr) minmax(0,1fr)" } as React.CSSProperties}>
            <div className={`${estilos.linha} ${estilos.cabecalho}`}><span>Gasto</span><span>Limite</span><span>Gastou</span></div>
            {dados.variaveis.map((linha) => (
              <div key={linha.categoriaId} className={estilos.linha}>
                <span>{campoAberto(linha.categoriaId, "nome", () => salvarVariavel(linha), () => void salvar(() => enviar(`/api/orcamento?competencia=${dados.competencia}&categoriaId=${linha.categoriaId}`, {}, "DELETE"), `${linha.nome} saiu do custo variável`))
                  ?? <button type="button" className={estilos.celula} data-nome onClick={() => abrir(linha.categoriaId, "nome", linha.nome)}>{linha.nome}</button>}</span>
                <span>{campoAberto(linha.categoriaId, "valor", () => salvarVariavel(linha), undefined, "decimal")
                  ?? <button type="button" className={`${estilos.celula} num`} onClick={() => abrir(linha.categoriaId, "valor", linha.limiteCentavos ? semCifrao(linha.limiteCentavos) : "")}>
                    {linha.limiteCentavos ? semCifrao(linha.limiteCentavos) : <span className={estilos.vazio}>+ valor</span>}</button>}</span>
                <span className={`num ${linha.gastoCentavos > linha.limiteCentavos ? estilos.estouro : estilos.apagado}`}>{semCifrao(linha.gastoCentavos)}</span>
              </div>
            ))}
            <div className={`${estilos.linha} ${estilos.total}`}><span>Total</span><span className="num">{semCifrao(resumo.variavelCentavos)}</span><span className="num">{semCifrao(totalGasto)}</span></div>
          </div>
          {nova === "variavel" ? <NovoVariavel categorias={dados.categorias} aoSalvar={(categoriaId, limiteCentavos) => salvar(() => enviar("/api/orcamento", { competencia: dados.competencia, linhas: [{ categoriaId, limiteCentavos }] }, "PUT"), "Gasto adicionado").then(() => setNova(null))} aoCancelar={() => setNova(null)} />
            : <button type="button" className={estilos.nova} onClick={() => setNova("variavel")}><Plus aria-hidden />Novo gasto variável</button>}
        </section>
      </div>
    </div>
  )
}

function NovaFixa({ contaId, aoSalvar, aoCancelar }: { contaId: string | null; aoSalvar: (corpo: object) => void; aoCancelar: () => void }) {
  const [nome, setNome] = useState("")
  const [valor, setValor] = useState("")
  const [dia, setDia] = useState("10")
  if (!contaId) return <p className={estilos.dica}>Cadastre uma conta em Ajustes, Bancos e contas, para lançar as contas fixas nela.</p>
  return (
    <form className={`${estilos.planilha} ${estilos.novaForm}`} onSubmit={(e) => { e.preventDefault(); if (nome.trim()) aoSalvar({ descricao: nome.trim(), valorCentavos: paraCentavos(valor || "0"), diaVencimento: Math.min(31, Math.max(1, Number(dia) || 10)), contaId }) }}>
      <input autoFocus placeholder="Nome (ex.: Aluguel)" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={120} aria-label="Nome" />
      <input inputMode="decimal" placeholder="Valor" value={valor} onChange={(e) => setValor(e.target.value)} aria-label="Valor" />
      <input inputMode="numeric" placeholder="Dia" value={dia} onChange={(e) => setDia(e.target.value)} aria-label="Dia do vencimento" />
      <button type="button" className={estilos.botao} onClick={aoCancelar}>Cancelar</button>
      <button type="submit" className={estilos.botao} data-principal>Adicionar</button>
    </form>
  )
}

function NovoVariavel({ categorias, aoSalvar, aoCancelar }: { categorias: { id: string; nome: string }[]; aoSalvar: (categoriaId: string, limiteCentavos: number) => void; aoCancelar: () => void }) {
  const [categoriaId, setCategoriaId] = useState(categorias[0]?.id ?? "")
  const [valor, setValor] = useState("")
  if (categorias.length === 0) return <p className={estilos.dica}>Todas as categorias de gasto já estão na planilha.</p>
  return (
    <form className={`${estilos.planilha} ${estilos.novaForm}`} onSubmit={(e) => { e.preventDefault(); if (categoriaId) aoSalvar(categoriaId, paraCentavos(valor || "0")) }}>
      <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} aria-label="Categoria">{categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select>
      <input autoFocus inputMode="decimal" placeholder="Limite do mês" value={valor} onChange={(e) => setValor(e.target.value)} aria-label="Limite" style={{ gridColumn: "1 / -1" }} />
      <button type="button" className={estilos.botao} onClick={aoCancelar}>Cancelar</button>
      <button type="submit" className={estilos.botao} data-principal>Adicionar</button>
    </form>
  )
}
