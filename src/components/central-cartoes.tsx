"use client"

import Link from "next/link"
import { useEffect, useRef, useState, type CSSProperties } from "react"
import { useRouter } from "next/navigation"
import { CalendarClock, ChevronLeft, ChevronRight, Nfc, Plus, Trash2, Upload, type LucideIcon } from "lucide-react"

import estilos from "./central-cartoes.module.css"
import { ParcelamentosDoCartao } from "./parcelamentos-cartao"
import { ComprasDoCartao } from "./compras-do-cartao"
import { IconeFerramenta } from "@/lib/icone-ferramenta"
import { IdentidadeBanco } from "@/components/banco-perfil"
import { AjudaCartao } from "@/components/ajuda-cartao"
import { CompraCartaoForm } from "@/components/compra-cartao-form"
import { Importador } from "@/components/importador"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { enviar } from "@/lib/cliente"
import { cicloDaFatura, faturaAberta, faturaEmCobranca, limiteDoCartao, mesesDoCartao, resumoDoMes, type CompraCartao, type CompraParcelada, type DadosCartao } from "@/lib/cartoes"
import { nomeCurtoDaConta } from "@/components/filtros-do-extrato"
import { LimitesDosCartoes } from "@/components/limites-cartoes"
import { rotuloCompetencia } from "@/lib/datas"
import { formatarMoeda } from "@/lib/dinheiro"
import { corDoBanco } from "@/lib/bancos-perfil"
import { useJanela } from "@/lib/usar-largura"
import { ROTULO_BANDEIRA } from "@/lib/bandeiras"

const CORES = ["#34c759", "#5ac8fa", "#af52de", "#ff9f0a", "#ff375f", "#8e8e93"]

