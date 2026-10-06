"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { BarChart3, Package, ShoppingBag, Wallet } from "lucide-react"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { buscar, enviar } from "@/lib/cliente"
import { formatarMoeda, paraCentavos } from "@/lib/dinheiro"
import { TrilhaLoja } from "@/components/trilha-loja"
import estilos from "./painel.module.css"

interface Resumo { brutoCentavos: number; vendas: number; unidades: number; ticketMedioCentavos: number | null; liquidoCentavos: number; taxasCentavos: number }
interface Painel { periodo: "mes" | "dia"; inicio: string; fim: string; inicioAnterior: string; fimAnterior: string; atual: Resumo; anterior: Resumo; serie: { rotulo: string; totalCentavos: number }[]; metaCentavos: number | null; metaRealizadoCentavos: number; produtos: { nome: string; unidades: number; totalCentavos: number }[]; formas: { forma: string; totalCentavos: number }[] }
const FORMAS: Record<string, string> = { DINHEIRO: "Dinheiro", PIX: "Pix", DEBITO: "Débito", CREDITO_VISTA: "Crédito", CREDITO_PARCELADO: "Parcelado", FIADO: "Fiado" }

function Metrica({ rotulo, valor, anterior, Icone }: { rotulo: string; valor: string; anterior: string; Icone: typeof ShoppingBag }) {
  return <article className={estilos.metrica}><Icone size={18} aria-hidden /><span>{rotulo}</span><strong>{valor}</strong><small>Antes: {anterior}</small></article>
}

