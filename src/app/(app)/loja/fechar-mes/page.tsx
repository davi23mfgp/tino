"use client"

import { useCallback, useEffect, useState } from "react"
import { ChevronLeft, ChevronRight, Download, FileText, Paperclip, Printer } from "lucide-react"

import { buscar, enviar } from "@/lib/cliente"
import { rotuloCompetencia } from "@/lib/datas"
import { formatarMoeda } from "@/lib/dinheiro"
import { mesParaFechar, type LinhaDoRelatorio, type StatusDaNota } from "@/lib/loja/relatorio-mei"
import { formatarCnpj } from "@/lib/loja/ligar-negocio"
import { Aviso, Cartao } from "@/components/ui/painel"
import { EsqueletoLinhas } from "@/components/ui/skeleton"
import estilos from "./fechar.module.css"

/**
 * Fechar o mês (passo 41, Davi, 08/10/2026: "A e B misturado, quero meu
 * relatório e minhas notas também"). Do B vem a lista curta antes de gerar, com
 * a pergunta que falta ao Tino ("essa venda saiu com nota?"); do A vem o
 * relatório do Anexo X pronto na tela, para guardar ou mandar ao contador, e as
 * notas do mês logo abaixo.
 *
 * Nada aqui trava o mês: marcar a nota de uma venda pode ser refeito a
 * qualquer hora, e o relatório se recalcula. O que a tela não faz é decidir
 * por você: venda sem marcação aparece como "não marcado", nunca como "sem nota".
 */

interface Venda { id: string; numero: number; dia: string; cliente: string | null; totalCentavos: number; status: StatusDaNota; notaNumero: number | null; notaEmitida: boolean; anexo: { nome: string; tamanhoBytes: number } | null; pendencia: "marcar" | "anexar" | null }
interface Dados {
  competencia: string
  prazo: string
  empresa: { razaoSocial: string | null; cnpj: string | null }
  relatorio: { comercio: LinhaDoRelatorio; industria: LinhaDoRelatorio; servicos: LinhaDoRelatorio; totalCentavos: number; naoMarcadoCentavos: number }
  usouLancamento: boolean
  vendas: Venda[]
  pendentes: number
  aMarcar: number
  aAnexar: number
  notasEmitidas: number
  das: { registrado: boolean; pago: boolean }
}

const dataCurta = (dia: string) => dia.split("-").reverse().slice(0, 2).join("/")
const somarMes = (competencia: string, delta: number) => {
  const [ano, mes] = competencia.split("-").map(Number)
  const indice = ano * 12 + (mes - 1) + delta
  return `${Math.floor(indice / 12)}-${String((indice % 12) + 1).padStart(2, "0")}`
}
const BOTAO = "min-h-11 rounded-full px-4 text-[calc(13.5px*var(--escala-letra))]"

