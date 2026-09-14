"use client"

import Link from "next/link"
import { useEffect, useState, type CSSProperties } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight, CreditCard, Pencil, Plus, Trash2, Upload } from "lucide-react"

import estilos from "./central-cartoes.module.css"
import { OrcamentoDoCartao } from "./orcamento-cartao"
import { MarcaPersonalizada } from "@/components/identidades-visuais"
import { IdentidadeBanco } from "@/components/banco-perfil"
import { AjudaCartao } from "@/components/ajuda-cartao"
import { CompraCartaoForm } from "@/components/compra-cartao-form"
import { Importador } from "@/components/importador"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { enviar } from "@/lib/cliente"
import { mesesDoCartao, resumoDoMes, type CompraCartao, type CompraParcelada, type DadosCartao } from "@/lib/cartoes"
import { rotuloCompetencia } from "@/lib/datas"
import { formatarMoeda } from "@/lib/dinheiro"
import { corDoBanco } from "@/lib/bancos-perfil"

const CORES = ["#34c759", "#5ac8fa", "#af52de", "#ff9f0a", "#ff375f", "#8e8e93"]

export function CentralCartoes({ cartoes, categorias, mesAtual }: { cartoes: DadosCartao[]; categorias: { id: string; nome: string }[]; mesAtual: string }) {
  const router = useRouter()
  const [id, setId] = useState(cartoes[0]?.id ?? "")
  const [mes, setMes] = useState(mesAtual)
  const [categoria, setCategoria] = useState("")
  const [busca, setBusca] = useState("")
  const [aba, setAba] = useState("compras")
  const [form, setForm] = useState<{ compra?: CompraCartao; parcelamento?: CompraParcelada } | null>(null)
  const [excluir, setExcluir] = useState<{ id: string; nome: string; tipo: "transacoes" | "parcelamentos" } | null>(null)
  const [erro, setErro] = useState("")
  const [ocupado, setOcupado] = useState(false)
  const cartao = cartoes.find((linha) => linha.id === id) ?? cartoes[0]

  useEffect(() => {
    const parametros = new URLSearchParams(window.location.search)
    if (parametros.get("aba") === "parcelas") setAba("parcelas")
    const selecionado = parametros.get("contaId")
    if (selecionado) setId(selecionado)
  }, [])

  if (!cartao) return <div className={estilos.vazio}><p>Adicione seu primeiro cartão.</p><Button asChild><Link href="/configuracoes">Cadastrar cartão</Link></Button></div>

  const resumo = resumoDoMes(cartao, mes)
  const meses = mesesDoCartao(cartao, mesAtual)
  const indiceMes = Math.max(0, meses.indexOf(mes))
  const inicio = Math.max(0, Math.min(indiceMes - 2, meses.length - 6))
  const mesesVisiveis = meses.slice(inicio, inicio + 6)
  const barras = mesesVisiveis.map((competencia) => ({ competencia, ...resumoDoMes(cartao, competencia) }))
  const maximo = Math.max(1, ...barras.map((barra) => Math.max(barra.gastos, barra.previsto)))
  const compras = resumo.compras
    .filter((compra) => (!categoria || (compra.categoriaId ?? "sem") === categoria) && compra.descricao.toLocaleLowerCase("pt-BR").includes(busca.toLocaleLowerCase("pt-BR")))
    .sort((a, b) => b.data.localeCompare(a.data))

  async function remover() {
    if (!excluir) return
    setOcupado(true); setErro("")
    try { await enviar(`/api/${excluir.tipo}/${excluir.id}`, {}, "DELETE"); setExcluir(null); router.refresh() }
    catch (falha) { setErro(falha instanceof Error ? falha.message : "Não foi possível excluir.") }
    finally { setOcupado(false) }
  }

  return <div className={estilos.pagina}>
    <section className={estilos.topo}>
      <div className={estilos.carteira} aria-label="Seus cartões">
        {cartoes.map((linha, indice) => <button
          key={linha.id}
          type="button"
          aria-pressed={linha.id === cartao.id}
          className={estilos.cartaoFisico}
          style={{ "--cor-banco": corDoBanco(linha.instituicao), "--indice": indice } as CSSProperties}
          onClick={() => { setId(linha.id); setMes(mesAtual); setCategoria(""); setBusca("") }}
        >
          <span className={estilos.marca}><small>{linha.instituicao ?? "Cartão"}</small><IdentidadeBanco instituicao={linha.instituicao ?? ""} nome={linha.nome} /></span>
          <strong>{linha.nome}</strong>
          <span className={estilos.final}>Vence {linha.diaVencimento ? `dia ${linha.diaVencimento}` : "não informado"}</span>
        </button>)}
      </div>

      <div className={estilos.detalhes}>
        <div className={estilos.resumoCartao}>
          <div><p className={estilos.sobretitulo}>{cartao.instituicao ?? "Cartão selecionado"}</p><h1>{cartao.nome}</h1></div>
          <div><small>Fatura de {rotuloCompetencia(mes, true)}</small><strong>{formatarMoeda(resumo.saldo)}</strong></div>
          <dl><div><dt>Fecha</dt><dd>{cartao.diaFechamento ? `dia ${cartao.diaFechamento}` : "Não informado"}</dd></div><div><dt>Vence</dt><dd>{cartao.diaVencimento ? `dia ${cartao.diaVencimento}` : "Não informado"}</dd></div><div><dt>Limite bancário</dt><dd>{cartao.limiteCentavos ? formatarMoeda(cartao.limiteCentavos) : "Não informado"}</dd></div></dl>
        </div>
        <div className={estilos.faturas}>
          <header><div><p className={estilos.sobretitulo}>Confirmado e previsto</p><h2>Faturas por mês</h2></div><div><button aria-label="Meses anteriores" disabled={inicio === 0} onClick={() => setMes(meses[Math.max(0, inicio - 1)])}><ChevronLeft /></button><button aria-label="Próximos meses" disabled={inicio + 6 >= meses.length} onClick={() => setMes(meses[Math.min(meses.length - 1, inicio + 6)])}><ChevronRight /></button></div></header>
          <div className={estilos.barras}>{barras.map((barra) => <button key={barra.competencia} aria-pressed={mes === barra.competencia} onClick={() => { setMes(barra.competencia); setCategoria("") }}>
            <span className={estilos.colunas}><i style={{ height: `${Math.max(4, barra.gastos / maximo * 100)}%` }} /><i style={{ height: `${Math.max(4, barra.previsto / maximo * 100)}%` }} /></span>
            <small>{rotuloCompetencia(barra.competencia, true)}</small><b>{mes === barra.competencia ? formatarMoeda(barra.saldo) : ""}</b>
          </button>)}</div>
          <p className={estilos.legenda}><span />Confirmado <span />Parcelas previstas</p>
        </div>
      </div>
    </section>

    <div className={estilos.acoes}><Button onClick={() => setForm({})}><Plus />Nova compra</Button><Button variant="outline" onClick={() => setAba("importar")}><Upload />Importar fatura</Button></div>

    <Tabs value={aba} onValueChange={setAba}>
      <TabsList className={estilos.abas}><TabsTrigger value="compras">Compras</TabsTrigger><TabsTrigger value="parcelas">Parcelas</TabsTrigger><TabsTrigger value="categorias">Categorias</TabsTrigger><TabsTrigger value="orcamento">Orçamento</TabsTrigger><TabsTrigger value="ajuda">Ajuda</TabsTrigger><TabsTrigger value="importar">Importar</TabsTrigger></TabsList>

      <TabsContent value="compras"><section className={estilos.painel}><Cabecalho titulo="Compras do mês" apoio={`${compras.length} compras · ${formatarMoeda(compras.reduce((s, c) => s + (c.tipo === "DESPESA" ? c.valorCentavos : 0), 0))}`} /><div className={estilos.filtros}><Input aria-label="Buscar compra" placeholder="Buscar compra" value={busca} onChange={(e) => setBusca(e.target.value)} /><select aria-label="Filtrar categoria" value={categoria} onChange={(e) => setCategoria(e.target.value)}><option value="">Todas as categorias</option>{resumo.categorias.map((linha) => <option key={linha.id} value={linha.id}>{linha.nome}</option>)}</select></div>
        <div className={estilos.listaCompras}>{compras.map((compra) => <div key={compra.id}><span className={estilos.iconeCompra}><MarcaPersonalizada nome={compra.descricao} /><CreditCard size={16} /></span><span><strong>{compra.descricao}</strong><small>{compra.data.split("-").reverse().join("/")} · {compra.categoria?.nome ?? "Sem categoria"}</small></span><b>{formatarMoeda(compra.valorCentavos)}</b><button aria-label={`Editar ${compra.descricao}`} onClick={() => setForm({ compra })}><Pencil /></button><button aria-label={`Excluir ${compra.descricao}`} onClick={() => setExcluir({ id: compra.id, nome: compra.descricao, tipo: "transacoes" })}><Trash2 /></button></div>)}</div>
      </section></TabsContent>

      <TabsContent value="parcelas"><section className={estilos.painel}><Cabecalho titulo="Compras parceladas" apoio={`${formatarMoeda(resumo.previsto)} previstos em ${rotuloCompetencia(mes, true)}`} /><div className={estilos.parcelamentos}>{cartao.parcelamentos.map((parcela) => <article key={parcela.id}><header><span><strong>{parcela.descricao}</strong><small>{formatarMoeda(parcela.parcelaCentavos)}/mês · termina em {rotuloCompetencia(parcela.parcelas.at(-1)?.competencia ?? mes, true)}</small></span><b>{parcela.parcelasPagas}/{parcela.parcelasTotal}<small>pagas</small></b><button aria-label={`Editar ${parcela.descricao}`} onClick={() => setForm({ parcelamento: parcela })}><Pencil /></button><button aria-label={`Excluir ${parcela.descricao}`} onClick={() => setExcluir({ id: parcela.id, nome: parcela.descricao, tipo: "parcelamentos" })}><Trash2 /></button></header><div className={estilos.progressoParcelas}><progress aria-label={`Progresso de ${parcela.descricao}`} value={parcela.parcelasPagas} max={parcela.parcelasTotal} /><span>{formatarMoeda(parcela.parcelas.filter(p => !p.paga).reduce((s, p) => s + p.valorCentavos, 0))} restantes</span></div><details><summary>Ver calendário</summary>{parcela.parcelas.map((linha) => <div key={linha.id} data-atual={linha.competencia === mes}><span>{linha.numero}/{parcela.parcelasTotal} · {rotuloCompetencia(linha.competencia, true)}</span><b>{formatarMoeda(linha.valorCentavos)} · {linha.paga ? "Paga" : "Prevista"}</b></div>)}</details></article>)}</div></section></TabsContent>

      <TabsContent value="categorias"><section className={estilos.painel}><Cabecalho titulo="Gastos por categoria" apoio={rotuloCompetencia(mes)} /><div className={estilos.gradeCategorias}><div className={estilos.rosca} style={{ background: resumo.gastos ? `conic-gradient(${resumo.categorias.map((linha, i, todas) => { const antes = todas.slice(0, i).reduce((s, item) => s + item.totalCentavos, 0) / resumo.gastos * 100; return `${CORES[i % CORES.length]} ${antes}% ${antes + linha.totalCentavos / resumo.gastos * 100}%` }).join(",")})` : "var(--papel-3)" }}><span><b>{formatarMoeda(resumo.gastos)}</b><small>em compras</small></span></div><div>{resumo.categorias.map((linha, i) => <button key={linha.id} onClick={() => { setCategoria(linha.id); setAba("compras") }}><i style={{ background: CORES[i % CORES.length] }} /><span>{linha.nome}</span><b>{formatarMoeda(linha.totalCentavos)}</b></button>)}</div></div></section></TabsContent>

      <TabsContent value="orcamento"><OrcamentoDoCartao key={`${cartao.id}-${mes}`} cartao={cartao} mes={mes} categorias={categorias} gastos={resumo.categorias} aoSalvar={() => router.refresh()} /></TabsContent>
      <TabsContent value="ajuda"><AjudaCartao key={`${cartao.id}-${mes}`} cartao={cartao} mes={mes} aoAbrir={(destino) => { setAba(destino); if (destino === "compras") setCategoria("sem") }} /></TabsContent>
      <TabsContent value="importar"><Importador contaInicial={cartao.id} aoConcluir={() => router.refresh()} /></TabsContent>
    </Tabs>

    <Dialog open={form !== null} onOpenChange={(aberto) => !aberto && setForm(null)}><DialogContent className={estilos.modal}><DialogHeader><DialogTitle>{form?.compra || form?.parcelamento ? "Editar compra" : "Nova compra"}</DialogTitle><DialogDescription>Registre no cartão selecionado.</DialogDescription></DialogHeader>{form && <CompraCartaoForm contaId={cartao.id} categorias={categorias} compra={form.compra} parcelamento={form.parcelamento} fechar={() => setForm(null)} salvou={() => router.refresh()} embutido />}</DialogContent></Dialog>
    <Dialog open={Boolean(excluir)} onOpenChange={(aberto) => !aberto && setExcluir(null)}><DialogContent><DialogHeader><DialogTitle>Excluir {excluir?.nome}?</DialogTitle><DialogDescription>Esta ação não pode ser desfeita.</DialogDescription></DialogHeader>{erro && <p role="alert">{erro}</p>}<div className={estilos.rodapeModal}><Button variant="outline" onClick={() => setExcluir(null)}>Cancelar</Button><Button variant="destructive" disabled={ocupado} onClick={() => void remover()}>Excluir</Button></div></DialogContent></Dialog>
  </div>
}

function Cabecalho({ titulo, apoio }: { titulo: string; apoio: string }) {
  return <header className={estilos.cabecalho}><div><h2>{titulo}</h2><p>{apoio}</p></div></header>
}

