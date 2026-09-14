"use client"

import { useEffect, useState, type CSSProperties } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { enviar } from "@/lib/cliente"
import { formatarDecimal, formatarMoeda, paraCentavos } from "@/lib/dinheiro"
import { competenciaAtual, rotuloCompetencia } from "@/lib/datas"
import type { DadosCartao } from "@/lib/cartoes"
import estilos from "./central-cartoes.module.css"

export function ControleOrcamento({ nome, valor, maximo, aoMudar, apoio }: { nome: string; valor: number; maximo: number; aoMudar: (valor: number) => void; apoio?: string }) {
  const [texto, setTexto] = useState(formatarDecimal(valor / 100, 2))
  const [editando, setEditando] = useState(false)
  useEffect(() => { if (!editando) setTexto(formatarDecimal(valor / 100, 2)) }, [valor, editando])
  const teto = Math.max(maximo, valor, 10000)
  return <div className={estilos.slider}>
    <div className={estilos.rotuloSlider}><span><b>{nome}</b>{apoio && <small>{apoio}</small>}</span><label><span>R$</span><input aria-label={`Valor de ${nome}`} inputMode="decimal" value={texto} onFocus={() => setEditando(true)} onChange={e => setTexto(e.target.value)} onBlur={() => { aoMudar(Math.max(0, paraCentavos(texto))); setEditando(false) }} onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur() }} /></label></div>
    <input aria-label={`Ajustar ${nome}`} type="range" min={0} max={teto} step={100} value={valor} aria-valuetext={formatarMoeda(valor)} style={{ "--progresso": `${valor / teto * 100}%` } as CSSProperties} onChange={e => aoMudar(Number(e.target.value))} />
  </div>
}

export function OrcamentoDoCartao({ cartao, mes, categorias, gastos, aoSalvar }: { cartao: DadosCartao; mes: string; categorias: { id: string; nome: string }[]; gastos: { id: string; nome: string; totalCentavos: number }[]; aoSalvar: () => void }) {
  const existente = cartao.orcamentos?.find(plano => plano.competencia === mes)
  // O valor legado só inicializa o mês atual quando ainda não há planos mensais.
  const inicial = existente?.totalCentavos ?? (!cartao.orcamentos?.length && mes === competenciaAtual() ? cartao.orcamentoMensalCentavos ?? 0 : 0)
  const [total, setTotal] = useState(inicial)
  const [linhas, setLinhas] = useState<Record<string, number>>(Object.fromEntries(existente?.categorias.map(l => [l.categoriaId, l.limiteCentavos]) ?? []))
  const [nova, setNova] = useState("")
  const [erro, setErro] = useState("")
  const [estado, setEstado] = useState<"edicao" | "salvando" | "salvo">("edicao")
  const gastoTotal = gastos.reduce((s, l) => s + l.totalCentavos, 0)
  const distribuido = Object.values(linhas).reduce((s, v) => s + v, 0)
  const ativas = categorias.filter(c => c.id in linhas || gastos.some(g => g.id === c.id))
  const maximo = Math.max(10000, cartao.limiteCentavos ?? 0, gastoTotal * 2, total)
  function alterarTotal(valor: number) { setTotal(valor); setEstado("edicao") }
  function alterarCategoria(id: string, valor: number) { setLinhas(atual => ({ ...atual, [id]: valor })); setEstado("edicao") }
  async function salvar() {
    if (estado === "salvando") return
    if (distribuido > total) { setErro("Reduza as categorias ou aumente o total do mês."); return }
    setErro(""); setEstado("salvando")
    try {
      await enviar(`/api/cartoes/${cartao.id}/orcamento`, { competencia: mes, totalCentavos: total, categorias: Object.entries(linhas).map(([categoriaId, limiteCentavos]) => ({ categoriaId, limiteCentavos })) }, "PUT")
      setEstado("salvo"); aoSalvar()
    } catch (falha) { setErro(falha instanceof Error ? falha.message : "Não foi possível salvar."); setEstado("edicao") }
  }
  return <section className={estilos.painel}>
    <header className={estilos.cabecalho}><div><h2>Seu plano de gastos</h2><p>{rotuloCompetencia(mes)} · orçamento pessoal</p></div><span className={estilos.etiqueta}>{total ? `${Math.round(gastoTotal / total * 100)}% utilizado` : "Definir orçamento"}</span></header>
    <div className={estilos.resumoOrcamento}><div><small>Planejado</small><strong>{formatarMoeda(total)}</strong></div><div><small>Utilizado</small><strong>{formatarMoeda(gastoTotal)}</strong></div><div><small>{total && gastoTotal > total ? "Acima do plano" : "Disponível"}</small><strong>{total ? formatarMoeda(Math.abs(total - gastoTotal)) : "—"}</strong></div><div><small>A distribuir</small><strong>{formatarMoeda(total - distribuido)}</strong></div></div>
    <ControleOrcamento nome="Total do mês" valor={total} maximo={maximo} aoMudar={alterarTotal} apoio="Ajuste a barra ou digite o valor" />
    <div className={estilos.cabecalhoCategorias}><h3>Por categoria</h3><div className={estilos.adicionarCategoria}><select aria-label="Categoria para adicionar" value={nova} onChange={e => setNova(e.target.value)}><option value="">Escolher categoria</option>{categorias.filter(c => !ativas.some(a => a.id === c.id)).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select><Button variant="ghost" aria-label="Adicionar categoria" disabled={!nova} onClick={() => { alterarCategoria(nova, 0); setNova("") }}><Plus size={16} /></Button></div></div>
    <div className={estilos.orcamentoCategorias}>{ativas.map(c => <ControleOrcamento key={c.id} nome={c.nome} valor={linhas[c.id] ?? 0} maximo={Math.max(total, 10000)} aoMudar={valor => alterarCategoria(c.id, valor)} apoio={`${formatarMoeda(gastos.find(g => g.id === c.id)?.totalCentavos ?? 0)} utilizado`} />)}</div>
    {!ativas.length && <p className={estilos.legenda}>Adicione categorias para distribuir seu orçamento.</p>}
    {(erro || distribuido > total) && <p role="alert" className={estilos.erro}>{erro || `As categorias excedem o total em ${formatarMoeda(distribuido - total)}.`}</p>}
    <footer className={estilos.rodapeOrcamento}><span role="status">{estado === "salvo" ? "Orçamento salvo" : "O limite do banco não muda."}</span><Button disabled={estado === "salvando" || distribuido > total} onClick={() => void salvar()}>{estado === "salvando" ? "Salvando…" : "Salvar orçamento"}</Button></footer>
  </section>
}
