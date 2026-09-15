"use client"

import Link from "next/link"
import estilos from "../analise/avancadas.module.css"
import topo from "./dividas.module.css"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import { useCallback, useEffect, useState } from "react"
import { Plus } from "lucide-react"

import { buscar, enviar } from "@/lib/cliente"
import { formatarMoeda, formatarPercentual, paraCentavos } from "@/lib/dinheiro"
import { Barra, Cartao, Metrica, Pilula, Vazio } from "@/components/ui/painel"
import { SelectNative } from "@/components/ui/select-native"
import { lerDivida } from "@/lib/tino/lingua-natural"
import { cn } from "@/lib/utils"
import { Destaque } from "@/components/ui/destaque"

/**
 * Dívidas.
 *
 * A tela existe para responder uma pergunta só: qual pagar primeiro. Por isso a
 * ordem de ataque e a comparação entre avalanche e bola de neve ficam acima da
 * lista — a lista é consequência, não o assunto.
 */

interface Divida {
  id: string
  credor: string
  tipo: string
  saldoDevedorCentavos: number
  jurosMensalBps: number
  parcelaCentavos: number
  parcelasTotal: number | null
  parcelasPagas: number
  diaVencimento: number
  quitada: boolean
  observacao: string | null
}

interface Plano {
  meses: number
  totalJurosCentavos: number
  quitacoes: { id: string; credor: string; mes: number }[]
}

interface Resposta {
  dividas: Divida[]
  estrategia: "AVALANCHE" | "BOLA_DE_NEVE" | "PROPORCIONAL"
  ordem: { id: string; credor: string; saldoDevedorCentavos: number; jurosMensalBps: number }[]
  plano: Plano | null
  comparativo: {
    avalanche: Plano
    bolaDeNeve: Plano
    economiaAvalancheCentavos: number
    mesesAMais: number
  } | null
  totalCentavos: number
  parcelaMensalCentavos: number
}

const TIPOS = [
  { valor: "CARTAO_ROTATIVO", rotulo: "Rotativo do cartão" },
  { valor: "CHEQUE_ESPECIAL", rotulo: "Cheque especial" },
  { valor: "EMPRESTIMO_PESSOAL", rotulo: "Empréstimo pessoal" },
  { valor: "CONSIGNADO", rotulo: "Consignado" },
  { valor: "FINANCIAMENTO_VEICULO", rotulo: "Financiamento de veículo" },
  { valor: "FINANCIAMENTO_IMOVEL", rotulo: "Financiamento de imóvel" },
  { valor: "ESTUDANTIL", rotulo: "Crédito estudantil" },
  { valor: "PARCELAMENTO", rotulo: "Parcelamento" },
  { valor: "OUTRO", rotulo: "Outro" },
]

const campo = "rounded-[var(--raio-campo)] border border-pauta bg-background px-3.5 py-2.5 text-[calc(13px*var(--escala-letra))] outline-none focus:border-acao/50"

const VAZIO = { credor: "", tipo: "EMPRESTIMO_PESSOAL", saldo: "", juros: "", parcela: "", parcelasTotal: "", pagas: "0", dia: "10" }

