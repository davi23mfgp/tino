"use client"

import Link from "next/link"
import { useEffect, useMemo, useState, type CSSProperties } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2, Upload } from "lucide-react"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import estilos from "./central-cartoes.module.css"
import { OrcamentoDoCartao } from "./orcamento-cartao"
import { ParcelamentosDoCartao } from "./parcelamentos-cartao"
import { iconeDaCategoria } from "@/lib/icone-categoria"
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
import { formatarDecimal, formatarMoeda, paraCentavos } from "@/lib/dinheiro"
import { corDoBanco } from "@/lib/bancos-perfil"
import { useJanela } from "@/lib/usar-largura"

const CORES = ["#34c759", "#5ac8fa", "#af52de", "#ff9f0a", "#ff375f", "#8e8e93"]

export function CentralCartoes({ cartoes, categorias, mesAtual, cartaoInicial }: { cartoes: DadosCartao[]; categorias: { id: string; nome: string }[]; mesAtual: string; cartaoInicial?: string }) {
  const router = useRouter()
  const [id, setId] = useState(cartaoInicial ?? cartoes[0]?.id ?? "")
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
    if (new URLSearchParams(window.location.search).get("aba") === "parcelas") setAba("parcelas")
  }, [])

  if (!cartao) return <div className={estilos.vazio}><p>Adicione seu primeiro cartão.</p><Button asChild><Link href="/configuracoes">Cadastrar cartão</Link></Button></div>

  const resumo = resumoDoMes(cartao, mes)
  const meses = mesesDoCartao(cartao, mesAtual)
  const indiceMes = Math.max(0, meses.indexOf(mes))
  // Seis colunas fixas empurravam a pagina para 402px num viewport de 320 --
  // rolagem horizontal, que a aceitacao proibe. A janela encolhe e os
  // controles anterior/proximo andam de acordo.
  const porJanela = useJanela([{ ate: 360, itens: 3 }, { ate: 520, itens: 4 }, { ate: 900, itens: 5 }], 6)
  const inicio = Math.max(0, Math.min(indiceMes - Math.floor(porJanela / 3), meses.length - porJanela))
  const mesesVisiveis = meses.slice(inicio, inicio + porJanela)
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
          <header><div><p className={estilos.sobretitulo}>Confirmado e previsto</p><h2>Faturas por mês</h2></div><div><button aria-label="Meses anteriores" disabled={inicio === 0} onClick={() => setMes(meses[Math.max(0, inicio - 1)])}><ChevronLeft /></button><button aria-label="Próximos meses" disabled={inicio + porJanela >= meses.length} onClick={() => setMes(meses[Math.min(meses.length - 1, inicio + porJanela)])}><ChevronRight /></button></div></header>
          {/* A linha liga os topos do que já foi confirmado, com um ponto no
              mês aberto: a barra diz o tamanho de cada fatura, a linha diz para
              onde a fatura está indo. Sem ela é preciso comparar seis alturas
              de olho. O traço não escala junto com o viewBox achatado. */}
          <div className={estilos.areaBarras}>
            <svg className={estilos.tendencia} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden focusable="false">
              <polyline
                points={barras.map((barra, indice) => `${((indice + 0.5) / barras.length) * 100},${100 - Math.max(4, (barra.gastos / maximo) * 100)}`).join(" ")}
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeDasharray="4 5"
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            {/* O ponto do mês fica fora do SVG: com o viewBox achatado para
                acompanhar a largura, um <circle> vira elipse. Aqui ele é um
                elemento posicionado em porcentagem, então continua redondo em
                qualquer largura. */}
            <div className={estilos.marcaTendencia} aria-hidden>
              {barras.map((barra, indice) => mes === barra.competencia ? (
                <span
                  key={barra.competencia}
                  style={{
                    left: `${((indice + 0.5) / barras.length) * 100}%`,
                    bottom: `${Math.max(4, (barra.gastos / maximo) * 100)}%`,
                  }}
                />
              ) : null)}
            </div>
            <div className={estilos.barras} style={{ gridTemplateColumns: `repeat(${porJanela}, minmax(0, 1fr))` }}>{barras.map((barra) => <button key={barra.competencia} aria-pressed={mes === barra.competencia} onClick={() => { setMes(barra.competencia); setCategoria("") }}>
              <span className={estilos.colunas}><i style={{ height: `${Math.max(4, barra.gastos / maximo * 100)}%` }} /><i style={{ height: `${Math.max(4, barra.previsto / maximo * 100)}%` }} /></span>
              <small>{rotuloCompetencia(barra.competencia, true)}</small><b>{mes === barra.competencia ? formatarMoeda(barra.saldo) : ""}</b>
            </button>)}</div>
          </div>
          <p className={estilos.legenda}><span />Confirmado <span />Parcelas previstas</p>
        </div>
      </div>
    </section>

    <div className={estilos.acoes}><Button onClick={() => setForm({})}><Plus />Nova compra</Button><Button variant="outline" onClick={() => setAba("importar")}><Upload />Importar fatura</Button></div>

    <Tabs value={aba} onValueChange={setAba}>
      <TabsList className={estilos.abas}><TabsTrigger value="compras">Compras</TabsTrigger><TabsTrigger value="parcelas">Parcelas</TabsTrigger><TabsTrigger value="categorias">Categorias</TabsTrigger><TabsTrigger value="orcamento">Orçamento</TabsTrigger><TabsTrigger value="ajuda">Ajuda</TabsTrigger><TabsTrigger value="importar">Importar</TabsTrigger></TabsList>

      <TabsContent value="compras"><section className={estilos.painel}><Cabecalho titulo="Compras do mês" apoio={`${compras.length} compras · ${formatarMoeda(compras.reduce((s, c) => s + (c.tipo === "DESPESA" ? c.valorCentavos : 0), 0))}`} /><div className={estilos.filtros}><Input aria-label="Buscar compra" placeholder="Buscar compra" value={busca} onChange={(e) => setBusca(e.target.value)} /><Select value={categoria || "todas"} onValueChange={(valor) => setCategoria(valor === "todas" ? "" : valor)}><SelectTrigger aria-label="Filtrar categoria" className="w-full sm:w-[220px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todas">Todas as categorias</SelectItem>{resumo.categorias.map((linha) => <SelectItem key={linha.id} value={linha.id}>{linha.nome}</SelectItem>)}</SelectContent></Select></div>
        <div className={estilos.listaCompras}>{compras.map((compra) => <div key={compra.id}><span className={estilos.marca36}><MarcaPersonalizada nome={compra.descricao} /><IconeCategoria compra={compra} /></span><span><strong>{compra.descricao}</strong><small>{compra.data.split("-").reverse().join("/")} · {compra.categoria?.nome ?? "Sem categoria"}</small></span><b>{formatarMoeda(compra.valorCentavos)}</b><button aria-label={`Editar ${compra.descricao}`} onClick={() => setForm({ compra })}><Pencil /></button><button aria-label={`Excluir ${compra.descricao}`} onClick={() => setExcluir({ id: compra.id, nome: compra.descricao, tipo: "transacoes" })}><Trash2 /></button></div>)}</div>
      </section></TabsContent>

      <TabsContent value="parcelas"><section className={estilos.painel}><Cabecalho titulo="Compras parceladas" apoio={`${formatarMoeda(resumo.previsto)} previstos em ${rotuloCompetencia(mes, true)}`} /><ParcelamentosDoCartao parcelamentos={cartao.parcelamentos} mes={mes} aoEditar={(parcelamento) => setForm({ parcelamento })} aoExcluir={setExcluir} /></section></TabsContent>

      <TabsContent value="categorias"><section className={estilos.painel}><Cabecalho titulo="Gastos por categoria" apoio={rotuloCompetencia(mes)} /><div className={estilos.gradeCategorias}><div className={estilos.rosca} style={{ background: resumo.gastos ? `conic-gradient(${resumo.categorias.map((linha, i, todas) => { const antes = todas.slice(0, i).reduce((s, item) => s + item.totalCentavos, 0) / resumo.gastos * 100; return `${CORES[i % CORES.length]} ${antes}% ${antes + linha.totalCentavos / resumo.gastos * 100}%` }).join(",")})` : "var(--papel-3)" }}><span><b>{formatarMoeda(resumo.gastos)}</b><small>em compras</small></span></div><div>{resumo.categorias.map((linha, i) => <button key={linha.id} onClick={() => { setCategoria(linha.id); setAba("compras") }}><i style={{ background: CORES[i % CORES.length] }} /><span>{linha.nome}</span><b>{formatarMoeda(linha.totalCentavos)}</b></button>)}</div></div></section></TabsContent>

      <TabsContent value="orcamento"><OrcamentoDoCartao key={`${cartao.id}-${mes}`} cartao={cartao} mes={mes} categorias={categorias} gastos={resumo.categorias} aoSalvar={() => router.refresh()} /></TabsContent>
      <TabsContent value="ajuda"><AjudaCartao cartao={cartao} mes={mes} aoAbrir={setAba} /></TabsContent>
      <TabsContent value="importar"><Importador contaInicial={cartao.id} aoConcluir={() => router.refresh()} /></TabsContent>
    </Tabs>

    <Dialog open={form !== null} onOpenChange={(aberto) => !aberto && setForm(null)}><DialogContent className={estilos.modal}><DialogHeader><DialogTitle>{form?.compra || form?.parcelamento ? "Editar compra" : "Nova compra"}</DialogTitle><DialogDescription>Registre no cartão selecionado.</DialogDescription></DialogHeader>{form && <CompraCartaoForm contaId={cartao.id} categorias={categorias} compra={form.compra} parcelamento={form.parcelamento} fechar={() => setForm(null)} salvou={() => router.refresh()} embutido />}</DialogContent></Dialog>
    <Dialog open={Boolean(excluir)} onOpenChange={(aberto) => !aberto && setExcluir(null)}><DialogContent><DialogHeader><DialogTitle>Excluir {excluir?.nome}?</DialogTitle><DialogDescription>Esta ação não pode ser desfeita.</DialogDescription></DialogHeader>{erro && <p role="alert">{erro}</p>}<div className={estilos.rodapeModal}><Button variant="outline" onClick={() => setExcluir(null)}>Cancelar</Button><Button variant="destructive" disabled={ocupado} onClick={() => void remover()}>Excluir</Button></div></DialogContent></Dialog>
  </div>
}

function Cabecalho({ titulo, apoio }: { titulo: string; apoio: string }) {
  return <header className={estilos.cabecalho}><div><h2>{titulo}</h2><p>{apoio}</p></div></header>
}

/**
 * Ícone da categoria, atrás da marca personalizada.
 *
 * `MarcaPersonalizada` devolve `null` quando o estabelecimento não tem logo
 * cadastrado, e o círculo ficava vazio. O CSS esconde este ícone quando a
 * marca existe, então nunca aparecem os dois.
 */
function IconeCategoria({ compra }: { compra: CompraCartao }) {
  const Icone = iconeDaCategoria(compra.categoria, compra.tipo === "RECEITA" ? "RECEITA" : "DESPESA")
  return <Icone aria-hidden />
}

