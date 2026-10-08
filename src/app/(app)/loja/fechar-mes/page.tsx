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
 * Fechar o mês (passo 41, Davi, 08/10/2026). Duas colunas, como ele pediu: de um
 * lado as vendas COM NOTA (a nota anexada, ou emitida pelo Tino), do outro as
 * PENDENTES DE NOTA, que são todas as vendas sem a nota em mãos. A pessoa tira
 * a venda da pendência anexando a nota, e ela passa para a outra coluna. Não
 * existe "sem nota" como resposta: o relatório mostra o que está pendente, e o
 * contador cobra isso.
 *
 * No celular as colunas viram duas seções, com as pendentes primeiro, porque é
 * nelas que a pessoa age.
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
  das: { registrado: boolean; pago: boolean }
}

const dataCurta = (dia: string) => dia.split("-").reverse().slice(0, 2).join("/")
const somarMes = (competencia: string, delta: number) => {
  const [ano, mes] = competencia.split("-").map(Number)
  const indice = ano * 12 + (mes - 1) + delta
  return `${Math.floor(indice / 12)}-${String((indice % 12) + 1).padStart(2, "0")}`
}
const BOTAO = "min-h-11 rounded-full px-4 text-[calc(13.5px*var(--escala-letra))]"
const TIPOS_DO_ARQUIVO = ".pdf,.xml,.png,.jpg,.jpeg,application/pdf,text/xml,application/xml,image/png,image/jpeg"

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

  async function tirarAnexo(vendaId: string) {
    setOcupado(vendaId)
    try { await enviar(`/api/loja/relatorio/anexo?vendaId=${vendaId}`, {}, "DELETE"); await carregar(mes) }
    catch (excecao) { setErro(excecao instanceof Error ? excecao.message : "Não consegui tirar a nota.") }
    finally { setOcupado(null) }
  }

  const nome = rotuloCompetencia(mes)
  const pendentes = dados?.vendas.filter((venda) => venda.status === "pendente") ?? []
  const comNota = dados?.vendas.filter((venda) => venda.status === "com") ?? []

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
          <div className={estilos.naoImprimir}>
            <Cartao titulo={`Fechar ${nome}`} estatico>
              <ul className="space-y-2.5 text-[calc(14px*var(--escala-letra))]">
                <Item feito={dados.vendas.length > 0 || dados.usouLancamento} texto={dados.usouLancamento ? "Mês lançado à parte na tela MEI" : `${dados.vendas.length} ${dados.vendas.length === 1 ? "venda do Balcão" : "vendas do Balcão"} no mês`} />
                <Item feito={dados.das.pago} texto={dados.das.registrado ? (dados.das.pago ? `DAS de ${nome} pago` : `DAS de ${nome} ainda não pago`) : `DAS de ${nome}: sem registro`} />
                <Item feito={dados.vendas.length > 0 && dados.pendentes === 0} texto={dados.usouLancamento ? "Notas: o lançamento à parte não tem venda onde anexar" : dados.pendentes ? `${dados.pendentes} ${dados.pendentes === 1 ? "venda pendente" : "vendas pendentes"} de nota` : "Todas as vendas com a nota anexada"} />
              </ul>
            </Cartao>
          </div>

          {!dados.usouLancamento && (
            <div className={`${estilos.naoImprimir} grid gap-4 md:grid-cols-2 md:items-start`}>
              {/* Pendentes primeiro no celular (é onde se age); no computador, com nota à esquerda e pendentes à direita. */}
              <section aria-label="Pendentes de nota" className="order-1 md:order-2">
                <Cartao titulo={`Pendentes de nota · ${pendentes.length}`} estatico>
                  {pendentes.length === 0 ? (
                    <p className="text-[calc(13px*var(--escala-letra))] text-muted-fg">{dados.vendas.length === 0 ? `Nenhuma venda em ${nome}.` : "Nenhuma pendência: todas as vendas têm a nota."}</p>
                  ) : (
                    <div className="divide-y divide-pauta">
                      {pendentes.map((venda) => (
                        <div key={venda.id} className="flex flex-wrap items-center gap-2 py-2.5">
                          <span className="min-w-0 flex-1 text-[calc(14px*var(--escala-letra))]">
                            Venda {venda.numero}{venda.cliente ? ` · ${venda.cliente}` : ""}
                            <span className="block text-[calc(12px*var(--escala-letra))] text-muted-fg">{formatarMoeda(venda.totalCentavos)} · {dataCurta(venda.dia)}</span>
                          </span>
                          <label className={`${BOTAO} inline-flex cursor-pointer items-center gap-2 bg-primary font-semibold text-primary-foreground`}>
                            <Paperclip className="size-4" aria-hidden />Anexar nota
                            <input type="file" accept={TIPOS_DO_ARQUIVO} className="sr-only" aria-label={`Anexar a nota da venda ${venda.numero}`} disabled={ocupado === venda.id} onChange={(evento) => { void anexar(venda.id, evento.target.files?.[0]); evento.target.value = "" }} />
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="mt-3 text-[calc(12px*var(--escala-letra))] text-muted-fg">Anexe a cópia da nota (PDF, XML ou foto, até 3 MB) e a venda passa para &quot;com nota&quot;.</p>
                </Cartao>
              </section>

              <section aria-label="Com nota" className="order-2 md:order-1">
                <Cartao titulo={`Com nota · ${comNota.length}`} estatico>
                  {comNota.length === 0 ? (
                    <p className="flex items-start gap-2 text-[calc(13px*var(--escala-letra))] text-muted-fg"><FileText className="mt-0.5 size-4 shrink-0" aria-hidden />Nenhuma venda com a nota anexada em {nome} ainda.</p>
                  ) : (
                    <ul className="divide-y divide-pauta">
                      {comNota.map((venda) => (
                        <li key={venda.id} className="flex items-center justify-between gap-3 py-2.5 text-[calc(14px*var(--escala-letra))]">
                          <span className="min-w-0">
                            {venda.anexo ? (
                              <a className="inline-flex max-w-full items-center gap-1.5 font-medium text-primary" href={`/api/loja/relatorio/anexo?vendaId=${venda.id}`}><Paperclip className="size-4 shrink-0" aria-hidden /><span className="truncate">{venda.anexo.nome}</span></a>
                            ) : (
                              <span className="font-medium">Nota {venda.notaNumero ?? "sem número"} · emitida no Tino</span>
                            )}
                            <span className="block text-[calc(12px*var(--escala-letra))] text-muted-fg">Venda {venda.numero}{venda.cliente ? ` · ${venda.cliente}` : ""} · {dataCurta(venda.dia)} · {formatarMoeda(venda.totalCentavos)}</span>
                          </span>
                          {venda.anexo && <button type="button" disabled={ocupado === venda.id} className={`${BOTAO} shrink-0 border border-pauta`} onClick={() => void tirarAnexo(venda.id)}>Tirar</button>}
                        </li>
                      ))}
                    </ul>
                  )}
                </Cartao>
              </section>
            </div>
          )}

          {/* A folha do relatório: é o que sai na impressão. */}
          <section className={`${estilos.folha} ficha mx-auto w-full max-w-2xl p-4 sm:p-5`} aria-label="Relatório Mensal das Receitas Brutas">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-[calc(16px*var(--escala-letra))] font-semibold">Relatório Mensal das Receitas Brutas</h3>
              <span className="shrink-0 rounded-full bg-foreground/[0.07] px-2.5 py-0.5 text-xs text-muted-fg">{nome}</span>
            </div>
            <p className="mt-1 text-[calc(12px*var(--escala-letra))] text-muted-fg">{dados.empresa.razaoSocial ?? "Seu MEI"}{dados.empresa.cnpj ? ` · CNPJ ${formatarCnpj(dados.empresa.cnpj)}` : ""}</p>

            <div className="mt-3 text-[calc(13px*var(--escala-letra))]">
              <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 border-b border-pauta pb-1.5 text-[calc(11.5px*var(--escala-letra))] text-muted-fg">
                <span>Receita de {nome}</span><span className="text-right">com nota</span><span className="text-right">pendente de nota</span>
              </div>
              <Linha rotulo="Revenda de mercadorias (comércio)" linha={dados.relatorio.comercio} />
              <Linha rotulo="Venda de produtos que você fabrica (indústria)" linha={dados.relatorio.industria} />
              <Linha rotulo="Prestação de serviços" linha={dados.relatorio.servicos} />
              <div className="flex justify-between pt-2 text-[calc(15px*var(--escala-letra))] font-bold"><span>Total do mês</span><span className="numero">{formatarMoeda(dados.relatorio.totalCentavos)}</span></div>
            </div>

            {dados.relatorio.pendenteCentavos > 0 && (
              <p className="mt-2 text-[calc(12px*var(--escala-letra))] text-atencao">{formatarMoeda(dados.relatorio.pendenteCentavos)} em vendas ainda sem a nota anexada. Anexe acima para a pendência sair do relatório.</p>
            )}
            {dados.usouLancamento && <p className="mt-2 text-[calc(12px*var(--escala-letra))] text-muted-fg">Este mês foi lançado à parte na tela MEI, que não separa as vendas: o valor vale o lançamento e fica pendente, porque não há venda onde anexar a nota.</p>}
            <p className="mt-2 text-[calc(11.5px*var(--escala-letra))] leading-snug text-muted-fg">
              Modelo do Anexo X da Resolução CGSN 140/2018. Prazo: {dados.prazo}. Não se entrega a ninguém: guarde por 5 anos, junto das notas de compra e de venda. Indústria o Tino não separa: se você fabrica o que vende, diga ao contador. Regra lida em fontes secundárias em 08/10/2026 (os sites da Receita não abriram); confira no texto oficial com o seu contador.
            </p>
          </section>

          <div className={`${estilos.naoImprimir} mx-auto flex w-full max-w-2xl flex-wrap gap-2`}>
            <button type="button" className={`${BOTAO} inline-flex items-center gap-2 bg-primary font-semibold text-primary-foreground`} onClick={() => window.print()}><Printer className="size-4" aria-hidden />Imprimir ou salvar em PDF</button>
            <a className={`${BOTAO} inline-flex items-center gap-2 border border-pauta`} href={`/api/loja/relatorio/planilha?mes=${mes}`}><Download className="size-4" aria-hidden />Vendas e notas (planilha)</a>
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
    <div className="grid grid-cols-[1fr_auto_auto] items-baseline gap-x-4 border-b border-pauta py-1.5">
      <span>{rotulo}</span>
      <span className="numero text-right">{valor(linha.comCentavos)}</span>
      <span className="numero text-right text-atencao">{valor(linha.pendenteCentavos)}</span>
    </div>
  )
}
