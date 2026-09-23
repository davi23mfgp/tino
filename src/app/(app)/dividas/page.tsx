"use client"

import Link from "next/link"
import estilos from "../analise/avancadas.module.css"
import topo from "./dividas.module.css"
import pesos from "@/components/peso-do-juro.module.css"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import { useCallback, useEffect, useRef, useState } from "react"
import { Plus } from "lucide-react"

import { buscar, enviar } from "@/lib/cliente"
import { formatarMoeda, formatarPercentual, paraCentavos } from "@/lib/dinheiro"
import { Cartao, Vazio } from "@/components/ui/painel"
import { SelectNative } from "@/components/ui/select-native"
import { lerDivida } from "@/lib/tino/lingua-natural"
import { cn } from "@/lib/utils"
import {
  REFERENCIA_JURO_MENSAL,
  comprometimentoBps,
  composicaoPorPeso,
  faixaComprometimento,
  pesoDoJuro,
  type PesoDoJuro,
} from "@/lib/tino/leitura-dividas"

/**
 * Dívidas.
 *
 * A tela existe para responder uma pergunta só: qual pagar primeiro. O topo
 * diz quanto se deve e quando acaba, o bloco seguinte diz qual atacar e por
 * quê, e a lista já vem na ordem de ataque — por isso não existe mais um
 * cartão "qual pagar primeiro" separado repetindo a mesma lista.
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
  /// `null` nas simulações (a rota só lê a renda sem extra); 0 = renda desconhecida.
  rendaMensalCentavos: number | null
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


/** A régua de cada faixa, dita junto com o juro — percentual sem faixa não informa. */
function referenciaDoJuro(peso: PesoDoJuro) {
  const caro = formatarPercentual(REFERENCIA_JURO_MENSAL.caro, 0)
  const medio = formatarPercentual(REFERENCIA_JURO_MENSAL.medio, 0)
  if (peso === "caro") return `caro: acima de ${caro} a.m.`
  if (peso === "medio") return `médio: entre ${medio} e ${caro} a.m.`
  return `leve: abaixo de ${medio} a.m.`
}

const NOME_DO_PESO: Record<PesoDoJuro, string> = { caro: "Caro", medio: "Médio", leve: "Leve", "sem-juro": "Sem juro" }

const ORDEM_DA_ESTRATEGIA: Record<Resposta["estrategia"], string> = {
  AVALANCHE: "maior juro primeiro",
  BOLA_DE_NEVE: "menor saldo primeiro",
  PROPORCIONAL: "maior saldo primeiro",
}

/** O plano fecha quando quita todas; senão bateu no limite de 50 anos. */
function prazo(plano: Plano | null, abertas: number) {
  if (!plano) return null
  return plano.quitacoes.length === abertas ? plano.meses : null
}

const PASSO_EXTRA = 5_000

