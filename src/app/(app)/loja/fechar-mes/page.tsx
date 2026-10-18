"use client"

import { useCallback, useEffect, useState } from "react"
import { ChevronLeft, ChevronRight, Download, Clock, FileText, Package, Paperclip, Printer } from "lucide-react"

import { buscar, enviar } from "@/lib/cliente"
import { rotuloCompetencia } from "@/lib/datas"
import { formatarMoeda } from "@/lib/dinheiro"
import { mesParaFechar, type LinhaDoRelatorio, type StatusDaNota } from "@/lib/loja/relatorio-mei"
import { formatarCnpj } from "@/lib/loja/ligar-negocio"
import { Aviso, Cartao } from "@/components/ui/painel"
import { EsqueletoLinhas } from "@/components/ui/skeleton"
import estilos from "./fechar.module.css"

/**
 * Fechar o mês, opção G do passo 41b (Davi, 14/10/2026): uma venda por vez, em
 * cartão grande, com um anel que mostra quanto já foi resolvido. A pergunta é
 * a mesma de sempre ("esta venda teve nota fiscal?") e as respostas também:
 * anexar a nota (a venda vira "com nota"), "não teve nota" (vira "sem nota") ou
 * pular por agora. O relatório do Anexo X fica ao lado com a barra de
 * proporção, e o que já foi resolvido (com nota, sem nota) vira uma lista
 * recolhida embaixo, para tirar a nota ou desfazer.
 *
 * O relatório tem três colunas, com nota, sem nota e pendente, e pendente
 * nunca é somado em "sem nota" por omissão. No celular tudo empilha, com o
 * cartão da venda primeiro, porque é onde a pessoa age.
 */

interface Venda { id: string; numero: number; dia: string; cliente: string | null; totalCentavos: number; status: StatusDaNota; notaNumero: number | null; notaEmitida: boolean; anexo: { nome: string; tamanhoBytes: number } | null }
interface Dados {
  competencia: string
  prazo: string
  empresa: { razaoSocial: string | null; cnpj: string | null }
  relatorio: { comercio: LinhaDoRelatorio; industria: LinhaDoRelatorio; servicos: LinhaDoRelatorio; totalCentavos: number; pendenteCentavos: number }
  usouLancamento: boolean
  vendas: Venda[]
  pendentes: number
  comNota: number
  semNota: number
  balcaoCentavos: number
  lancadoCentavos: number
  das: { registrado: boolean; pago: boolean }
}

const dataCurta = (dia: string) => dia.split("-").reverse().slice(0, 2).join("/")
const somarMes = (competencia: string, delta: number) => {
  const [ano, mes] = competencia.split("-").map(Number)
  const indice = ano * 12 + (mes - 1) + delta
  return `${Math.floor(indice / 12)}-${String((indice % 12) + 1).padStart(2, "0")}`
}
// O token "atenção" do tema é um cinza amarelado que some ao lado do verde; a barra e a legenda usam âmbar claro, o mesmo do desenho aprovado.
const AMBAR = "oklch(0.84 0.14 75)"
const BOTAO = "min-h-11 rounded-full px-4 text-[calc(13.5px*var(--escala-letra))]"
const TIPOS_DO_ARQUIVO = ".pdf,.xml,.png,.jpg,.jpeg,application/pdf,text/xml,application/xml,image/png,image/jpeg"