export default function FecharMes() {
  const [mes, setMes] = useState(() => mesParaFechar(new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" })))
  const [dados, setDados] = useState<Dados | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState<string | null>(null)

  const carregar = useCallback(async (alvo: string) => {
    try { setDados(await buscar<Dados>(`/api/loja/relatorio?mes=${alvo}`)); setErro(null) }
    catch (excecao) { setErro(excecao instanceof Error ? excecao.message : "Não consegui carregar o mês.") }
  }, [])
  useEffect(() => { setDados(null); void carregar(mes) }, [mes, carregar])

  async function marcar(vendaId: string, comNota: boolean | null) {
    setOcupado(vendaId)
    try { await enviar("/api/loja/relatorio/nota", { vendaId, comNota }, "PATCH"); await carregar(mes) }
    catch (excecao) { setErro(excecao instanceof Error ? excecao.message : "Não consegui marcar.") }
    finally { setOcupado(null) }
  }

  async function anexar(vendaId: string, arquivo: File | undefined) {
    if (!arquivo) return
    setOcupado(vendaId)
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

  async function tirarAnexo(vendaId: string) {
    setOcupado(vendaId)
    try { await enviar(`/api/loja/relatorio/anexo?vendaId=${vendaId}`, {}, "DELETE"); await carregar(mes) }
    catch (excecao) { setErro(excecao instanceof Error ? excecao.message : "Não consegui tirar a nota.") }
    finally { setOcupado(null) }
  }

  const nome = rotuloCompetencia(mes)
  // "Pendentes de nota": as vendas sem resposta (marcar) e as marcadas "com nota" sem a nota em mãos (anexar).
  const pendentes = dados?.vendas.filter((venda) => venda.pendencia !== null) ?? []
  const anexadas = dados?.vendas.filter((venda) => venda.anexo !== null) ?? []
  const emitidas = dados?.vendas.filter((venda) => venda.notaEmitida) ?? []

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <div className={`${estilos.naoImprimir} flex items-center justify-between gap-2`}>
        <button type="button" aria-label="Mês anterior" className={`${BOTAO} border border-pauta`} onClick={() => setMes(somarMes(mes, -1))}><ChevronLeft className="size-4" aria-hidden /></button>
        <h2 className="text-[calc(18px*var(--escala-letra))] font-semibold first-letter:uppercase">{nome}</h2>
        <button type="button" aria-label="Próximo mês" className={`${BOTAO} border border-pauta`} onClick={() => setMes(somarMes(mes, 1))}><ChevronRight className="size-4" aria-hidden /></button>
      </div>

      {erro && <Aviso tom="critico">{erro}</Aviso>}
      {!dados && !erro && <Cartao estatico><EsqueletoLinhas linhas={4} /></Cartao>}

      {dados && (
        <>
          <div className={estilos.naoImprimir}>
            <Cartao titulo={`Fechar ${nome}`} estatico>
              <ul className="space-y-2.5 text-[calc(14px*var(--escala-letra))]">
                <Item feito={dados.vendas.length > 0 || dados.usouLancamento} texto={dados.usouLancamento ? "Mês lançado à parte na tela MEI" : `${dados.vendas.length} ${dados.vendas.length === 1 ? "venda do Balcão" : "vendas do Balcão"} no mês`} />
                <Item feito={dados.das.pago} texto={dados.das.registrado ? (dados.das.pago ? `DAS de ${nome} pago` : `DAS de ${nome} ainda não pago`) : `DAS de ${nome}: sem registro`} />
                <Item feito={dados.vendas.length > 0 && pendentes.length === 0} texto={dados.usouLancamento ? "Nota das vendas: o lançamento à parte não separa" : pendentes.length ? `Pendentes de nota: ${pendentes.length} ${pendentes.length === 1 ? "venda" : "vendas"} (${dados.aMarcar} a marcar, ${dados.aAnexar} a anexar)` : "Nota de todas as vendas marcada e anexada"} />
              </ul>

              {!dados.usouLancamento && pendentes.length > 0 && (
                <div className="mt-4 divide-y divide-pauta border-t border-pauta" aria-label="Pendentes de nota">
                  {pendentes.map((venda) => (
                    <div key={venda.id} className="flex flex-wrap items-center gap-2 py-2.5">
                      <span className="min-w-0 flex-1 text-[calc(14px*var(--escala-letra))]">
                        Venda {venda.numero}{venda.cliente ? ` · ${venda.cliente}` : ""}
                        <span className="block text-[calc(12px*var(--escala-letra))] text-muted-fg">{formatarMoeda(venda.totalCentavos)} · {dataCurta(venda.dia)} · {venda.pendencia === "anexar" ? "falta anexar a nota" : "falta marcar"}</span>
                      </span>
                      {venda.pendencia === "marcar" ? (
                        <>
                          <button type="button" disabled={ocupado === venda.id} className={`${BOTAO} border border-pauta`} onClick={() => void marcar(venda.id, true)}>com nota</button>
                          <button type="button" disabled={ocupado === venda.id} className={`${BOTAO} border border-pauta`} onClick={() => void marcar(venda.id, false)}>sem nota</button>
                        </>
                      ) : (
                        <>
                          <label className={`${BOTAO} inline-flex cursor-pointer items-center gap-2 bg-primary font-semibold text-primary-foreground`}>
                            <Paperclip className="size-4" aria-hidden />Anexar nota
                            <input type="file" accept=".pdf,.xml,.png,.jpg,.jpeg,application/pdf,text/xml,application/xml,image/png,image/jpeg" className="sr-only" disabled={ocupado === venda.id} onChange={(evento) => { void anexar(venda.id, evento.target.files?.[0]); evento.target.value = "" }} />
                          </label>
                          <button type="button" disabled={ocupado === venda.id} className={`${BOTAO} border border-pauta`} onClick={() => void marcar(venda.id, false)}>sem nota</button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <p className="mt-3 text-[calc(12px*var(--escala-letra))] text-muted-fg">Marcar é só para o relatório. O que você não marcar aparece como &quot;não marcado&quot;, e o Tino não chuta. A venda &quot;com nota&quot; fica pendente até a nota estar anexada (a nota emitida pelo Tino já conta).</p>
            </Cartao>
          </div>

          {/* A folha do relatório: é o que sai na impressão. */}
          <section className={`${estilos.folha} ficha p-4 sm:p-5`} aria-label="Relatório Mensal das Receitas Brutas">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-[calc(16px*var(--escala-letra))] font-semibold">Relatório Mensal das Receitas Brutas</h3>
              <span className="shrink-0 rounded-full bg-foreground/[0.07] px-2.5 py-0.5 text-xs text-muted-fg">{nome}</span>
            </div>
            <p className="mt-1 text-[calc(12px*var(--escala-letra))] text-muted-fg">{dados.empresa.razaoSocial ?? "Seu MEI"}{dados.empresa.cnpj ? ` · CNPJ ${formatarCnpj(dados.empresa.cnpj)}` : ""}</p>

            <div className="mt-3 text-[calc(13px*var(--escala-letra))]">
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 border-b border-pauta pb-1.5 text-[calc(11.5px*var(--escala-letra))] text-muted-fg">
                <span>Receita de {nome}</span><span className="text-right">sem nota</span><span className="text-right">com nota</span><span className="text-right">não marcado</span>
              </div>
              <Linha rotulo="Revenda de mercadorias (comércio)" linha={dados.relatorio.comercio} />
              <Linha rotulo="Venda de produtos que você fabrica (indústria)" linha={dados.relatorio.industria} />
              <Linha rotulo="Prestação de serviços" linha={dados.relatorio.servicos} />
              <div className="flex justify-between pt-2 text-[calc(15px*var(--escala-letra))] font-bold"><span>Total do mês</span><span className="numero">{formatarMoeda(dados.relatorio.totalCentavos)}</span></div>
            </div>

            {dados.relatorio.naoMarcadoCentavos > 0 && (
              <p className="mt-2 text-[calc(12px*var(--escala-letra))] text-atencao">{formatarMoeda(dados.relatorio.naoMarcadoCentavos)} ainda sem marcar se saiu com nota. Marque acima para o relatório ficar completo.</p>
            )}
            {dados.usouLancamento && <p className="mt-2 text-[calc(12px*var(--escala-letra))] text-muted-fg">Este mês foi lançado à parte na tela MEI, que não separa com e sem nota: o valor vale o lançamento.</p>}
            <p className="mt-2 text-[calc(11.5px*var(--escala-letra))] leading-snug text-muted-fg">
              Modelo do Anexo X da Resolução CGSN 140/2018. Prazo: {dados.prazo}. Não se entrega a ninguém: guarde por 5 anos, junto das notas de compra e de venda. Indústria o Tino não separa: se você fabrica o que vende, diga ao contador. Regra lida em fontes secundárias em 08/10/2026 (os sites da Receita não abriram); confira no texto oficial com o seu contador.
            </p>
          </section>

          <div className={`${estilos.naoImprimir} flex flex-wrap gap-2`}>
            <button type="button" className={`${BOTAO} inline-flex items-center gap-2 bg-primary font-semibold text-primary-foreground`} onClick={() => window.print()}><Printer className="size-4" aria-hidden />Imprimir ou salvar em PDF</button>
            <a className={`${BOTAO} inline-flex items-center gap-2 border border-pauta`} href={`/api/loja/relatorio/planilha?mes=${mes}`}><Download className="size-4" aria-hidden />Vendas e notas (planilha)</a>
          </div>

          <div className={estilos.naoImprimir}>
            <Cartao titulo="Suas notas do mês" estatico>
              {emitidas.length === 0 && anexadas.length === 0 ? (
                <p className="flex items-start gap-2 text-[calc(13px*var(--escala-letra))] text-muted-fg"><FileText className="mt-0.5 size-4 shrink-0" aria-hidden />Nenhuma nota emitida pelo Tino nem anexada em {nome}. Para a venda &quot;com nota&quot;, anexe a cópia da nota (PDF, XML ou foto, até 3 MB) e ela fica guardada junto do relatório.</p>
              ) : (
                <ul className="divide-y divide-pauta">
                  {emitidas.map((venda) => (
                    <li key={venda.id} className="flex items-baseline justify-between gap-3 py-2.5 text-[calc(14px*var(--escala-letra))]">
                      <span>Nota {venda.notaNumero ?? "sem número"} · emitida no Tino<span className="block text-[calc(12px*var(--escala-letra))] text-muted-fg">Venda {venda.numero} · {dataCurta(venda.dia)}</span></span>
                      <span className="numero">{formatarMoeda(venda.totalCentavos)}</span>
                    </li>
                  ))}
                  {anexadas.map((venda) => (
                    <li key={venda.id} className="flex items-center justify-between gap-3 py-2.5 text-[calc(14px*var(--escala-letra))]">
                      <span className="min-w-0">
                        <a className="inline-flex max-w-full items-center gap-1.5 font-medium text-primary" href={`/api/loja/relatorio/anexo?vendaId=${venda.id}`}><Paperclip className="size-4 shrink-0" aria-hidden /><span className="truncate">{venda.anexo!.nome}</span></a>
                        <span className="block text-[calc(12px*var(--escala-letra))] text-muted-fg">Venda {venda.numero} · {dataCurta(venda.dia)} · {formatarMoeda(venda.totalCentavos)}</span>
                      </span>
                      <button type="button" disabled={ocupado === venda.id} className={`${BOTAO} shrink-0 border border-pauta`} onClick={() => void tirarAnexo(venda.id)}>Tirar</button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-[calc(12px*var(--escala-letra))] text-muted-fg">A planilha leva todas as vendas do mês, o status da nota e o número das notas emitidas. Notas de compra o Tino ainda não guarda.</p>
            </Cartao>
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
      <span className="numero text-right text-muted-fg">{valor(linha.naoMarcadoCentavos)}</span>
    </div>
  )
}