export default function Dividas() {
  // `base` é a leitura sem pagamento extra e alimenta tudo que é "hoje": o
  // topo, o próximo passo e a lista. `dados` acompanha a régua de simulação.
  // Separar os dois impede o topo de mudar enquanto a pessoa só está testando
  // um valor.
  const [dados, setDados] = useState<Resposta | null>(null)
  const [base, setBase] = useState<Resposta | null>(null)
  const [extraCentavos, setExtraCentavos] = useState(0)
  // O extra a que `dados` se refere. Enquanto difere do valor da régua, o
  // resultado na tela é de outro valor e não pode ser mostrado como resposta.
  const [extraSimulado, setExtraSimulado] = useState(0)
  const [simulando, setSimulando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [nova, setNova] = useState(VAZIO)
  const [abrirForm, setAbrirForm] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [frase, setFrase] = useState("")
  const ultimaSimulacao = useRef(0)

  const carregar = useCallback(async () => {
    try {
      setErro(null)
      const resposta = await buscar<Resposta>("/api/dividas?extraMensalCentavos=0")
      setBase(resposta)
      setDados(resposta)
      setExtraCentavos(0)
      setExtraSimulado(0)
    } catch (excecao) {
      setErro(excecao instanceof Error ? excecao.message : "Não foi possível carregar as dívidas.")
    }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  /**
   * Simula enquanto a pessoa arrasta, sem botão.
   *
   * Espera a régua parar 300 ms antes de perguntar ao servidor, e descarta
   * resposta velha: arrastando rápido, a resposta de R$ 200 pode chegar depois
   * da de R$ 500 e mostraria o número errado para o valor na tela.
   */
  useEffect(() => {
    if (!base) return
    if (extraCentavos === 0) {
      setDados(base)
      setExtraSimulado(0)
      return
    }
    const pedido = ++ultimaSimulacao.current
    const espera = setTimeout(async () => {
      setSimulando(true)
      try {
        const resposta = await buscar<Resposta>("/api/dividas?extraMensalCentavos=" + extraCentavos)
        if (pedido === ultimaSimulacao.current) {
          setDados(resposta)
          setExtraSimulado(extraCentavos)
        }
      } catch (excecao) {
        if (pedido === ultimaSimulacao.current) setErro(excecao instanceof Error ? excecao.message : "Não foi possível simular.")
      } finally {
        if (pedido === ultimaSimulacao.current) setSimulando(false)
      }
    }, 300)
    return () => clearTimeout(espera)
  }, [extraCentavos, base])

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

  const abertas = base?.dividas.filter((divida) => !divida.quitada) ?? []
  const quitadas = base?.dividas.filter((divida) => divida.quitada) ?? []
  const comparativo = dados?.comparativo
  const porId = new Map(abertas.map((divida) => [divida.id, divida]))
  const naOrdem = (base?.ordem ?? []).map((linha) => porId.get(linha.id)).filter((divida): divida is Divida => !!divida)
  const primeira = naOrdem[0] ?? null

  const mesesHoje = prazo(base?.plano ?? null, abertas.length)
  const mesesSimulados = prazo(dados?.plano ?? null, abertas.length)
  const composicao = composicaoPorPeso(abertas)
  const renda = base?.rendaMensalCentavos ?? 0
  const peso = base ? comprometimentoBps(base.parcelaMensalCentavos, renda) : null

  // O teto da régua acompanha o tamanho das parcelas: R$ 1.000 é pouco para
  // quem paga R$ 5.000 por mês e demais para quem paga R$ 300.
  const tetoExtra = Math.max(100_000, Math.ceil(((base?.parcelaMensalCentavos ?? 0) || 1) / 50_000) * 50_000)
  const simulacaoEmDia = extraSimulado === extraCentavos

  const formulario = abrirForm && (
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
  )

  return (
    <div className={cn(estilos.pagina, "space-y-4")}>
      {erro && <Cartao><p role="alert" className="text-sm">{erro}</p><Button variant="outline" onClick={carregar} disabled={simulando || ocupado} className="mt-3">Recarregar dívidas</Button></Cartao>}

      {base && abertas.length > 0 && (
        <section className={cn("ficha", topo.resumo)}>
          <p className={topo.rotulo}>Você deve</p>
          <p className={topo.total}>{formatarMoeda(base.totalCentavos)}</p>
          {mesesHoje !== null ? (
            <p className={topo.prazo}>
              Livre em <b>{mesesHoje} {mesesHoje === 1 ? "mês" : "meses"}</b> pagando {formatarMoeda(base.parcelaMensalCentavos)}/mês
            </p>
          ) : (
            <p className={topo.prazo} data-fecha="nao">
              <b>As parcelas de hoje não quitam em 50 anos</b> — o juro cresce mais que o pagamento
            </p>
          )}

          {/* A barra divide o saldo por faixa de juro: responde "quanto do que
              eu devo é do tipo que cresce rápido" sem ler taxa por taxa. Com
              uma faixa só, a barra seria um bloco inteiro de uma cor e não
              diria nada que a lista não diga. */}
          {composicao.length > 1 && (
            <>
              <div className={topo.composicao} aria-hidden>
                {composicao.map((parte) => (
                  <i key={parte.peso} className={pesos.peso} data-peso={parte.peso} style={{ width: `${parte.percentual}%` }} />
                ))}
              </div>
              <p className={topo.legenda}>
                {composicao.map((parte) => (
                  <span key={parte.peso} className={pesos.peso} data-peso={parte.peso}>
                    <i />
                    {NOME_DO_PESO[parte.peso]} {parte.percentual}%
                  </span>
                ))}
              </p>
            </>
          )}

          {peso !== null ? (
            <p className={topo.renda} data-faixa={faixaComprometimento(peso)}>
              <span>Parcelas / renda</span>
              <span>
                <b>{formatarPercentual(peso, 0)}</b> <small>· até 20% confortável, 30% é o teto</small>
              </span>
            </p>
          ) : (
            <p className={topo.renda}>
              <span>Parcelas / renda</span>
              <Link href="/transacoes">Lance sua renda para ver</Link>
            </p>
          )}
        </section>
      )}

      {/* Uma linha, uma ação: qual atacar, quanto custa e a régua do custo.
          O Davi trocou o cartão grande de "próximo passo" por esta faixa
          (23/09) — a explicação longa já mora no plano, a um toque. */}
      {primeira && (
        <section className={cn("ficha", topo.ataque, pesos.peso)} data-peso={pesoDoJuro(primeira.jurosMensalBps)}>
          <div className="min-w-0">
            <p className={topo.rotulo}>Ataque agora</p>
            <p className={topo.alvo}>
              {primeira.credor}
              {primeira.jurosMensalBps > 0 && <> · {formatarPercentual(primeira.jurosMensalBps)} a.m.</>}
            </p>
            <p className={topo.regua}>
              {primeira.jurosMensalBps > 0 ? referenciaDoJuro(pesoDoJuro(primeira.jurosMensalBps)) : "sem juros informados — cadastre a taxa"}
            </p>
          </div>
          <Link href="/plano" className={topo.botaoPlano}>Plano</Link>
        </section>
      )}

      <section>
        <header className={topo.cabecalhoLista}>
          <div>
            <h2>Suas dívidas</h2>
            {base && abertas.length > 1 && <small>{ORDEM_DA_ESTRATEGIA[base.estrategia]}</small>}
          </div>
          <Button onClick={() => setAbrirForm((atual) => !atual)} variant="outline" disabled={ocupado} className="flex items-center gap-1.5">
            <Plus className="size-3.5" /> Nova dívida
          </Button>
        </header>

        {formulario && <Cartao className="mt-3">{formulario}</Cartao>}

        {base && abertas.length === 0 && (
          <Cartao className="mt-3">
            <Vazio titulo="Nenhuma dívida em aberto" texto="Se tiver alguma fora do app, cadastre para entrar no plano." />
          </Cartao>
        )}

        <div className={topo.lista}>
          {naOrdem.map((divida) => {
            const tipo = TIPOS.find((opcao) => opcao.valor === divida.tipo)?.rotulo ?? divida.tipo
            const detalhes = [
              divida.parcelasTotal ? `${divida.parcelasPagas} de ${divida.parcelasTotal}` : tipo,
              divida.parcelaCentavos > 0 ? `${formatarMoeda(divida.parcelaCentavos)}/mês` : null,
              `dia ${divida.diaVencimento}`,
            ].filter(Boolean)
            return (
              <div key={divida.id} className={cn("ficha", topo.divida, pesos.peso)} data-peso={pesoDoJuro(divida.jurosMensalBps)}>
                <i aria-hidden />
                <div className="min-w-0">
                  <strong className="truncate">{divida.credor}</strong>
                  <p className={topo.meta}>{detalhes.join(" · ")}</p>
                </div>
                <div className={topo.saldo}>
                  <b className="valor-inteiro">{formatarMoeda(divida.saldoDevedorCentavos)}</b>
                  <small>{divida.jurosMensalBps > 0 ? `${formatarPercentual(divida.jurosMensalBps)} a.m.` : "sem juro"}</small>
                </div>
                {divida.parcelasTotal ? (
                  <div className={topo.progresso} role="img" aria-label={`${divida.parcelasPagas} de ${divida.parcelasTotal} parcelas pagas`}>
                    <i style={{ width: `${Math.min(100, (divida.parcelasPagas / divida.parcelasTotal) * 100)}%` }} />
                  </div>
                ) : null}
                {divida.observacao && <p className={topo.observacao}>{divida.observacao}</p>}
              </div>
            )
          })}
        </div>

        {quitadas.length > 0 && (
          <p className="mt-3 px-1 text-[calc(12px*var(--escala-letra))] text-positivo">
            {quitadas.length} {quitadas.length === 1 ? "dívida já quitada" : "dívidas já quitadas"}.
          </p>
        )}
      </section>

      {base?.plano && abertas.length > 0 && (
        <Cartao estatico className={topo.simulacao}>
          <header>
            <h2 id="titulo-extra">E se pagar mais?</h2>
            <output htmlFor="pagamento-extra">+{formatarMoeda(extraCentavos)}/mês</output>
          </header>
          <input
            id="pagamento-extra"
            type="range"
            aria-labelledby="titulo-extra"
            aria-valuetext={`${formatarMoeda(extraCentavos)} a mais por mês`}
            min={0}
            max={tetoExtra}
            step={PASSO_EXTRA}
            value={extraCentavos}
            onChange={(evento) => setExtraCentavos(Number(evento.target.value))}
          />
          {extraCentavos === 0 ? (
            <p className={topo.dica}>
              Arraste para ver quanto antes você fica livre. Sem extra, são{" "}
              {formatarMoeda(base.plano.totalJurosCentavos)} de juros até o fim.
            </p>
          ) : (
            <div className={topo.resultado} aria-live="polite" aria-busy={!simulacaoEmDia}>
              <div>
                <span>Livre em</span>
                <b>
                  {simulacaoEmDia ? (mesesSimulados !== null ? `${mesesSimulados} ${mesesSimulados === 1 ? "mês" : "meses"}` : "além de 50 anos") : "…"}
                  {simulacaoEmDia && mesesSimulados !== null && mesesHoje !== null && mesesHoje > mesesSimulados && <em>{mesesHoje - mesesSimulados} {mesesHoje - mesesSimulados === 1 ? "mês" : "meses"} a menos</em>}
                </b>
              </div>
              <div>
                <span>Juros no caminho</span>
                <b>
                  {simulacaoEmDia && dados?.plano ? formatarMoeda(dados.plano.totalJurosCentavos) : "…"}
                  {simulacaoEmDia && dados?.plano && base.plano.totalJurosCentavos > dados.plano.totalJurosCentavos && (
                    <em>{formatarMoeda(base.plano.totalJurosCentavos - dados.plano.totalJurosCentavos)} a menos</em>
                  )}
                </b>
              </div>
            </div>
          )}
        </Cartao>
      )}

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
    </div>
  )
}