export default function PainelDaLoja() {
  const [periodo, setPeriodo] = useState<"mes" | "dia">("mes")
  const [data, setData] = useState(() => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }))
  const [dados, setDados] = useState<Painel | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [cadastroPendente, setCadastroPendente] = useState(false)
  // Negócio sem área (criado antes do passo 38): pede para dizer o que faz.
  const [areaPendente, setAreaPendente] = useState(false)
  const [valorMeta, setValorMeta] = useState("")
  const [editandoMeta, setEditandoMeta] = useState(false)
  const [salvandoMeta, setSalvandoMeta] = useState(false)
  const carregar = useCallback(async () => {
    try { setErro(null); setDados(await buscar<Painel>(`/api/loja/painel?periodo=${periodo}&data=${data}`)) }
    catch (falha) { setErro(falha instanceof Error ? falha.message : "Não consegui abrir o painel.") }
  }, [periodo, data])
  useEffect(() => { void carregar() }, [carregar])
  useEffect(() => { void buscar<{perfil:{dadosConfirmadosEm:string|null}}>("/api/loja/cadastro").then((resposta)=>setCadastroPendente(!resposta.perfil.dadosConfirmadosEm)).catch(()=>{}) }, [])
  useEffect(() => { void buscar<{area:string|null}>("/api/loja/area").then((resposta)=>setAreaPendente(!resposta.area)).catch(()=>{}) }, [])
  async function salvarMeta(evento: React.FormEvent) {
    evento.preventDefault(); setSalvandoMeta(true)
    try { await enviar("/api/loja/meta", { competencia: data.slice(0, 7), valorCentavos: paraCentavos(valorMeta) }, "PUT"); setEditandoMeta(false); await carregar() }
    catch (falha) { setErro(falha instanceof Error ? falha.message : "Não consegui salvar a meta.") }
    finally { setSalvandoMeta(false) }
  }
  const grafico = dados?.serie.map((linha) => ({ ...linha, nome: periodo === "dia" ? `${linha.rotulo}h` : linha.rotulo.slice(8, 10) })) ?? []
  return <div className={estilos.pagina}>
    <TrilhaLoja pagina="Visão geral" />
    <div className={estilos.cabecalho}><div><h2>Seu negócio em números</h2><p>Vendas e resultados da sua loja.</p></div><div className={estilos.filtros}>
      <div role="group" aria-label="Período" className={estilos.abas}><button aria-pressed={periodo === "mes"} onClick={() => setPeriodo("mes")}>Mensal</button><button aria-pressed={periodo === "dia"} onClick={() => setPeriodo("dia")}>Diário</button></div>
      <input aria-label="Data de referência" type={periodo === "dia" ? "date" : "month"} value={periodo === "dia" ? data : data.slice(0, 7)} onChange={(evento) => setData(periodo === "dia" ? evento.target.value : `${evento.target.value}-01`)} />
    </div></div>
    {areaPendente && <aside className={estilos.aviso}><span><b>Diga o que você faz</b><small>Assistência, beleza, roupa, comida: o Tino se arruma para o seu negócio.</small></span><Link href="/loja/comecar">Escolher →</Link></aside>}
    {cadastroPendente && <aside className={estilos.aviso}><span><b>Confirme os dados da empresa</b><small>Razão social, CNPJ, atividade e contato, em um lugar só.</small></span><Link href="/loja/dados">Vamos lá →</Link></aside>}
    {erro && <p role="alert" className={estilos.erro}>{erro}</p>}
    {!dados && !erro && <p>Carregando o painel…</p>}
    {dados && <>
      <p className={estilos.periodo}>De {new Date(`${dados.inicio}T12:00:00Z`).toLocaleDateString("pt-BR")} a {new Date(`${dados.fim}T12:00:00Z`).toLocaleDateString("pt-BR")} · comparação com o período anterior equivalente</p>
      <div className={estilos.metricas}>
        <Metrica Icone={Wallet} rotulo="Vendido" valor={formatarMoeda(dados.atual.brutoCentavos)} anterior={formatarMoeda(dados.anterior.brutoCentavos)} />
        <Metrica Icone={ShoppingBag} rotulo="Vendas" valor={String(dados.atual.vendas)} anterior={String(dados.anterior.vendas)} />
        <Metrica Icone={Package} rotulo="Peças vendidas" valor={String(dados.atual.unidades)} anterior={String(dados.anterior.unidades)} />
        <Metrica Icone={BarChart3} rotulo="Ticket médio" valor={dados.atual.ticketMedioCentavos === null ? "Sem vendas" : formatarMoeda(dados.atual.ticketMedioCentavos)} anterior={dados.anterior.ticketMedioCentavos === null ? "Sem vendas" : formatarMoeda(dados.anterior.ticketMedioCentavos)} />
      </div>
      <section className={`${estilos.bloco} ${estilos.metaCompacta}`}><div className={estilos.metaConteudo}>
        <div className={estilos.metaTexto}><h3>Meta do mês</h3>{dados.metaCentavos ? <><p className={estilos.metaNumero}>{formatarMoeda(dados.metaRealizadoCentavos)} <span>de {formatarMoeda(dados.metaCentavos)}</span></p><progress className={estilos.progresso} max={dados.metaCentavos} value={Math.min(dados.metaRealizadoCentavos,dados.metaCentavos)} /><p className={estilos.periodo}>{Math.round(dados.metaRealizadoCentavos / dados.metaCentavos * 100)}% da meta do mês.</p></> : <p className={estilos.vazio}>Defina quanto deseja vender neste mês.</p>}</div>
          {editandoMeta ? <form onSubmit={salvarMeta} className={estilos.metaForm}><label>Meta de vendas (R$)<input required inputMode="decimal" value={valorMeta} onChange={(e)=>setValorMeta(e.target.value)} placeholder="Ex.: 5.000,00" /></label><button disabled={salvandoMeta}>Salvar meta</button></form> : <button className={estilos.link} onClick={()=>{setValorMeta(dados.metaCentavos ? formatarMoeda(dados.metaCentavos,false) : "");setEditandoMeta(true)}}>{dados.metaCentavos ? "Alterar meta" : "Criar meta"}</button>}</div></section>
      <div className={estilos.dois}>
        <section className={estilos.bloco}><div className={estilos.titulo}><h3>Vendas por {periodo === "dia" ? "hora" : "dia"}</h3><span>{formatarMoeda(dados.atual.brutoCentavos)}</span></div>
          {dados.atual.vendas ? <div className={estilos.grafico}><ResponsiveContainer width="100%" height="100%"><AreaChart data={grafico} margin={{top:12,right:8,left:-22,bottom:0}}><defs><linearGradient id="area-painel-loja" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="currentColor" stopOpacity={0.28}/><stop offset="100%" stopColor="currentColor" stopOpacity={0}/></linearGradient></defs><CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.09}/><XAxis dataKey="nome" tickLine={false} axisLine={false} minTickGap={20}/><YAxis tickLine={false} axisLine={false} tickFormatter={(valor:number)=>formatarMoeda(valor,false)}/><Tooltip formatter={(valor)=>formatarMoeda(Number(valor))} labelFormatter={(rotulo)=>periodo === "dia" ? `${rotulo}` : `Dia ${rotulo}`} /><Area type="monotone" dataKey="totalCentavos" name="Vendas" stroke="currentColor" strokeWidth={2} fill="url(#area-painel-loja)" /></AreaChart></ResponsiveContainer></div> : <p className={estilos.vazio}>Sem vendas neste período. Quando registrar a primeira, o gráfico aparece aqui.</p>}
        </section>
        <section className={estilos.bloco}><h3>Mais vendidos</h3>{dados.produtos.length ? <ol className={estilos.lista}>{dados.produtos.map((produto) => <li key={produto.nome}><span>{produto.nome}<small>{produto.unidades} {produto.unidades === 1 ? "peça" : "peças"}</small></span><b>{formatarMoeda(produto.totalCentavos)}</b></li>)}</ol> : <div className={estilos.vazio}><p>Sem produtos vendidos neste período.</p><Link href="/loja/estoque">Ver prateleira</Link></div>}</section>
        <section className={estilos.bloco}><h3>Como recebeu</h3>{dados.formas.length ? <div className={estilos.lista}>{dados.formas.map((forma) => <div key={forma.forma}><span>{FORMAS[forma.forma] ?? forma.forma}</span><b>{formatarMoeda(forma.totalCentavos)}</b></div>)}</div> : <p className={estilos.vazio}>As formas de pagamento aparecem após uma venda.</p>}</section>
        <section className={estilos.bloco}><h3>O que virou receita</h3><div className={estilos.lista}><div><span>Vendido</span><b>{formatarMoeda(dados.atual.brutoCentavos)}</b></div><div><span>Taxas da maquininha</span><b>−{formatarMoeda(dados.atual.taxasCentavos)}</b></div><div><span>Depois das taxas</span><b>{formatarMoeda(dados.atual.liquidoCentavos)}</b></div></div><Link className={estilos.link} href="/loja/financas">Ver lucro, custos e contas →</Link></section>
      </div>
    </>}
  </div>
}