export default function FecharMes() {
  const [mes, setMes] = useState(() => mesParaFechar(new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" })))
  const [dados, setDados] = useState<Dados | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState<string | null>(null)
  // Quantas vendas a pessoa pulou nesta visita: o cartão mostra a próxima pendente, e pular só gira a fila.
  const [pulos, setPulos] = useState(0)

  const carregar = useCallback(async (alvo: string) => {
    try { setDados(await buscar<Dados>(`/api/loja/relatorio?mes=${alvo}`)); setErro(null) }
    catch (excecao) { setErro(excecao instanceof Error ? excecao.message : "Não consegui carregar o mês.") }
  }, [])
  useEffect(() => { setDados(null); setPulos(0); void carregar(mes) }, [mes, carregar])

  async function anexar(vendaId: string, arquivo: File | undefined) {
    if (!arquivo) return
    setOcupado(vendaId)
    setErro(null)
    try {
      const formulario = new FormData()
      formulario.set("vendaId", vendaId)
      formulario.set("arquivo", arquivo)
      const resposta = await fetch("/api/loja/relatorio/anexo", { method: "POST", body: formulario })
      if (!resposta.ok) throw new Error(((await resposta.json().catch(() => null)) as { erro?: string } | null)?.erro ?? "Não consegui anexar a nota.")
      await carregar(mes)
    } catch (excecao) { setErro(excecao instanceof Error ? excecao.message : "Não consegui anexar a nota.") }
    finally { setOcupado(null) }
  }

  async function naoTeveNota(vendaId: string, valor: boolean) {
    setOcupado(vendaId)
    try { await enviar("/api/loja/relatorio/nota", { vendaId, semNota: valor }, "PATCH"); await carregar(mes) }
    catch (excecao) { setErro(excecao instanceof Error ? excecao.message : "Não consegui marcar.") }
    finally { setOcupado(null) }
  }

  async function tirarAnexo(vendaId: string) {
    setOcupado(vendaId)
    try { await enviar(`/api/loja/relatorio/anexo?vendaId=${vendaId}`, {}, "DELETE"); await carregar(mes) }
    catch (excecao) { setErro(excecao instanceof Error ? excecao.message : "Não consegui tirar a nota.") }
    finally { setOcupado(null) }
  }

  const nome = rotuloCompetencia(mes)
  const pendentes = dados?.vendas.filter((venda) => venda.status === "pendente") ?? []
  const comNota = dados?.vendas.filter((venda) => venda.status === "com") ?? []
  const semNota = dados?.vendas.filter((venda) => venda.status === "sem") ?? []
  const resolvidasLista = dados?.vendas.filter((venda) => venda.status !== "pendente") ?? []
  const resolvidas = resolvidasLista.length
  const atual = pendentes.length ? pendentes[pulos % pendentes.length] : null
  // O lembrete só aparece enquanto há pendência: sem ela não há o que lembrar (mesma regra do aviso no sino).
  const lembrete = Boolean(dados && dados.pendentes > 0 && dados.vendas.length > 0)

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4">
      <div className={`${estilos.naoImprimir} flex items-center justify-between gap-2`}>
        <button type="button" aria-label="Mês anterior" className={`${BOTAO} border border-pauta`} onClick={() => setMes(somarMes(mes, -1))}><ChevronLeft className="size-4" aria-hidden /></button>
        <h2 className="text-[calc(18px*var(--escala-letra))] font-semibold first-letter:uppercase">{nome}</h2>
        <button type="button" aria-label="Próximo mês" className={`${BOTAO} border border-pauta`} onClick={() => setMes(somarMes(mes, 1))}><ChevronRight className="size-4" aria-hidden /></button>
      </div>

      {erro && <Aviso tom="critico">{erro}</Aviso>}
      {!dados && !erro && <Cartao estatico><EsqueletoLinhas linhas={4} /></Cartao>}

      {dados && (
        <>
          {lembrete && (
            <div className={`${estilos.naoImprimir} flex items-center gap-2.5 rounded-2xl border border-atencao/35 bg-atencao/10 px-3.5 py-3 text-[calc(13px*var(--escala-letra))] leading-snug`}>
              <Clock className="size-[17px] shrink-0 text-atencao" aria-hidden />
              <span>Guarde o relatório até <b>{dados.prazo.slice(0, 5)}</b>. Falta{dados.pendentes === 1 ? "" : "m"} <b>{dados.pendentes} {dados.pendentes === 1 ? "nota" : "notas"}</b>: anexe ou diga que a venda não teve.</span>
            </div>
          )}

          {dados.usouLancamento && (
            <div className={estilos.naoImprimir}>
              <Aviso tom="atencao">
                O relatório deste mês vale o que você lançou na tela MEI ({formatarMoeda(dados.lancadoCentavos)}), que não separa as vendas.
                {dados.vendas.length > 0 ? ` O Balcão tem ${formatarMoeda(dados.balcaoCentavos)} em ${dados.vendas.length} ${dados.vendas.length === 1 ? "venda" : "vendas"}: para o relatório separar com nota e sem nota, zere o lançamento do mês em MEI e DAS e ele passa a valer as vendas.` : " Não há vendas no Balcão neste mês para anexar nota."}
              </Aviso>
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start">
            <div className={`${estilos.naoImprimir} space-y-4`}>
              {dados.vendas.length > 0 && (
                <div className="flex items-center gap-4">
                  <Anel resolvidas={resolvidas} total={dados.vendas.length} />
                  <div className="min-w-0">
                    <p className="text-[calc(17px*var(--escala-letra))] font-semibold">{pendentes.length === 0 ? "Tudo resolvido" : `${pendentes.length} ${pendentes.length === 1 ? "venda pendente" : "vendas pendentes"}`}</p>
                    <p className="mt-0.5 text-[calc(13px*var(--escala-letra))] leading-snug text-muted-fg">{pendentes.length === 0 ? "Todas as vendas do mês têm a nota ou foram marcadas como sem nota." : "Anexe a nota ou diga que não teve. Cada resposta tira a venda dos pendentes."}</p>
                  </div>
                </div>
              )}

              {atual && (
                <Cartao estatico>
                  <p className="text-[calc(11.5px*var(--escala-letra))] uppercase tracking-[0.14em] text-muted-fg">Venda {atual.numero} · {dataCurta(atual.dia)}</p>
                  <div className="mt-2 flex items-baseline justify-between gap-3">
                    <b className="min-w-0 truncate text-[calc(22px*var(--escala-letra))] font-medium">{atual.cliente ?? "Sem cliente"}</b>
                    <span className="numero shrink-0 text-[calc(26px*var(--escala-letra))] font-light">{formatarMoeda(atual.totalCentavos)}</span>
                  </div>
                  <p className="mt-3 text-[calc(14px*var(--escala-letra))] text-muted-fg">Esta venda teve nota fiscal?</p>
                  <div className="mt-3 grid gap-2.5">
                    <label className={`inline-flex min-h-[54px] cursor-pointer items-center justify-center gap-2 rounded-full bg-primary px-5 text-[calc(16px*var(--escala-letra))] font-semibold text-primary-foreground ${ocupado === atual.id ? "opacity-50" : ""}`}>
                      <Paperclip className="size-5" aria-hidden />Anexar a nota
                      <input type="file" accept={TIPOS_DO_ARQUIVO} className="sr-only" aria-label={`Anexar a nota da venda ${atual.numero}`} disabled={ocupado === atual.id} onChange={(evento) => { void anexar(atual.id, evento.target.files?.[0]); evento.target.value = "" }} />
                    </label>
                    <button type="button" disabled={ocupado === atual.id} className="min-h-[50px] rounded-full border border-pauta px-5 text-[calc(15px*var(--escala-letra))]" onClick={() => void naoTeveNota(atual.id, true)}>Não teve nota</button>
                  </div>
                  {pendentes.length > 1 && <button type="button" className="mt-3 block min-h-11 w-full text-center text-[calc(13px*var(--escala-letra))] text-muted-fg" onClick={() => setPulos(pulos + 1)}>Pular por agora ({pendentes.length - 1} {pendentes.length - 1 === 1 ? "outra" : "outras"})</button>}
                  <p className="mt-1 text-center text-[calc(12px*var(--escala-letra))] text-muted-fg">PDF, XML ou foto, até 3 MB.</p>
                </Cartao>
              )}

              {resolvidasLista.length > 0 && (
                <details className="ficha p-4 sm:p-5">
                  <summary className="min-h-11 cursor-pointer text-[calc(14px*var(--escala-letra))] font-semibold">Resolvidas · {resolvidasLista.length} <span className="font-normal text-muted-fg">({comNota.length} com nota, {semNota.length} sem nota)</span></summary>
                  <ul className="mt-2 divide-y divide-pauta">
                    {resolvidasLista.map((venda) => (
                      <li key={venda.id} className="flex items-center justify-between gap-3 py-2.5 text-[calc(14px*var(--escala-letra))]">
                        <span className="min-w-0">
                          {venda.status === "com" ? (
                            venda.anexo ? <a className="inline-flex max-w-full items-center gap-1.5 font-medium text-primary" href={`/api/loja/relatorio/anexo?vendaId=${venda.id}`}><Paperclip className="size-4 shrink-0" aria-hidden /><span className="truncate">{venda.anexo.nome}</span></a> : <span className="font-medium">Nota {venda.notaNumero ?? "sem número"} · emitida no Tino</span>
                          ) : <span className="font-medium">Sem nota</span>}
                          <span className="block text-[calc(12px*var(--escala-letra))] text-muted-fg">Venda {venda.numero}{venda.cliente ? ` · ${venda.cliente}` : ""} · {dataCurta(venda.dia)} · {formatarMoeda(venda.totalCentavos)}</span>
                        </span>
                        {venda.status === "sem" && <button type="button" disabled={ocupado === venda.id} className={`${BOTAO} shrink-0 border border-pauta`} onClick={() => void naoTeveNota(venda.id, false)}>Desfazer</button>}
                        {venda.status === "com" && venda.anexo && <button type="button" disabled={ocupado === venda.id} className={`${BOTAO} shrink-0 border border-pauta`} onClick={() => void tirarAnexo(venda.id)}>Tirar</button>}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>

          {/* A folha do relatório: é o que sai na impressão. */}
            <div className="space-y-4">
          <section className={`${estilos.folha} ficha w-full p-4 sm:p-5`} aria-label="Relatório Mensal das Receitas Brutas">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-[calc(16px*var(--escala-letra))] font-semibold">Relatório Mensal das Receitas Brutas</h3>
              <span className="shrink-0 rounded-full bg-foreground/[0.07] px-2.5 py-0.5 text-xs text-muted-fg">{nome}</span>
            </div>
            <p className="mt-1 text-[calc(12px*var(--escala-letra))] text-muted-fg">{dados.empresa.razaoSocial ?? "Seu MEI"}{dados.empresa.cnpj ? ` · CNPJ ${formatarCnpj(dados.empresa.cnpj)}` : ""}</p>

            <div className="mt-3 text-[calc(13px*var(--escala-letra))]">
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 border-b border-pauta pb-1.5 text-[calc(11.5px*var(--escala-letra))] text-muted-fg">
                <span>Receita de {nome}</span><span className="text-right">sem nota</span><span className="text-right">com nota</span><span className="text-right">pendente</span>
              </div>
              <Linha rotulo="Revenda de mercadorias (comércio)" linha={dados.relatorio.comercio} />
              <Linha rotulo="Venda de produtos que você fabrica (indústria)" linha={dados.relatorio.industria} />
              <Linha rotulo="Prestação de serviços" linha={dados.relatorio.servicos} />
              <div className="flex justify-between pt-2 text-[calc(15px*var(--escala-letra))] font-bold"><span>Total do mês</span><span className="numero">{formatarMoeda(dados.relatorio.totalCentavos)}</span></div>
            </div>

            <Proporcao relatorio={dados.relatorio} />

            {dados.relatorio.pendenteCentavos > 0 && (
              <p className="mt-2 text-[calc(12px*var(--escala-letra))] text-atencao">{formatarMoeda(dados.relatorio.pendenteCentavos)} pendentes: ninguém anexou a nota nem confirmou que não teve. Resolva acima para o relatório ficar completo.</p>
            )}
            {dados.usouLancamento && <p className="mt-2 text-[calc(12px*var(--escala-letra))] text-muted-fg">Mês lançado à parte na tela MEI: o valor vale o lançamento e fica pendente, porque o lançamento não separa as vendas.</p>}
            <p className="mt-2 text-[calc(11.5px*var(--escala-letra))] leading-snug text-muted-fg">
              Modelo do Anexo X da Resolução CGSN 140/2018. Prazo: {dados.prazo}. Não se entrega a ninguém: guarde por 5 anos, junto das notas de compra e de venda. Indústria o Tino não separa: se você fabrica o que vende, diga ao contador. Regra lida em fontes secundárias em 08/10/2026 (os sites da Receita não abriram); confira no texto oficial com o seu contador.
            </p>
          </section>

          <div className={`${estilos.naoImprimir} flex flex-wrap gap-2`}>
            <button type="button" className={`${BOTAO} inline-flex items-center gap-2 bg-primary font-semibold text-primary-foreground`} onClick={() => window.print()}><Printer className="size-4" aria-hidden />Imprimir ou salvar em PDF</button>
            <a className={`${BOTAO} inline-flex items-center gap-2 border border-pauta`} href={`/api/loja/relatorio/pacote?mes=${mes}`}><Package className="size-4" aria-hidden />Pacote do contador (.zip)</a>
            <a className={`${BOTAO} inline-flex items-center gap-2 border border-pauta`} href={`/api/loja/relatorio/planilha?mes=${mes}`}><Download className="size-4" aria-hidden />Planilha das vendas</a>
          </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function Item({ feito, texto }: { feito: boolean; texto: string }) {
  return (
    <li className="flex items-center gap-2.5">
      <span aria-hidden className={`grid size-5 shrink-0 place-items-center rounded-md border ${feito ? "border-positivo bg-positivo/15 text-positivo" : "border-pauta"}`}>{feito ? "✓" : ""}</span>
      <span className={feito ? "" : "text-muted-fg"}>{texto}</span>
    </li>
  )
}

function Linha({ rotulo, linha }: { rotulo: string; linha: LinhaDoRelatorio }) {
  const valor = (centavos: number) => formatarMoeda(centavos).replace("R$ ", "")
  return (
    <div className="grid grid-cols-[1fr_auto_auto_auto] items-baseline gap-x-3 border-b border-pauta py-1.5">
      <span>{rotulo}</span>
      <span className="numero text-right">{valor(linha.semCentavos)}</span>
      <span className="numero text-right">{valor(linha.comCentavos)}</span>
      <span className="numero text-right text-atencao">{valor(linha.pendenteCentavos)}</span>
    </div>
  )
}

/** O anel de progresso da opção G: quantas vendas do mês já foram resolvidas. */
function Anel({ resolvidas, total }: { resolvidas: number; total: number }) {
  const circunferencia = 2 * Math.PI * 35
  const parte = total > 0 ? (resolvidas / total) * circunferencia : 0
  return (
    <div className="relative size-[84px] shrink-0" role="img" aria-label={`${resolvidas} de ${total} vendas resolvidas`}>
      <svg width="84" height="84" viewBox="0 0 84 84" aria-hidden>
        <circle cx="42" cy="42" r="35" fill="none" className="stroke-foreground/10" strokeWidth="6" />
        <circle cx="42" cy="42" r="35" fill="none" className="stroke-primary" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${parte} ${circunferencia}`} transform="rotate(-90 42 42)" />
      </svg>
      <span className="absolute inset-0 grid place-content-center text-center leading-tight"><b className="text-[calc(22px*var(--escala-letra))] font-medium">{resolvidas}</b><span className="text-[11px] text-muted-fg">de {total}</span></span>
    </div>
  )
}

/** A proporção do mês numa barra só: com nota, sem nota e pendente, nas cores e com os valores. */
function Proporcao({ relatorio }: { relatorio: Dados["relatorio"] }) {
  const com = relatorio.comercio.comCentavos + relatorio.industria.comCentavos + relatorio.servicos.comCentavos
  const sem = relatorio.comercio.semCentavos + relatorio.industria.semCentavos + relatorio.servicos.semCentavos
  const pend = relatorio.pendenteCentavos
  if (relatorio.totalCentavos <= 0) return null
  const ponto = (cor: string, texto: string, fundo?: string) => <span className="inline-flex items-center gap-1.5"><i className={`size-[7px] rounded-full ${cor}`} style={fundo ? { background: fundo } : undefined} />{texto}</span>
  return (
    <div className="mt-3 grid gap-2" aria-label="Proporção do mês">
      <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-full">
        {com > 0 && <i className="bg-primary" style={{ flex: com, minWidth: 6 }} />}
        {sem > 0 && <i className="bg-muted-fg" style={{ flex: sem, minWidth: 6 }} />}
        {pend > 0 && <i style={{ flex: pend, background: AMBAR }} />}
      </div>
      <div className="flex flex-wrap gap-x-3.5 gap-y-1 text-[calc(12px*var(--escala-letra))] text-muted-fg">
        {ponto("bg-primary", `com nota ${formatarMoeda(com)}`)}{ponto("bg-muted-fg", `sem nota ${formatarMoeda(sem)}`)}{ponto("", `pendente ${formatarMoeda(pend)}`, AMBAR)}
      </div>
    </div>
  )
}
