"use client"

import { useMemo, useRef, useState } from "react"
import Link from "next/link"
import { ArrowLeft, ArrowRight, Check, FileUp } from "lucide-react"

import { enviar } from "@/lib/cliente"
import { formatarMoeda } from "@/lib/dinheiro"
import type { AjusteProposto, Conciliacao, PagamentoDoBalcao, ParConciliado, VendaDaMaquininha } from "@/lib/loja/maquininha"
import { TrilhaLoja } from "@/components/trilha-loja"
import { showToast } from "@/components/ui/toast"

import { Reais } from "../clientes/comum"
import base from "../clientes/clientes.module.css"
import estilos from "./maquininha.module.css"

interface Resposta {
  leitura: { cabecalho: string[]; descartadas: { linha: number; motivo: string }[]; falta: string | null; vendas?: number }
  conciliacao: Conciliacao | null
  mei?: { limiteAnualCentavos: number; faturadoNoAnoCentavos: number; porMes: Record<string, number> } | null
}

type Tipo = "esquecida" | "balcao" | "data" | "taxa"
type Item =
  | { id: string; tipo: "esquecida"; venda: VendaDaMaquininha; parecida: PagamentoDoBalcao | null }
  | { id: string; tipo: "balcao"; pagamento: PagamentoDoBalcao }
  | { id: string; tipo: "data" | "taxa"; ajuste: AjusteProposto; par: ParConciliado | null }