export function CentralCartoes({ cartoes, categorias, mesAtual, hoje }: { cartoes: DadosCartao[]; categorias: { id: string; nome: string }[]; mesAtual: string; hoje: string }) {
  const router = useRouter()
  const [id, setId] = useState(cartoes[0]?.id ?? "")
  // Abre na fatura que está recebendo compras, não na que tem o nome do mês
  // do calendário: em 24/09, num cartão que vence dia 6, esta já venceu.
  const [mes, setMes] = useState(() => (cartoes[0] ? faturaAberta(cartoes[0], hoje) : mesAtual))
  const carrossel = useRef<HTMLElement>(null)
  const rolagem = useRef<number | undefined>(undefined)
  const [categoria, setCategoria] = useState("")
  const [busca, setBusca] = useState("")
  const [aba, setAba] = useState("compras")
  const [conferir, setConferir] = useState(false)
  const [form, setForm] = useState<{ compra?: CompraCartao; parcelamento?: CompraParcelada } | null>(null)
  const [excluir, setExcluir] = useState<{ id: string; nome: string; tipo: "transacoes" | "parcelamentos" } | null>(null)
  const [erro, setErro] = useState("")
  const [ocupado, setOcupado] = useState(false)
  const cartao = cartoes.find((linha) => linha.id === id) ?? cartoes[0]

  useEffect(() => {
    const pedida = new URLSearchParams(window.location.search).get("aba")
    if (pedida === "parcelas" || pedida === "limites" || pedida === "categorias") setAba(pedida)
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

  const ciclo = cicloDaFatura(cartao, mes)

  function escolher(linha: DadosCartao) {
    setId(linha.id); setMes(faturaAberta(linha, hoje)); setCategoria(""); setBusca("")
  }

  return <div className={estilos.pagina}>
    {/* Cartões (Davi, 25/09: opção B do canvas com a fatura da B3 e o limite
        dentro do cartão). A pilha de carteira escondia metade de cada cartão
        atrás do seguinte, e o nome do cartão aparecia três vezes na tela: no
        bloco branco, no cartão e no resumo ao lado. Agora os cartões deslizam
        de lado, cada um inteiro, e o resto da tela é do cartão da frente. */}
    <section
      ref={carrossel}
      className={estilos.carrossel}
      aria-label="Seus cartões"
      onScroll={() => {
        // No celular, deslizar é escolher: o cartão que parou no centro vira o
        // selecionado. Tocar também escolhe, e é o que vale no computador,
        // onde os cartões ficam lado a lado sem rolagem.
        const trilho = carrossel.current
        if (!trilho || trilho.scrollWidth <= trilho.clientWidth) return
        window.clearTimeout(rolagem.current)
        rolagem.current = window.setTimeout(() => {
          const pecas = [...trilho.querySelectorAll<HTMLElement>("[data-cartao]")]
          const centro = trilho.scrollLeft + trilho.clientWidth / 2
          const maisPerto = pecas.reduce((melhor, peca) =>
            Math.abs(peca.offsetLeft + peca.offsetWidth / 2 - centro) < Math.abs(melhor.offsetLeft + melhor.offsetWidth / 2 - centro) ? peca : melhor)
          const linha = cartoes.find((item) => item.id === maisPerto?.dataset.cartao)
          if (linha && linha.id !== cartao.id) escolher(linha)
        }, 120)
      }}
    >
      {cartoes.map((linha) => {
        // O limite livre de verdade: fatura em cobrança, compras das próximas
        // e parcelas futuras saem dele (ver `limiteDoCartao`).
        const limite = limiteDoCartao(linha, faturaEmCobranca(linha, hoje))
        const final = linha.nome.match(/final\s*(\d{3,4})/i)?.[1]
        return <button
          key={linha.id}
          type="button"
          data-cartao={linha.id}
          aria-pressed={linha.id === cartao.id}
          className={estilos.cartaoFisico}
          style={{ "--cor-banco": corDoBanco(linha.instituicao) } as CSSProperties}
          onClick={(evento) => { escolher(linha); evento.currentTarget.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" }) }}
        >
          <span className={estilos.marca}><small>{linha.instituicao ?? "Cartão"}</small><IdentidadeBanco instituicao={linha.instituicao ?? ""} nome={linha.nome} /></span>
          {/* Só o disponível, em texto, sem caixa nem barra (Davi, 25/09:
              opção L1). Total, percentual e a régua moram na aba Limites. */}
          <span className={estilos.limite}>
            <small>disponível</small>
            <b>{limite ? semCentavosZerados(formatarMoeda(limite.disponivelCentavos)) : "limite não informado"}</b>
          </span>
          {/* Peças de cartão de verdade: chip e o símbolo de aproximação. São
              o que faz a peça parecer cartão e não retângulo colorido. */}
          <span className={estilos.peças} aria-hidden>
            <span className={estilos.chip} />
            <Nfc className={estilos.aproximacao} />
          </span>
          <span className={estilos.rodapeCartao}>
            <span className={estilos.identificacao}>
              <strong>{nomeCurtoDaConta(linha.nome)}</strong>
              <span className={estilos.final}>{final ? `•••• ${final}` : linha.nome}</span>
            </span>
            {/* Bandeira só quando a pessoa informou. Adivinhar pelo nome do
                cartão poria "Visa" num Mastercard e ninguém confiaria mais na
                tela. Cadastra-se em Configurações, no cartão. */}
            {linha.bandeira && <span className={estilos.bandeira}>{ROTULO_BANDEIRA[linha.bandeira] ?? ""}</span>}
          </span>
        </button>
      })}
      <Link href="/configuracoes" className={estilos.novoCartao}><Plus aria-hidden />Novo cartão</Link>
    </section>
    {cartoes.length > 1 && (
      <div className={estilos.pontos} aria-hidden>
        {cartoes.map((linha) => <i key={linha.id} data-ligado={linha.id === cartao.id || undefined} />)}
      </div>
    )}

    <div className={estilos.corpo}>
      <div className={estilos.coluna}>
        <div className={estilos.faturas}>
          <header><div><h2>Faturas por mês</h2><p className={estilos.apoioGrafico}>Toque num mês para abrir</p></div>{/* As setas andam uma fatura por vez e, entre elas, a data dela por
              extenso — dia, mês e ano do vencimento (Davi, 25/09). Setas
              soltas não diziam em que fatura a pessoa estava. */}
          <div className={estilos.navegaFatura}><button aria-label="Fatura anterior" disabled={indiceMes === 0} onClick={() => { setMes(meses[Math.max(0, indiceMes - 1)]); setCategoria("") }}><ChevronLeft /></button><span aria-live="polite">{ciclo ? dataPorExtenso(ciclo.venceEm) : rotuloCompetencia(mes)}</span><button aria-label="Próxima fatura" disabled={indiceMes >= meses.length - 1} onClick={() => { setMes(meses[Math.min(meses.length - 1, indiceMes + 1)]); setCategoria("") }}><ChevronRight /></button></div></header>
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
                strokeWidth={1.25}
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
            <div className={estilos.barras} style={{ gridTemplateColumns: `repeat(${porJanela}, minmax(0, 1fr))` }}>{barras.map((barra) => <button key={barra.competencia} aria-pressed={mes === barra.competencia} aria-label={`Fatura de ${rotuloCompetencia(barra.competencia)}: ${formatarMoeda(barra.saldo)}`} onClick={() => { setMes(barra.competencia); setCategoria("") }}>
              <span className={estilos.colunas}><i style={{ height: `${Math.max(4, barra.gastos / maximo * 100)}%` }} /><i style={{ height: `${Math.max(4, barra.previsto / maximo * 100)}%` }} /></span>
              <small>{rotuloCompetencia(barra.competencia, true)}</small>
            </button>)}</div>
          </div>
          <p className={estilos.legenda}><span />Fatura <span />Parcelas já compradas</p>
        </div>

        <FaturaDoMes
          mes={mes}
          hoje={hoje}
          ciclo={ciclo}
          valorCentavos={resumo.saldo}
        />

        <div className={estilos.acoes}><Button onClick={() => setForm({})}><Plus />Nova compra</Button><Button variant="outline" onClick={() => setAba("importar")}><Upload />Importar fatura</Button></div>
      </div>

      <div className={estilos.coluna}>
    <Tabs value={aba} onValueChange={setAba}>
      <TabsList className={estilos.abas}>
        {/* Quatro abas (Davi, 26/09). Orçamento saiu porque repetia a tela
            Orçamento com outro número; Ajuda saiu e cada ferramenta foi para
            onde a pessoa já está: conferir a fatura e os pontos no botão
            "Conferir" das compras. "Importar" não tem chip: o botão "Importar
            fatura" já abre esse conteúdo. */}
        {[["compras","Compras"],["parcelas","Parcelas"],["limites","Limites"],["categorias","Categorias"]].map(([valor,rotulo]) => (
          <TabsTrigger key={valor} value={valor}><IconeFerramenta rotulo={rotulo} /><span className="truncate">{rotulo}</span></TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="compras"><ComprasDoCartao
        compras={compras}
        categorias={resumo.categorias}
        busca={busca}
        aoBuscar={setBusca}
        categoria={categoria}
        aoFiltrar={setCategoria}
        aoAbrir={(compra) => setForm({ compra })}
        aoConferir={() => setConferir(true)}
        aoNova={() => setForm({})}
      /></TabsContent>

      <TabsContent value="parcelas">{cartao.parcelamentos.length === 0 ? (
        <section className={estilos.painel}><PainelVazio
          Icone={CalendarClock}
          titulo="Nenhuma compra parcelada"
          apoio="Compra dividida em vezes aparece aqui com a parcela de cada mês e quanto falta."
          acao={{ rotulo: "Lançar compra parcelada", aoTocar: () => setForm({}) }}
        /></section>
      ) : <ParcelamentosDoCartao parcelamentos={cartao.parcelamentos} categorias={categorias} mes={mes} aoAbrir={(parcelamento) => setForm({ parcelamento })} />}</TabsContent>

      <TabsContent value="limites"><LimitesDosCartoes cartoes={cartoes} hoje={hoje} /></TabsContent>
      <TabsContent value="categorias"><section className={estilos.painel}><Cabecalho titulo="Gastos por categoria" apoio={rotuloCompetencia(mes)} /><div className={estilos.gradeCategorias}><div className={estilos.rosca} style={{ background: resumo.gastos ? `conic-gradient(${resumo.categorias.map((linha, i, todas) => { const antes = todas.slice(0, i).reduce((s, item) => s + item.totalCentavos, 0) / resumo.gastos * 100; return `${CORES[i % CORES.length]} ${antes}% ${antes + linha.totalCentavos / resumo.gastos * 100}%` }).join(",")})` : "var(--papel-3)" }}><span><b>{formatarMoeda(resumo.gastos)}</b><small>em compras</small></span></div><div>{resumo.categorias.map((linha, i) => <button key={linha.id} onClick={() => { setCategoria(linha.id); setAba("compras") }}><i style={{ background: CORES[i % CORES.length] }} /><span>{linha.nome}</span><b>{formatarMoeda(linha.totalCentavos)}</b></button>)}</div></div></section></TabsContent>

      <TabsContent value="importar"><Importador contaInicial={cartao.id} aoConcluir={() => router.refresh()} /></TabsContent>
    </Tabs>
      </div>
    </div>

    <Dialog open={form !== null} onOpenChange={(aberto) => !aberto && setForm(null)}><DialogContent className={estilos.modal}><DialogHeader><DialogTitle>{form?.compra || form?.parcelamento ? "Editar compra" : "Nova compra"}</DialogTitle><DialogDescription>Registre no cartão selecionado.</DialogDescription></DialogHeader>{form && <CompraCartaoForm contaId={cartao.id} categorias={categorias} compra={form.compra} parcelamento={form.parcelamento} fechar={() => setForm(null)} salvou={() => router.refresh()} embutido />}
      {/* Apagar mora aqui desde que a lixeira saiu de cada linha da lista. */}
      {(form?.compra || form?.parcelamento) && <button type="button" className={estilos.excluirCompra} onClick={() => { const alvo = form.compra ? { id: form.compra.id, nome: form.compra.descricao, tipo: "transacoes" as const } : { id: form.parcelamento!.id, nome: form.parcelamento!.descricao, tipo: "parcelamentos" as const }; setForm(null); setExcluir(alvo) }}><Trash2 aria-hidden />Excluir compra</button>}
    </DialogContent></Dialog>
    <Dialog open={conferir} onOpenChange={setConferir}><DialogContent className={estilos.modal}><DialogHeader><DialogTitle>Conferir fatura</DialogTitle><DialogDescription>Compras sem categoria e os pontos que esta fatura rende.</DialogDescription></DialogHeader><AjudaCartao cartao={cartao} mes={mes} objetivos={["fatura", "pontos"]} semCabecalho aoAbrir={(destino) => { setConferir(false); if (destino === "compras") setCategoria("sem"); setAba(destino) }} /></DialogContent></Dialog>
    <Dialog open={Boolean(excluir)} onOpenChange={(aberto) => !aberto && setExcluir(null)}><DialogContent><DialogHeader><DialogTitle>Excluir {excluir?.nome}?</DialogTitle><DialogDescription>Esta ação não pode ser desfeita.</DialogDescription></DialogHeader>{erro && <p role="alert">{erro}</p>}<div className={estilos.rodapeModal}><Button variant="outline" onClick={() => setExcluir(null)}>Cancelar</Button><Button variant="destructive" disabled={ocupado} onClick={() => void remover()}>Excluir</Button></div></DialogContent></Dialog>
  </div>
}

function Cabecalho({ titulo, apoio }: { titulo: string; apoio: string }) {
  return <header className={estilos.cabecalho}><div><h2>{titulo}</h2><p>{apoio}</p></div></header>
}

/**
 * O que cada ferramenta mostra quando não há nada para mostrar.
 *
 * Antes não mostrava nada: mês sem compra deixava o painel em branco, e
 * branco não diz se o Tino está carregando, se quebrou, ou se o mês está
 * mesmo zerado. Cada vazio agora diz o que é, de onde viria o conteúdo e
 * oferece a ação que o cria.
 */
function PainelVazio({ Icone, titulo, apoio, acao }: { Icone: LucideIcon; titulo: string; apoio: string; acao?: { rotulo: string; aoTocar: () => void } }) {
  return (
    <div className={estilos.painelVazio}>
      <span className={estilos.painelVazioIcone}><Icone aria-hidden /></span>
      <strong>{titulo}</strong>
      <p>{apoio}</p>
      {acao && <Button onClick={acao.aoTocar}>{acao.rotulo}</Button>}
    </div>
  )
}

/// "06/10" a partir de "2026-10-06".
const diaMes = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`
const diasEntreIso = (de: string, ate: string) => Math.round((Date.parse(`${ate}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / 86_400_000)
/// "R$ 4.633" quando os centavos são zero; o valor com centavos fica como está.
const semCentavosZerados = (texto: string) => texto.replace(/,00$/, "")
const MES_CURTO = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]
/// "06 out 2026" a partir de "2026-10-06".
const dataPorExtenso = (iso: string) => `${iso.slice(8, 10)} ${MES_CURTO[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`

/**
 * A fatura escolhida, bem pequena (Davi, 25/09: "ficou muito grande", depois
 * "quero que fique realmente pequena").
 *
 * Uma linha — estado, valor, vencimento — e embaixo o ciclo num traço fino,
 * com um ponto em hoje e um corte no fechamento: mostra se a compra de hoje
 * ainda cai nesta fatura sem o parágrafo que explicava isso. As parcelas já
 * compradas estão na barra cinza do gráfico logo acima. Sem fechamento e vencimento cadastrados, o
 * traço dá lugar ao pedido de cadastro, em vez de datas inventadas.
 */
function FaturaDoMes({ mes, hoje, ciclo, valorCentavos }: {
  mes: string
  hoje: string
  ciclo: { abreEm: string; fechaEm: string; venceEm: string } | null
  valorCentavos: number
}) {
  const estado = !ciclo ? null : hoje < ciclo.abreEm ? "futura" : hoje <= ciclo.fechaEm ? "aberta" : hoje <= ciclo.venceEm ? "fechada" : "vencida"
  const ROTULO = { futura: "ainda não abriu", aberta: "aberta", fechada: "fechada", vencida: "vencida" } as const
  const total = ciclo ? Math.max(1, diasEntreIso(ciclo.abreEm, ciclo.venceEm)) : 1
  const posicao = (iso: string) => `${Math.min(100, Math.max(0, (diasEntreIso(ciclo!.abreEm, iso) / total) * 100))}%`

  return <section className={estilos.fatura}>
    <div className={estilos.linhaFatura}>
      <small>Fatura de {rotuloCompetencia(mes).split(" ")[0]}{estado ? ` · ${ROTULO[estado]}` : ""}</small>
      <b className="valor-sensivel">{formatarMoeda(valorCentavos)}</b>
      {ciclo && <span className={estilos.vence}>vence {diaMes(ciclo.venceEm)}</span>}
    </div>
    {ciclo && estado ? (
      <span className={estilos.trilho} role="img" aria-label={`Abriu ${diaMes(ciclo.abreEm)}, fecha ${diaMes(ciclo.fechaEm)}, vence ${diaMes(ciclo.venceEm)}`} title={`abriu ${diaMes(ciclo.abreEm)} · fecha ${diaMes(ciclo.fechaEm)} · vence ${diaMes(ciclo.venceEm)}`}>
        <i style={{ width: estado === "futura" ? "0%" : posicao(hoje < ciclo.venceEm ? hoje : ciclo.venceEm) }} />
        <em style={{ left: posicao(ciclo.fechaEm) }} />
        {estado !== "futura" && estado !== "vencida" && <u style={{ left: posicao(hoje) }} />}
      </span>
    ) : (
      <p className={estilos.pedido}>Sem dia de fechamento e vencimento. <Link href="/configuracoes">Cadastrar</Link></p>
    )}
  </section>
}