export default function Dividas() {
  const [dados, setDados] = useState<Resposta | null>(null)
  const [base, setBase] = useState<Resposta | null>(null)
  const [extraAplicado, setExtraAplicado] = useState("")
  const [simulando, setSimulando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [extra, setExtra] = useState("")
  const [nova, setNova] = useState(VAZIO)
  const [abrirForm, setAbrirForm] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [frase, setFrase] = useState("")

  const carregar = useCallback(async () => {
    try {
      setErro(null)
      const resposta = await buscar<Resposta>("/api/dividas?extraMensalCentavos=0")
      setBase(resposta)
      setDados(resposta)
      setExtra("")
      setExtraAplicado("")
    } catch (excecao) {
      setErro(excecao instanceof Error ? excecao.message : "Não foi possível carregar as dívidas.")
    }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  async function simularExtra(evento: React.FormEvent) {
    evento.preventDefault()
    setSimulando(true)
    setErro(null)
    try {
      const centavos = extra ? paraCentavos(extra) : 0
      if (centavos < 0) throw new Error("Informe um pagamento extra positivo.")
      setDados(await buscar<Resposta>("/api/dividas?extraMensalCentavos=" + centavos))
      setExtraAplicado(extra)
    } catch (excecao) {
      setErro(excecao instanceof Error ? excecao.message : "Não foi possível simular.")
    } finally {
      setSimulando(false)
    }
  }
  async function criar(evento: React.FormEvent) {
    evento.preventDefault()
    setOcupado(true)

    try {
      await enviar("/api/dividas", {
        credor: nova.credor,
        tipo: nova.tipo,
        saldoDevedorCentavos: paraCentavos(nova.saldo),
        // O usuário digita "2,5" pensando em 2,5% ao mês; o banco guarda em
        // pontos-base para a projeção não carregar float.
        jurosMensalBps: nova.juros ? Math.round(Number(nova.juros.replace(",", ".")) * 100) : 0,
        parcelaCentavos: nova.parcela ? paraCentavos(nova.parcela) : 0,
        parcelasTotal: nova.parcelasTotal ? Number(nova.parcelasTotal) : undefined,
        parcelasPagas: Number(nova.pagas) || 0,
        diaVencimento: Number(nova.dia) || 10,
      })
      setNova(VAZIO)
      setAbrirForm(false)
      await carregar()
    } catch (excecao) {
      setErro(excecao instanceof Error ? excecao.message : "Não foi possível salvar a dívida.")
    } finally {
      setOcupado(false)
    }
  }

  /**
   * Linguagem natural para dívidas — item 3 do redesign de experiência
   * (07/09/2026). Em vez de obrigar quem cadastra a preencher oito campos
   * separados, escreve como falaria e o Tino tenta preencher o formulário.
   * Não cadastra sozinho: preenche e deixa a pessoa conferir e completar o
   * que não deu para entender antes de "Adicionar dívida" — dívida errada
   * no plano de ataque é pior do que oito campos vazios.
   */
  function interpretarFrase() {
    if (!frase.trim()) return
    const lida = lerDivida(frase)
    setNova((atual) => ({
      ...atual,
      credor: lida.credor ?? atual.credor,
      tipo: lida.tipo ?? atual.tipo,
      saldo: lida.saldoDevedorCentavos !== null ? String(lida.saldoDevedorCentavos / 100).replace(".", ",") : atual.saldo,
      juros: lida.jurosMensalBps !== null ? String(lida.jurosMensalBps / 100).replace(".", ",") : atual.juros,
      parcela: lida.parcelaCentavos !== null ? String(lida.parcelaCentavos / 100).replace(".", ",") : atual.parcela,
      parcelasTotal: lida.parcelasTotal !== null ? String(lida.parcelasTotal) : atual.parcelasTotal,
      pagas: lida.parcelasPagas !== null ? String(lida.parcelasPagas) : atual.pagas,
      dia: lida.diaVencimento !== null ? String(lida.diaVencimento) : atual.dia,
    }))
    setAbrirForm(true)
    setFrase("")
  }

  const abertas = dados?.dividas.filter((divida) => !divida.quitada) ?? []
  const quitadas = dados?.dividas.filter((divida) => divida.quitada) ?? []
  const comparativo = dados?.comparativo

  return (
    <div className={cn(estilos.pagina, "space-y-4")}>
      {erro && <Cartao><p role="alert" className="text-sm">{erro}</p><Button variant="outline" onClick={carregar} disabled={simulando || ocupado} className="mt-3">Recarregar dívidas</Button></Cartao>}
      {dados && abertas.length > 0 && (
        <section className={topo.topo}>
          <div>
            <p className={topo.rotulo}>O que você deve hoje</p>
            <p className={topo.total}>{formatarMoeda(dados.totalCentavos)}</p>
            {/* Eram três linhas de prosa dizendo o que cabe em três etiquetas.
                A regra de mínimo de texto vale aqui: rótulo e número. */}
            <div className={topo.etiquetas}>
              <Pilula>{abertas.length} {abertas.length === 1 ? "dívida" : "dívidas"}</Pilula>
              <Pilula>{formatarMoeda(dados.parcelaMensalCentavos)} por mês</Pilula>
              {dados.plano && dados.plano.quitacoes.length === abertas.length ? (
                <>
                  <Pilula tom="positivo">livre em {dados.plano.meses} meses</Pilula>
                  <Pilula tom="atencao">{formatarMoeda(dados.plano.totalJurosCentavos)} de juros no caminho</Pilula>
                </>
              ) : (
                <Pilula tom="negativo">o ritmo atual não fecha a conta</Pilula>
              )}
            </div>
          </div>
          {dados.ordem[0] && (
            <Destaque
              className={topo.alvo}
              rotulo="Pague esta primeira"
              titulo={dados.ordem[0].credor}
              apoio={
                dados.ordem[0].jurosMensalBps > 0
                  ? `Juro mais caro da fila: ${formatarPercentual(dados.ordem[0].jurosMensalBps)} ao mês. Cada real extra rende mais aqui.`
                  : "Sem juros enquanto paga integral. Mantenha em dia para não virar rotativo."
              }
              acao={{ href: "/plano", texto: "Ver o plano completo" }}
              acaoSecundaria={{ href: "/orcamento", texto: "De onde tirar o dinheiro" }}
            />
          )}
        </section>
      )}

      <Cartao titulo={`Suas dívidas (${abertas.length})`}>
        {dados && abertas.length === 0 && (
          <Vazio titulo="Nenhuma dívida em aberto" texto="Se tiver alguma fora do app, cadastre para entrar no plano." />
        )}

        <div className="space-y-2">
          {abertas.map((divida) => {
            const progresso = divida.parcelasTotal ? (divida.parcelasPagas / divida.parcelasTotal) * 100 : 0
            return (
              <div key={divida.id} className="rounded-[var(--raio-cartao)] border border-pauta p-3.5">
                <div className="linha-financeira">
                  <div className="min-w-0">
                    <p className="truncate text-[calc(14px*var(--escala-letra))] font-medium">{divida.credor}</p>
                    <p className="text-[max(10px,calc(12px*var(--escala-letra)))] text-muted-fg">
                      {TIPOS.find((tipo) => tipo.valor === divida.tipo)?.rotulo ?? divida.tipo}
                      {divida.parcelaCentavos > 0 && ` · ${formatarMoeda(divida.parcelaCentavos)}/mês`}
                      {divida.parcelasTotal && ` · ${divida.parcelasPagas}/${divida.parcelasTotal}`}
                      {` · vence dia ${divida.diaVencimento}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="whitespace-nowrap text-[calc(16px*var(--escala-letra))] font-semibold tabular-nums">
                      <span className="valor-inteiro">{formatarMoeda(divida.saldoDevedorCentavos)}</span>
                    </p>
                    {divida.jurosMensalBps > 0 && (
                      <p className={cn("text-[max(10px,calc(12px*var(--escala-letra)))]", divida.jurosMensalBps >= 500 ? "text-negativo" : "text-muted-fg")}>
                        {formatarPercentual(divida.jurosMensalBps)} ao mês
                      </p>
                    )}
                  </div>
                </div>

                {divida.parcelasTotal ? (
                  <div className="mt-2.5">
                    <Barra percentual={progresso} tom="verde" />
                  </div>
                ) : null}

                {divida.observacao && <p className="mt-2 text-[max(10px,calc(12px*var(--escala-letra)))] text-muted-fg">{divida.observacao}</p>}
              </div>
            )
          })}
        </div>

        {quitadas.length > 0 && (
          <p className="mt-4 text-[calc(12px*var(--escala-letra))] text-positivo">{quitadas.length} dívida(s) já quitada(s).</p>
        )}
      </Cartao>

      <Cartao
        titulo="Dívidas"
        acao={
          <Button onClick={() => setAbrirForm((atual) => !atual)} variant="outline" disabled={simulando} className="flex items-center gap-1.5">
            <Plus className="size-3.5" /> Nova dívida
          </Button>
        }
      >
        <div className="grade-valores">
          <Metrica rotulo="Total devido" valor={dados ? formatarMoeda(dados.totalCentavos) : "—"} tom="negativo" />
          <Metrica rotulo="Parcelas por mês" valor={dados ? formatarMoeda(dados.parcelaMensalCentavos) : "—"} />
          <Metrica
            rotulo="Livre em"
            valor={dados?.plano ? dados.plano.quitacoes.length === abertas.length ? dados.plano.meses + " meses" : "Além de 50 anos" : "—"}
            detalhe={dados?.plano ? `${formatarMoeda(dados.plano.totalJurosCentavos)} de juros no caminho` : undefined}
            tom={dados?.plano ? "atencao" : "neutro"}
          />
        </div>

        <form onSubmit={simularExtra} className="mt-4 rounded-[20px] border border-foreground/20 bg-papel-2 p-4 sm:p-5">
          {/* Titulo, subtitulo, rotulo do campo, campo, botao e ressalva eram
              seis linhas empilhadas para pedir um numero. Agora o titulo diz o
              que a tela faz e o campo e o botao dividem a mesma linha. */}
          <h1 className="text-base font-semibold tracking-tight">Pagar mais por mês</h1>
          <div className="mt-3 flex items-center gap-2 rounded-full border border-pauta bg-papel-2 p-1.5">
            <input
              id="pagamento-extra"
              aria-label="Pagamento extra mensal"
              value={extra}
              onChange={(evento) => setExtra(evento.target.value)}
              disabled={simulando || ocupado}
              placeholder="R$ 0,00"
              className="min-w-0 flex-1 bg-transparent px-3 text-[calc(14px*var(--escala-letra))] tabular-nums outline-none"
              inputMode="decimal"
            />
            <Button type="submit" disabled={simulando || ocupado || !base || abertas.length === 0}>{simulando ? "Calculando…" : "Simular"}</Button>
          </div>
          {extra !== extraAplicado && <p role="status" className="mt-3 text-sm">Valor alterado. Simule para atualizar o resultado.</p>}
          {base?.plano && dados?.plano && extra === extraAplicado && (
            <div aria-live="polite" className="mt-4 space-y-4">
              <div className="grade-valores">
                <div className="rounded-xl border border-pauta bg-background p-4">
                  <p className="text-xs text-muted-fg">Sem pagamento extra</p>
                  <p className="mt-2 text-lg font-semibold">{base.plano.quitacoes.length === abertas.length ? base.plano.meses + " meses" : "Não quita em 50 anos"}</p>
                  <p className="mt-1 text-sm"><span className="valor-inteiro">{formatarMoeda(base.plano.totalJurosCentavos)}</span> em juros</p>
                </div>
                <div className="rounded-xl border border-foreground/30 bg-background p-4">
                  <p className="text-xs text-muted-fg">Com pagamento extra</p>
                  <p className="mt-2 text-lg font-semibold">{dados.plano.quitacoes.length === abertas.length ? dados.plano.meses + " meses" : "Não quita em 50 anos"}</p>
                  <p className="mt-1 text-sm"><span className="valor-inteiro">{formatarMoeda(dados.plano.totalJurosCentavos)}</span> em juros</p>
                </div>
              </div>
              {extraAplicado && base.plano.quitacoes.length === abertas.length && dados.plano.quitacoes.length === abertas.length && (
                <p className="text-sm font-semibold">
                  {base.plano.meses - dados.plano.meses} meses a menos · <span className="valor-inteiro">{formatarMoeda(base.plano.totalJurosCentavos - dados.plano.totalJurosCentavos)}</span> de economia
                </p>
              )}
              {(base.plano.quitacoes.length !== abertas.length || dados.plano.quitacoes.length !== abertas.length) && <p className="text-xs text-muted-fg">Juros acumulados até quitar ou completar 50 anos.</p>}
            </div>
          )}
        </form>
        {abrirForm && (
          <form onSubmit={criar} className="mt-4 grid gap-2 sm:grid-cols-3">
            <div className="flex flex-wrap gap-2 sm:col-span-3">
              <input
                value={frase}
                onChange={(evento) => setFrase(evento.target.value)}
                onKeyDown={(evento) => {
                  if (evento.key === "Enter") {
                    evento.preventDefault()
                    interpretarFrase()
                  }
                }}
                placeholder="ou escreva: Nubank 3200, juros 2,5% ao mês, parcela 350, vence dia 10"
                className={cn(campo, "flex-1")}
              />
              <Button
                type="button"
                onClick={interpretarFrase}
                className="shrink-0 rounded-[var(--raio-pilula)] border border-acao/40 bg-acao/10 px-4 py-2.5 text-[calc(13px*var(--escala-letra))] text-acao"
              >
                Preencher
              </Button>
            </div>

            <input aria-label="credor"
              value={nova.credor}
              onChange={(evento) => setNova({ ...nova, credor: evento.target.value })}
              placeholder="para quem você deve"
              required
              className={cn(campo, "sm:col-span-2")}
            />
            <SelectNative value={nova.tipo} onChange={(evento) => setNova({ ...nova, tipo: evento.target.value })}>
              {TIPOS.map((tipo) => (
                <option key={tipo.valor} value={tipo.valor}>
                  {tipo.rotulo}
                </option>
              ))}
            </SelectNative>
            <input aria-label="saldo"
              value={nova.saldo}
              onChange={(evento) => setNova({ ...nova, saldo: evento.target.value })}
              placeholder="quanto falta pagar"
              required
              className={campo}
              inputMode="decimal"
            />
            <input aria-label="juros"
              value={nova.juros}
              onChange={(evento) => setNova({ ...nova, juros: evento.target.value })}
              placeholder="juros % ao mês (ex.: 2,5)"
              className={campo}
              inputMode="decimal"
            />
            <input aria-label="parcela"
              value={nova.parcela}
              onChange={(evento) => setNova({ ...nova, parcela: evento.target.value })}
              placeholder="parcela mensal"
              className={campo}
              inputMode="decimal"
            />
            <input aria-label="parcelasTotal"
              value={nova.parcelasTotal}
              onChange={(evento) => setNova({ ...nova, parcelasTotal: evento.target.value })}
              placeholder="total de parcelas"
              className={campo}
              inputMode="numeric"
            />
            <input aria-label="pagas"
              value={nova.pagas}
              onChange={(evento) => setNova({ ...nova, pagas: evento.target.value })}
              placeholder="já pagas"
              className={campo}
              inputMode="numeric"
            />
            <input aria-label="dia"
              value={nova.dia}
              onChange={(evento) => setNova({ ...nova, dia: evento.target.value })}
              placeholder="dia do vencimento"
              className={campo}
              inputMode="numeric"
            />
            <Button
              disabled={ocupado}
              className="rounded-[var(--raio-pilula)] bg-primary px-4 py-2.5 text-[calc(13px*var(--escala-letra))] font-medium text-primary-foreground disabled:opacity-40 sm:col-span-3"
            >
              Adicionar dívida
            </Button>
          </form>
        )}
      </Cartao>

      {comparativo && abertas.length > 1 && (
        <Cartao titulo="Compare formas de pagar">
          <Accordion type="single" collapsible><AccordionItem value="estrategias"><AccordionTrigger>Maior juro ou menor saldo?</AccordionTrigger><AccordionContent><div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-acao/40 bg-acao/10 p-4">
              <p className="text-[calc(13px*var(--escala-letra))] font-medium text-acao">Maior juro primeiro</p>
              <p className="mt-1.5 text-[calc(20px*var(--escala-letra))] font-semibold">{comparativo.avalanche.meses} meses</p>
              <p className="text-[calc(12px*var(--escala-letra))] text-muted-fg">
                <span className="valor-inteiro">{formatarMoeda(comparativo.avalanche.totalJurosCentavos)}</span> de juros
              </p>
            </div>

            <div className="rounded-[var(--raio-cartao)] border border-pauta p-4">
              <p className="text-[calc(13px*var(--escala-letra))] font-medium">Menor saldo primeiro</p>
              <p className="mt-1.5 text-[calc(20px*var(--escala-letra))] font-semibold">{comparativo.bolaDeNeve.meses} meses</p>
              <p className="text-[calc(12px*var(--escala-letra))] text-muted-fg">
                <span className="valor-inteiro">{formatarMoeda(comparativo.bolaDeNeve.totalJurosCentavos)}</span> de juros
              </p>
            </div>
          </div>

          <p className="mt-3 text-sm">Maior juro prioriza economia. Menor saldo prioriza quitar uma dívida.</p></AccordionContent></AccordionItem></Accordion>
        </Cartao>
      )}

      {dados && dados.ordem.length > 0 && (
        <Cartao titulo="Qual pagar primeiro">
          <ol className="space-y-2">
            {dados.ordem.map((divida, indice) => {
              const quitacao = dados.plano?.quitacoes.find((linha) => linha.id === divida.id)
              return (
                <li key={divida.id} className="flex items-center gap-3 rounded-[var(--raio-cartao)] border border-pauta p-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-foreground/[0.08] text-[calc(12px*var(--escala-letra))] font-semibold">
                    {indice + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[calc(14px*var(--escala-letra))]">{divida.credor}</p>
                    <p className="text-[max(10px,calc(12px*var(--escala-letra)))] text-muted-fg">
                      {divida.jurosMensalBps > 0 ? `${formatarPercentual(divida.jurosMensalBps)} ao mês` : "sem juros informados"}
                      {quitacao && ` · quita no mês ${quitacao.mes}`}
                    </p>
                  </div>
                  <span className="whitespace-nowrap text-[calc(14px*var(--escala-letra))] tabular-nums">
                    <span className="valor-inteiro">{formatarMoeda(divida.saldoDevedorCentavos)}</span>
                  </span>
                </li>
              )
            })}
          </ol>
        </Cartao>
      )}

    </div>
  )
}
