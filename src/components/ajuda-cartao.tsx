"use client"

import { useState, type CSSProperties } from "react"
import { ArrowRight, CircleDollarSign, ListChecks, PiggyBank } from "lucide-react"
import { Button } from "@/components/ui/button"
import { enviar } from "@/lib/cliente"
import estilos from "./ajuda-cartao.module.css"
import { resumoDoMes, type DadosCartao } from "@/lib/cartoes"
import { formatarMoeda } from "@/lib/dinheiro"

const PROGRAMAS = ["Manual", "Livelo", "Esfera", "Smiles", "LATAM Pass", "Azul Fidelidade"]

export function AjudaCartao({ cartao, mes, aoAbrir }: { cartao: DadosCartao; mes: string; aoAbrir: (aba: string) => void }) {
  const [objetivo, setObjetivo] = useState("economia")
  const [programa, setPrograma] = useState("Manual")
  const [moeda, setMoeda] = useState("real")
  const [taxa, setTaxa] = useState("")
  const [cambio, setCambio] = useState("")
  const [dataCambio, setDataCambio] = useState("")
  const [reducao, setReducao] = useState(10)
  const [categoriaId, setCategoriaId] = useState("")
  const [estado, setEstado] = useState("")
  const resumo = resumoDoMes(cartao, mes)
  const categoria = resumo.categorias.find(c => c.id === categoriaId) ?? resumo.categorias[0]
  const economia = Math.round((categoria?.totalCentavos ?? 0) * reducao / 100)
  const teto = (categoria?.totalCentavos ?? 0) - economia
  const taxaNumero = Number(taxa.replace(",", "."))
  const cambioNumero = Number(cambio.replace(",", "."))
  const baseReais = Math.max(0, resumo.gastos - resumo.creditos) / 100
  const pontosValidos = taxa.trim() !== "" && Number.isFinite(taxaNumero) && taxaNumero >= 0 && (moeda === "real" || (Number.isFinite(cambioNumero) && cambioNumero > 0 && dataCambio))
  const pontos = pontosValidos ? Math.floor((moeda === "real" ? baseReais : baseReais / cambioNumero) * taxaNumero) : null
  const semCategoria = resumo.compras.filter(c => !c.categoriaId).length

  async function aplicarTeto() {
    if (!categoria || categoria.id === "sem" || estado === "Salvando…") return
    setEstado("Salvando…")
    const plano = cartao.orcamentos?.find(p => p.competencia === mes)
    const categorias = [...(plano?.categorias ?? []).filter(c => c.categoriaId !== categoria.id), { categoriaId: categoria.id, limiteCentavos: teto }]
    const totalCentavos = Math.max(plano?.totalCentavos ?? resumo.gastos, categorias.reduce((s,c) => s + c.limiteCentavos, 0))
    try { await enviar(`/api/cartoes/${cartao.id}/orcamento`, { competencia: mes, totalCentavos, categorias }, "PUT"); setEstado("Teto salvo no orçamento deste mês.") }
    catch (erro) { setEstado(erro instanceof Error ? erro.message : "Não foi possível salvar. Tente novamente.") }
  }

  return <section className={estilos.painel}>
    <header><h2>Seu próximo passo</h2><p>Escolha um objetivo para este cartão.</p></header>
    <div className={estilos.objetivos}>
      {[{ id:"economia", nome:"Economizar", Icone:PiggyBank }, { id:"pontos", nome:"Pontos e milhas", Icone:CircleDollarSign }, { id:"fatura", nome:"Conferir fatura", Icone:ListChecks }].map(({id,nome,Icone}) => <button key={id} aria-pressed={objetivo === id} onClick={() => setObjetivo(id)}><Icone size={16}/>{nome}</button>)}
    </div>
    {objetivo === "economia" && <div className={estilos.resultado}>
      <div className={estilos.contexto}><small>Onde você quer reduzir?</small><select aria-label="Categoria para economizar" value={categoria?.id ?? ""} onChange={e => { setCategoriaId(e.target.value); setEstado("") }}>{resumo.categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select><p>{categoria ? `${formatarMoeda(categoria.totalCentavos)} registrado neste mês` : "Registre compras para definir seu plano."}</p><label className={estilos.reducao}>Redução desejada <b>{reducao}%</b><input aria-label="Percentual de redução" type="range" min={0} max={50} value={reducao} style={{"--progresso":`${reducao * 2}%`} as CSSProperties} onChange={e => {setReducao(Number(e.target.value));setEstado("")}} /></label></div>
      <div className={estilos.meta}><small>Economia possível</small><strong>{formatarMoeda(economia)}</strong><p>Teto proposto: {formatarMoeda(teto)}</p><Button disabled={!categoria || categoria.id === "sem" || estado === "Salvando…"} onClick={() => void aplicarTeto()}>Aplicar teto na categoria <ArrowRight size={15}/></Button><span role="status">{estado}</span><small>Compras já feitas não são alteradas.</small></div>
    </div>}
    {objetivo === "pontos" && <div className={estilos.resultado}>
      <div className={estilos.campos}><label>Programa<select value={programa} onChange={e => setPrograma(e.target.value)}>{PROGRAMAS.map(nome => <option key={nome}>{nome}</option>)}</select></label><label>Regra de acúmulo<select value={moeda} onChange={e => setMoeda(e.target.value)}><option value="real">Pontos por real</option><option value="dolar">Pontos por dólar</option></select></label><label>Pontos por {moeda === "real" ? "R$ 1" : "US$ 1"}<input inputMode="decimal" placeholder="Ex.: 2,2" value={taxa} onChange={e => setTaxa(e.target.value)} /></label>{moeda === "dolar" && <><label>Câmbio informado pelo emissor<input inputMode="decimal" placeholder="R$ por US$ 1" value={cambio} onChange={e => setCambio(e.target.value)} /></label><label>Data do câmbio<input type="date" value={dataCambio} onChange={e => setDataCambio(e.target.value)} /></label></>}</div>
      <div className={estilos.meta}><small>Estimativa manual · {programa}</small><strong>{pontos === null ? "—" : pontos.toLocaleString("pt-BR")}</strong><p>{pontos === null ? "Preencha a regra do seu cartão." : "pontos estimados"}</p><small>Base líquida: {formatarMoeda(Math.max(0,resumo.gastos-resumo.creditos))}.</small><details><summary>Como calculamos</summary><p>Compras menos créditos registrados. Elegibilidade individual não informada. Não representa o saldo real do programa.{moeda === "dolar" && ` Fonte do câmbio: emissor informado por você${dataCambio ? ` em ${dataCambio.split("-").reverse().join("/")}` : ""}.`}</p></details></div>
    </div>}
    {objetivo === "fatura" && <div className={estilos.resultado}>
      <div className={estilos.contexto}><small>Conferência de compras</small><h3>{semCategoria ? `${semCategoria} para categorizar` : "Categorias em dia"}</h3><progress aria-label="Compras categorizadas" max={Math.max(1,resumo.compras.length)} value={resumo.compras.length-semCategoria}/><p>{resumo.compras.length-semCategoria} de {resumo.compras.length} categorizadas</p><Button variant="outline" onClick={() => aoAbrir(semCategoria ? "compras" : "importar")}>{semCategoria ? "Revisar compras" : "Importar fatura para conferir"}<ArrowRight size={15}/></Button></div>
      <div className={estilos.meta}><small>Valor registrado</small><strong>{formatarMoeda(resumo.saldo)}</strong><p>{cartao.diaVencimento ? `Vence dia ${cartao.diaVencimento}` : "Vencimento não informado"}</p><small>{formatarMoeda(resumo.creditos)} em créditos · {formatarMoeda(resumo.previsto)} em parcelas previstas, separadamente.</small></div>
    </div>}
  </section>
}
