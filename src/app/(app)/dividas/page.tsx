"use client"

import { useCallback, useEffect, useState } from "react"
import { Plus, Trash2 } from "lucide-react"

import { buscar, enviar } from "@/lib/cliente"
import { formatarMoeda, formatarPercentual, paraCentavos } from "@/lib/dinheiro"
import { Barra, Cartao, Metrica, Vazio } from "@/components/ui/painel"
import { lerDivida } from "@/lib/tino/lingua-natural"
import { cn } from "@/lib/utils"

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

const campo = "rounded-[var(--raio-campo)] border border-pauta bg-background px-3.5 py-2.5 text-[13px] outline-none focus:border-acao/50"

const VAZIO = { credor: "", tipo: "EMPRESTIMO_PESSOAL", saldo: "", juros: "", parcela: "", parcelasTotal: "", pagas: "0", dia: "10" }

export default function Dividas() {
  const [dados, setDados] = useState<Resposta | null>(null)
  const [extra, setExtra] = useState("")
  const [nova, setNova] = useState(VAZIO)
  const [abrirForm, setAbrirForm] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [frase, setFrase] = useState("")

  const carregar = useCallback(async () => {
    const centavos = extra ? paraCentavos(extra) : 0
    setDados(await buscar<Resposta>(`/api/dividas?extraMensalCentavos=${centavos}`))
  }, [extra])

  useEffect(() => {
    carregar()
  }, [carregar])

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
    <div className="space-y-4">
      <Cartao
        titulo="Dívidas"
        acao={
          <button onClick={() => setAbrirForm((atual) => !atual)} className="flex items-center gap-1.5">
            <Plus className="size-3.5" /> nova
          </button>
        }
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <Metrica rotulo="Total devido" valor={formatarMoeda(dados?.totalCentavos ?? 0)} tom="negativo" />
          <Metrica rotulo="Parcelas por mês" valor={formatarMoeda(dados?.parcelaMensalCentavos ?? 0)} />
          <Metrica
            rotulo="Livre em"
            valor={dados?.plano ? `${dados.plano.meses} meses` : "—"}
            detalhe={dados?.plano ? `${formatarMoeda(dados.plano.totalJurosCentavos)} de juros no caminho` : undefined}
            tom={dados?.plano ? "atencao" : "neutro"}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-[12px] text-muted-fg">
            se eu pagar a mais por mês
            <input
              value={extra}
              onChange={(evento) => setExtra(evento.target.value)}
              placeholder="0,00"
              className={cn(campo, "w-32 text-right tabular-nums")}
              inputMode="decimal"
            />
          </label>
          {dados?.plano && extra && (
            <span className="text-[12px] text-positivo">
              fica livre em {dados.plano.meses} meses
            </span>
          )}
        </div>

        {abrirForm && (
          <form onSubmit={criar} className="mt-4 grid gap-2 sm:grid-cols-3">
            <div className="flex gap-2 sm:col-span-3">
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
              <button
                type="button"
                onClick={interpretarFrase}
                className="shrink-0 rounded-[var(--raio-pilula)] border border-acao/40 bg-acao/10 px-4 py-2.5 text-[13px] text-acao"
              >
                Preencher
              </button>
            </div>

            <input
              value={nova.credor}
              onChange={(evento) => setNova({ ...nova, credor: evento.target.value })}
              placeholder="para quem você deve"
              required
              className={cn(campo, "sm:col-span-2")}
            />
            <select value={nova.tipo} onChange={(evento) => setNova({ ...nova, tipo: evento.target.value })} className={campo}>
              {TIPOS.map((tipo) => (
                <option key={tipo.valor} value={tipo.valor}>
                  {tipo.rotulo}
                </option>
              ))}
            </select>
            <input
              value={nova.saldo}
              onChange={(evento) => setNova({ ...nova, saldo: evento.target.value })}
              placeholder="quanto falta pagar"
              required
              className={campo}
              inputMode="decimal"
            />
            <input
              value={nova.juros}
              onChange={(evento) => setNova({ ...nova, juros: evento.target.value })}
              placeholder="juros % ao mês (ex.: 2,5)"
              className={campo}
              inputMode="decimal"
            />
            <input
              value={nova.parcela}
              onChange={(evento) => setNova({ ...nova, parcela: evento.target.value })}
              placeholder="parcela mensal"
              className={campo}
              inputMode="decimal"
            />
            <input
              value={nova.parcelasTotal}
              onChange={(evento) => setNova({ ...nova, parcelasTotal: evento.target.value })}
              placeholder="total de parcelas"
              className={campo}
              inputMode="numeric"
            />
            <input
              value={nova.pagas}
              onChange={(evento) => setNova({ ...nova, pagas: evento.target.value })}
              placeholder="já pagas"
              className={campo}
              inputMode="numeric"
            />
            <input
              value={nova.dia}
              onChange={(evento) => setNova({ ...nova, dia: evento.target.value })}
              placeholder="dia do vencimento"
              className={campo}
              inputMode="numeric"
            />
            <button
              disabled={ocupado}
              className="rounded-[var(--raio-pilula)] bg-primary px-4 py-2.5 text-[13px] font-medium text-primary-foreground disabled:opacity-40 sm:col-span-3"
            >
              Adicionar dívida
            </button>
          </form>
        )}
      </Cartao>

      {comparativo && abertas.length > 1 && (
        <Cartao titulo="Qual estratégia sai mais barata">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-acao/40 bg-acao/10 p-4">
              <p className="text-[13px] font-medium text-acao">Avalanche: paga primeiro o juro mais alto</p>
              <p className="mt-1.5 text-[20px] font-semibold">{comparativo.avalanche.meses} meses</p>
              <p className="text-[12px] text-muted-fg">
                {formatarMoeda(comparativo.avalanche.totalJurosCentavos)} de juros
              </p>
            </div>

            <div className="rounded-[var(--raio-cartao)] border border-pauta p-4">
              <p className="text-[13px] font-medium">Bola de neve: paga primeiro o menor saldo</p>
              <p className="mt-1.5 text-[20px] font-semibold">{comparativo.bolaDeNeve.meses} meses</p>
              <p className="text-[12px] text-muted-fg">
                {formatarMoeda(comparativo.bolaDeNeve.totalJurosCentavos)} de juros
              </p>
            </div>
          </div>

          <p className="mt-3 text-[13px] leading-relaxed">
            {comparativo.economiaAvalancheCentavos > 0 ? (
              <>
                Atacar pelo maior juro economiza{" "}
                <b>{formatarMoeda(comparativo.economiaAvalancheCentavos)}</b>
                {comparativo.mesesAMais > 0 && ` e termina ${comparativo.mesesAMais} mês(es) antes`}. A bola de neve
                paga mais caro, mas quita a primeira dívida antes — o que ajuda quem precisa ver progresso para não
                desistir.
              </>
            ) : (
              "As duas estratégias dão praticamente o mesmo resultado no seu caso. Escolha a que te mantém no plano."
            )}
          </p>
        </Cartao>
      )}

      {dados && dados.ordem.length > 0 && (
        <Cartao titulo="Ordem de ataque">
          <ol className="space-y-2">
            {dados.ordem.map((divida, indice) => {
              const quitacao = dados.plano?.quitacoes.find((linha) => linha.id === divida.id)
              return (
                <li key={divida.id} className="flex items-center gap-3 rounded-[var(--raio-cartao)] border border-pauta p-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-foreground/[0.08] text-[12px] font-semibold">
                    {indice + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px]">{divida.credor}</p>
                    <p className="text-[11px] text-muted-fg">
                      {divida.jurosMensalBps > 0 ? `${formatarPercentual(divida.jurosMensalBps)} ao mês` : "sem juros informados"}
                      {quitacao && ` · quita no mês ${quitacao.mes}`}
                    </p>
                  </div>
                  <span className="whitespace-nowrap text-[14px] tabular-nums">
                    {formatarMoeda(divida.saldoDevedorCentavos)}
                  </span>
                </li>
              )
            })}
          </ol>
        </Cartao>
      )}

      <Cartao titulo={`Suas dívidas (${abertas.length})`}>
        {abertas.length === 0 && (
          <Vazio titulo="Nenhuma dívida em aberto" texto="Se tiver alguma fora do app, cadastre para entrar no plano." />
        )}

        <div className="space-y-2">
          {abertas.map((divida) => {
            const progresso = divida.parcelasTotal ? (divida.parcelasPagas / divida.parcelasTotal) * 100 : 0
            return (
              <div key={divida.id} className="rounded-[var(--raio-cartao)] border border-pauta p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-medium">{divida.credor}</p>
                    <p className="text-[11px] text-muted-fg">
                      {TIPOS.find((tipo) => tipo.valor === divida.tipo)?.rotulo ?? divida.tipo}
                      {divida.parcelaCentavos > 0 && ` · ${formatarMoeda(divida.parcelaCentavos)}/mês`}
                      {divida.parcelasTotal && ` · ${divida.parcelasPagas}/${divida.parcelasTotal}`}
                      {` · vence dia ${divida.diaVencimento}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[16px] font-semibold tabular-nums">
                      {formatarMoeda(divida.saldoDevedorCentavos)}
                    </p>
                    {divida.jurosMensalBps > 0 && (
                      <p className={cn("text-[11px]", divida.jurosMensalBps >= 500 ? "text-negativo" : "text-muted-fg")}>
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

                {divida.observacao && <p className="mt-2 text-[11px] text-muted-fg">{divida.observacao}</p>}
              </div>
            )
          })}
        </div>

        {quitadas.length > 0 && (
          <p className="mt-4 text-[12px] text-positivo">{quitadas.length} dívida(s) já quitada(s).</p>
        )}
      </Cartao>
    </div>
  )
}