const ABAS: { tipo: Tipo; rotulo: string }[] = [
  { tipo: "esquecida", rotulo: "Esquecidas" },
  { tipo: "balcao", rotulo: "Só no Balcão" },
  { tipo: "data", rotulo: "Datas" },
  { tipo: "taxa", rotulo: "Taxas" },
]
const FORMA: Record<string, string> = { DEBITO: "débito", CREDITO_VISTA: "crédito à vista", CREDITO_PARCELADO: "crédito parcelado", PIX: "Pix" }
const reais = (centavos: number) => formatarMoeda(centavos).replace(/ /g, " ")
const ddmm = (dia: string) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}`
const pct = (bps: number) => `${(bps / 100).toFixed(1).replace(".", ",")}%`
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"]

/**
 * Conferir a maquininha, passo 51 (Davi, 08/10/2026: "D e F"). Um por um,
 * como a opção B, com a fila separada por tipo e a ficha ao lado (F) e, na
 * venda esquecida, a maquininha e o Balcão lado a lado com a venda mais
 * parecida (D, como o Xero). Nada grava sem o toque (regra 5): lançar,
 * corrigir data ou taxa, cada um é um botão.
 *
 * A conferência vive na tela: a planilha não fica guardada, e o que a
 * pessoa decidiu já está gravado no Balcão. Mandar o arquivo de novo
 * mostra só o que ainda não bate.
 */
export default function ConferirMaquininha() {
  const [arquivo, setArquivo] = useState<string | null>(null)
  const [resposta, setResposta] = useState<Resposta | null>(null)
  const [lendo, setLendo] = useState(false)
  const [aba, setAba] = useState<Tipo>("esquecida")
  const [selecionado, setSelecionado] = useState<string | null>(null)
  const [resolvidos, setResolvidos] = useState<Set<string>>(new Set())
  const [lancados, setLancados] = useState<Record<string, number>>({})
  const [ocupado, setOcupado] = useState(false)
  const entrada = useRef<HTMLInputElement>(null)

  async function ler(file: File) {
    setLendo(true)
    try {
      if (file.size > 2_000_000) throw new Error("Arquivo grande demais: mande até três meses de vendas por vez.")
      const conteudo = await file.text()
      const dados = await enviar<Resposta>("/api/loja/maquininha/conferir", { conteudo })
      setArquivo(file.name)
      setResposta(dados)
      setResolvidos(new Set())
      setLancados({})
      setSelecionado(null)
      const fila = montarFila(dados.conciliacao)
      setAba(ABAS.find((linha) => fila.some((item) => item.tipo === linha.tipo))?.tipo ?? "esquecida")
    } catch (falha) {
      showToast(falha instanceof Error ? falha.message : "Não consegui ler a planilha.", { variant: "error" })
    } finally {
      setLendo(false)
      if (entrada.current) entrada.current.value = ""
    }
  }

  const fila = useMemo(() => montarFila(resposta?.conciliacao ?? null), [resposta])
  const pendentes = fila.filter((item) => !resolvidos.has(item.id))
  // Acabou a aba, passa para a próxima com pendência: aba vazia na frente
  // parecia que a conferência tinha travado.
  const abaAtiva = pendentes.some((item) => item.tipo === aba) ? aba : (ABAS.find((linha) => pendentes.some((item) => item.tipo === linha.tipo))?.tipo ?? aba)
  const daAba = pendentes.filter((item) => item.tipo === abaAtiva)
  const atual = daAba.find((item) => item.id === selecionado) ?? daAba[0] ?? null
  const posicao = atual ? daAba.indexOf(atual) : -1
  const conciliacao = resposta?.conciliacao

  function resolver(id: string, mensagem?: string) {
    setResolvidos((antes) => new Set(antes).add(id))
    setSelecionado(daAba[posicao + 1]?.id ?? daAba[posicao - 1]?.id ?? null)
    if (mensagem) showToast(mensagem)
  }

  async function lancar(item: Extract<Item, { tipo: "esquecida" }>) {
    setOcupado(true)
    try {
      const { venda } = item
      const { venda: criada } = await enviar<{ venda: { numero: number } }>("/api/loja/maquininha/lancar", {
        dia: venda.dia, hora: venda.hora, forma: venda.forma, parcelas: venda.parcelas, brutoCentavos: venda.brutoCentavos,
        liquidoCentavos: venda.liquidoCentavos, previsao: venda.previsao, codigo: venda.codigo,
      })
      setLancados((antes) => ({ ...antes, [venda.dia.slice(0, 7)]: (antes[venda.dia.slice(0, 7)] ?? 0) + venda.brutoCentavos }))
      resolver(item.id, `Lançada no Balcão como venda ${String(criada.numero).padStart(4, "0")}.`)
    } catch (falha) {
      showToast(falha instanceof Error ? falha.message : "Não consegui lançar.", { variant: "error" })
    } finally {
      setOcupado(false)
    }
  }

  async function corrigir(itens: Extract<Item, { tipo: "data" | "taxa" }>[]) {
    if (!itens.length) return
    setOcupado(true)
    try {
      await enviar("/api/loja/maquininha/ajustes", { ajustes: itens.map((item) => item.ajuste) })
      setResolvidos((antes) => { const novo = new Set(antes); itens.forEach((item) => novo.add(item.id)); return novo })
      setSelecionado(null)
      showToast(itens.length === 1 ? "Corrigido no Tino." : `${itens.length} correções gravadas.`)
    } catch (falha) {
      showToast(falha instanceof Error ? falha.message : "Não consegui corrigir.", { variant: "error" })
    } finally {
      setOcupado(false)
    }
  }

  const contagem = (tipo: Tipo) => pendentes.filter((item) => item.tipo === tipo).length
  const corrigiveis = pendentes.filter((item): item is Extract<Item, { tipo: "data" | "taxa" }> => item.tipo === abaAtiva && (item.tipo === "data" || item.tipo === "taxa"))

  return (
    <div className={base.pagina}>
      <TrilhaLoja pagina="Conferir a maquininha" />
      <div className={base.topo}>
        <p>A planilha de vendas da maquininha contra o Balcão: o que bateu, o que foi esquecido, e o que caiu em outra data ou com outra taxa.</p>
      </div>

      <input ref={entrada} type="file" accept=".csv,text/csv,text/plain" hidden onChange={(evento) => { const file = evento.target.files?.[0]; if (file) void ler(file) }} />
      {!resposta ? (
        <section className={`${base.bloco} ${estilos.inicio}`}>
          <FileUp aria-hidden />
          <h2>Mande a planilha de vendas da maquininha</h2>
          <p>No app ou no site da maquininha, procure &quot;relatório de vendas&quot; ou &quot;extrato&quot; e baixe em CSV. Um mês por vez é o melhor; até três meses cabem.</p>
          <button type="button" className={base.botao} data-principal onClick={() => entrada.current?.click()} disabled={lendo}>{lendo ? "Lendo…" : "Escolher a planilha"}</button>
        </section>
      ) : (
        <>
          <div className={estilos.arquivo}>
            <span><b>{arquivo}</b><small>{resposta.leitura.falta ? `Falta ${resposta.leitura.falta}.` : `${resposta.leitura.vendas} vendas${conciliacao?.periodo ? ` de ${ddmm(conciliacao.periodo.de)} a ${ddmm(conciliacao.periodo.ate)}` : ""}${resposta.leitura.descartadas.length ? ` · ${resposta.leitura.descartadas.length} negadas ou estornadas ficaram de fora` : ""}`}</small></span>
            <button type="button" className={`${base.botao} ${base.pequeno}`} onClick={() => entrada.current?.click()} disabled={lendo}>Trocar</button>
          </div>

          {conciliacao && (
            <>
              <div className={estilos.progresso}>
                <div><span>{conciliacao.bateram.length} de {resposta.leitura.vendas} bateram sozinhas</span><span>{fila.length - pendentes.length} de {fila.length} conferidas</span></div>
                <div className={estilos.barra} aria-hidden>{fila.map((item) => <i key={item.id} data-feito={resolvidos.has(item.id) ? "" : undefined} />)}</div>
              </div>

              {pendentes.length === 0 ? (
                <section className={`${base.bloco} ${estilos.fim}`}>
                  <Check aria-hidden />
                  <h2>{fila.length ? "Tudo conferido." : "Tudo bateu."}</h2>
                  <p>{fila.length ? "O Balcão e a maquininha agora contam a mesma história." : "Cada venda da planilha está no Balcão, com a taxa e a data certas."}{conciliacao.taxa && conciliacao.taxa.diferencaCentavos > 1 ? ` A maquininha cobrou ${reais(conciliacao.taxa.diferencaCentavos)} a mais que a taxa cadastrada no período.` : ""}</p>
                </section>
              ) : (
                <>
                  <div className={estilos.abas} role="tablist" aria-label="Tipo de diferença">
                    {ABAS.filter((linha) => contagem(linha.tipo) > 0).map((linha) => (
                      <button key={linha.tipo} type="button" role="tab" aria-selected={abaAtiva === linha.tipo} onClick={() => { setAba(linha.tipo); setSelecionado(null) }}>
                        <i className={estilos.ponto} data-tipo={linha.tipo} aria-hidden />{linha.rotulo} <b>{contagem(linha.tipo)}</b>
                      </button>
                    ))}
                  </div>

                  <div className={estilos.grade}>
                    <div className={`${base.bloco} ${estilos.fila}`}>
                      {daAba.map((item) => (
                        <button key={item.id} type="button" className={estilos.linhaFila} aria-current={item.id === atual?.id} onClick={() => setSelecionado(item.id)}>
                          <i className={estilos.ponto} data-tipo={item.tipo} aria-hidden />
                          <span><b>{tituloCurto(item)}</b><small>{subCurto(item)}</small></span>
                          <span className={base.num}>{reais(valorDo(item))}</span>
                        </button>
                      ))}
                      {corrigiveis.length > 1 && <button type="button" className={`${base.botao} ${estilos.todas}`} onClick={() => void corrigir(corrigiveis)} disabled={ocupado}>Corrigir as {corrigiveis.length}</button>}
                    </div>

                    {atual && (
                      <div className={estilos.lado}>
                        <Ficha item={atual} mei={resposta.mei ?? null} lancados={lancados} ocupado={ocupado}
                          aoLancar={(item) => void lancar(item)} aoCorrigir={(item) => void corrigir([item])} aoResolver={resolver} />
                        <div className={estilos.navegar}>
                          <button type="button" onClick={() => setSelecionado(daAba[posicao - 1]?.id ?? null)} disabled={posicao <= 0}><ArrowLeft aria-hidden />Anterior</button>
                          <span>{posicao + 1} de {daAba.length}</span>
                          <button type="button" onClick={() => setSelecionado(daAba[posicao + 1]?.id ?? null)} disabled={posicao >= daAba.length - 1}>Próxima<ArrowRight aria-hidden /></button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}

function montarFila(conciliacao: Conciliacao | null): Item[] {
  if (!conciliacao) return []
  const parDe = new Map(conciliacao.bateram.map((par) => [par.balcao.id, par]))
  return [
    ...conciliacao.soNaMaquininha.map((venda) => ({ id: `m${venda.linha}`, tipo: "esquecida" as const, venda, parecida: conciliacao.parecidas[venda.linha] ?? null })),
    ...conciliacao.soNoBalcao.map((pagamento) => ({ id: `b${pagamento.id}`, tipo: "balcao" as const, pagamento })),
    ...conciliacao.ajustes.map((ajuste) => ({ id: `a${ajuste.pagamentoId}`, tipo: (ajuste.liquidoCentavos !== undefined ? "taxa" : "data") as "taxa" | "data", ajuste, par: parDe.get(ajuste.pagamentoId) ?? null })),
  ]
}

const numeroVenda = (numero: number) => `venda ${String(numero).padStart(4, "0")}`
function valorDo(item: Item) {
  return item.tipo === "esquecida" ? item.venda.brutoCentavos : item.tipo === "balcao" ? item.pagamento.valorCentavos : item.par?.balcao.valorCentavos ?? 0
}
function tituloCurto(item: Item) {
  return item.tipo === "esquecida" ? "Esquecida" : item.tipo === "balcao" ? "Só no Balcão" : item.tipo === "taxa" ? "Taxa diferente" : "Outra data"
}
function subCurto(item: Item) {
  if (item.tipo === "esquecida") return `${ddmm(item.venda.dia)}${item.venda.hora ? ` · ${item.venda.hora}` : ""} · ${FORMA[item.venda.forma ?? ""] ?? "cartão"}`
  if (item.tipo === "balcao") return `${ddmm(item.pagamento.dia)} · ${numeroVenda(item.pagamento.vendaNumero)}`
  if (item.tipo === "taxa" && item.par) return `${numeroVenda(item.ajuste.vendaNumero)} · cobrou ${reais(item.par.balcao.valorCentavos - (item.ajuste.liquidoCentavos ?? 0))}`
  const nova = item.ajuste.recebidoEm ?? item.ajuste.previsao
  return `${numeroVenda(item.ajuste.vendaNumero)} · ${item.ajuste.recebidoEm ? "caiu" : "cai"} ${nova ? ddmm(nova) : ""}`
}

function Ficha({ item, mei, lancados, ocupado, aoLancar, aoCorrigir, aoResolver }: {
  item: Item
  mei: Resposta["mei"] | null
  lancados: Record<string, number>
  ocupado: boolean
  aoLancar: (item: Extract<Item, { tipo: "esquecida" }>) => void
  aoCorrigir: (item: Extract<Item, { tipo: "data" | "taxa" }>) => void
  aoResolver: (id: string, mensagem?: string) => void
}) {
  if (item.tipo === "esquecida") {
    const { venda, parecida } = item
    const taxaBps = venda.taxaCentavos !== null ? Math.round((venda.taxaCentavos * 10_000) / venda.brutoCentavos) : null
    const mes = venda.dia.slice(0, 7)
    const doMes = mei ? (mei.porMes[mes] ?? 0) + (lancados[mes] ?? 0) : null
    const doAno = mei ? mei.faturadoNoAnoCentavos + Object.values(lancados).reduce((soma, valor) => soma + valor, 0) : null
    const doAnoDeste = mei && venda.dia.slice(0, 4) === Object.keys(mei.porMes)[0]?.slice(0, 4)
    return (
      <section className={`${base.bloco} ${estilos.ficha}`} aria-label="Venda esquecida">
        <header><p className={estilos.olho}>Esquecida{venda.codigo ? <span>código {venda.codigo}</span> : null}</p><h2>Passou na maquininha e não está no Balcão</h2></header>
        <div className={estilos.valor}><span className={base.grande}><Reais centavos={venda.brutoCentavos} /></span><small>{FORMA[venda.forma ?? ""] ?? "cartão"}{venda.parcelas > 1 ? ` em ${venda.parcelas}x` : ""}</small></div>
        <div className={estilos.lados}>
          <div className={estilos.coluna} data-forte>
            <p className={estilos.olho}>Na maquininha</p>
            <Linha rotulo="Quando" valor={`${ddmm(venda.dia)}${venda.hora ? ` · ${venda.hora}` : ""}`} />
            {venda.taxaCentavos !== null && <Linha rotulo="Taxa" valor={`${reais(venda.taxaCentavos)}${taxaBps !== null ? ` · ${pct(taxaBps)}` : ""}`} />}
            {venda.liquidoCentavos !== null && <Linha rotulo="Fica para você" valor={reais(venda.liquidoCentavos)} />}
            <Linha rotulo="Cai em" valor={venda.previsao ? ddmm(venda.previsao) : "a planilha não diz"} tom={venda.previsao ? "atencao" : undefined} />
          </div>
          <div className={estilos.coluna}>
            <p className={estilos.olho}>No Balcão</p>
            <p className={estilos.texto}>Nenhuma venda de <b>{reais(venda.brutoCentavos)}</b> nesse dia ou no seguinte.</p>
            {parecida ? (
              <div className={estilos.parecida}>
                <small>A mais parecida</small>
                <b>{numeroVenda(parecida.vendaNumero)} · {reais(parecida.valorCentavos)}</b>
                <small>{ddmm(parecida.dia)} · {parecida.hora} · {FORMA[parecida.forma] ?? parecida.forma} · {reais(Math.abs(parecida.valorCentavos - venda.brutoCentavos))} de diferença</small>
                <button type="button" onClick={() => aoResolver(item.id, `Certo: é a ${numeroVenda(parecida.vendaNumero)}, lançada com ${reais(parecida.valorCentavos)}. Se quiser o valor da maquininha, ajuste a venda no Balcão.`)} disabled={ocupado}>É esta</button>
              </div>
            ) : <p className={estilos.dica}>Nada parecido no valor. Se foi venda sua, lance.</p>}
          </div>
        </div>
        {mei && doMes !== null && doAno !== null && (
          <div className={estilos.muda}>
            <small>O que muda se lançar</small>
            <span>{MESES[Number(mes.slice(5, 7)) - 1]?.replace(/^./, (letra) => letra.toUpperCase())}: {reais(doMes)} <em>→</em> <b>{reais(doMes + venda.brutoCentavos)}</b></span>
            {doAnoDeste && <span>Limite do MEI: {pct(Math.round((doAno * 10_000) / mei.limiteAnualCentavos))} <em>→</em> <b>{pct(Math.round(((doAno + venda.brutoCentavos) * 10_000) / mei.limiteAnualCentavos))}</b> de {reais(mei.limiteAnualCentavos)}</span>}
          </div>
        )}
        <div className={estilos.acoes}>
          <button type="button" className={base.botao} data-principal onClick={() => aoLancar(item)} disabled={ocupado}>Lançar no Balcão</button>
          <button type="button" className={base.botao} onClick={() => aoResolver(item.id)} disabled={ocupado}>Não é venda minha</button>
        </div>
      </section>
    )
  }

  if (item.tipo === "balcao") {
    const { pagamento } = item
    return (
      <section className={`${base.bloco} ${estilos.ficha}`} aria-label="Só no Balcão">
        <header><p className={estilos.olho}>Só no Balcão</p><h2>Está no Balcão e não passou nesta maquininha</h2></header>
        <div className={estilos.valor}><span className={base.grande}><Reais centavos={pagamento.valorCentavos} /></span><small>{FORMA[pagamento.forma] ?? pagamento.forma}</small></div>
        <div className={estilos.coluna}>
          <Linha rotulo="Venda" valor={numeroVenda(pagamento.vendaNumero)} />
          <Linha rotulo="Quando" valor={`${ddmm(pagamento.dia)} · ${pagamento.hora}`} />
          <Linha rotulo="O Tino espera que caia" valor={ddmm(pagamento.previsao)} />
        </div>
        <p className={estilos.dica}>Pode ter sido cancelada na maquininha, passada em outra maquininha, ou paga de outro jeito e lançada como cartão. Se foi cancelada, cancele a venda no Balcão: o faturamento do MEI cai junto.</p>
        <div className={estilos.acoes}>
          <button type="button" className={base.botao} data-principal onClick={() => aoResolver(item.id)} disabled={ocupado}>Está certo assim</button>
          <Link href="/loja" className={base.botao}>Ir ao Balcão</Link>
        </div>
      </section>
    )
  }

  const { ajuste, par } = item
  const balcao = par?.balcao
  return (
    <section className={`${base.bloco} ${estilos.ficha}`} aria-label={item.tipo === "taxa" ? "Taxa diferente" : "Outra data"}>
      <header><p className={estilos.olho}>{numeroVenda(ajuste.vendaNumero)}</p><h2>{item.tipo === "taxa" ? "A maquininha cobrou outra taxa" : ajuste.recebidoEm ? "A maquininha já pagou" : "Cai em outra data"}</h2></header>
      {balcao && <div className={estilos.valor}><span className={base.grande}><Reais centavos={balcao.valorCentavos} /></span><small>{FORMA[balcao.forma] ?? balcao.forma} · {ddmm(balcao.dia)}</small></div>}
      {balcao && (
        <div className={estilos.lados}>
          <div className={estilos.coluna}>
            <p className={estilos.olho}>O Tino tinha</p>
            {item.tipo === "taxa" ? <><Linha rotulo="Taxa" valor={`${reais(balcao.valorCentavos - balcao.liquidoCentavos)} · ${pct(balcao.taxaBps)}`} /><Linha rotulo="Fica para você" valor={reais(balcao.liquidoCentavos)} /></>
              : <Linha rotulo="Cai em" valor={ddmm(balcao.previsao)} />}
          </div>
          <div className={estilos.coluna} data-forte>
            <p className={estilos.olho}>A maquininha diz</p>
            {item.tipo === "taxa" && ajuste.liquidoCentavos !== undefined ? <><Linha rotulo="Taxa" valor={`${reais(balcao.valorCentavos - ajuste.liquidoCentavos)} · ${pct(Math.round(((balcao.valorCentavos - ajuste.liquidoCentavos) * 10_000) / balcao.valorCentavos))}`} tom="atencao" /><Linha rotulo="Fica para você" valor={reais(ajuste.liquidoCentavos)} /></>
              : <Linha rotulo={ajuste.recebidoEm ? "Caiu em" : "Cai em"} valor={ddmm((ajuste.recebidoEm ?? ajuste.previsao)!)} tom="atencao" />}
          </div>
        </div>
      )}
      {par?.avisos.length ? <p className={estilos.dica}>{par.avisos.map((aviso) => aviso.texto).join(" ")}</p> : null}
      {item.tipo === "taxa" && <p className={estilos.dica}>Se a maquininha mudou a taxa, atualize em &quot;Taxas da maquininha&quot;, em Finanças da loja: as próximas vendas já saem certas.</p>}
      <div className={estilos.acoes}>
        <button type="button" className={base.botao} data-principal onClick={() => aoCorrigir(item)} disabled={ocupado}>Corrigir no Tino</button>
        <button type="button" className={base.botao} onClick={() => aoResolver(item.id)} disabled={ocupado}>Deixar como está</button>
      </div>
    </section>
  )
}

function Linha({ rotulo, valor, tom }: { rotulo: string; valor: string; tom?: "atencao" }) {
  return <div className={estilos.linha}><span>{rotulo}</span><b data-tom={tom}>{valor}</b></div>
}
