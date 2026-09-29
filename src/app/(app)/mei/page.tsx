"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Plus } from "lucide-react"

import { buscar, enviar } from "@/lib/cliente"
import { MESES_CURTOS, rotuloCompetencia } from "@/lib/datas"
import { formatarMoeda, formatarPercentual, paraCentavos } from "@/lib/dinheiro"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { showToast } from "@/components/ui/toast"
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

import estilos from "./mei.module.css"

/**
 * MEI e DAS — N1 do canvas (Davi, 29/09/2026).
 *
 * A tela responde duas perguntas: quanto ainda cabe no limite do ano e qual DAS
 * pagar. O Balcão soma cada venda no mês sozinho; o que foi vendido fora dele
 * entra pelo "Lançar mês", e a lista diz de onde veio cada parte (ver
 * `/api/mei`).
 */

interface Lancamento {
  competencia: string
  receitaComercioCentavos: number
  receitaServicosCentavos: number
  dasPago: boolean
  dasValorCentavos: number
  observacao: string | null
}

interface Mes {
  competencia: string
  lancamento: Lancamento | null
  lancadoCentavos: number
  balcaoCentavos: number
  faturamentoCentavos: number
  fonte: "lancado" | "balcao" | "nenhum"
  das: { vencimento: string; situacao: "pago" | "atrasado" | "a vencer"; registrado: boolean; valorCentavos: number }
}

interface Perfil {
  razaoSocial: string | null
  atividade: string
  dataAbertura: string | null
  limiteAnualCentavos: number
  dasMensalCentavos: number
  diaVencimentoDas: number
  proLaboreCentavos: number
  limiteAnualEfetivoCentavos: number
  limiteProporcional: boolean
}

interface Situacao {
  risco: "OK" | "ATENCAO" | "ESTOURO_ATE_20" | "ESTOURO_ACIMA_20"
  faturamentoAnoCentavos: number
  percentualUsado: number
  disponivelCentavos: number
  mediaMensalCentavos: number
  projecaoAnualCentavos: number
  tetoMensalRestanteCentavos: number
  mesQueEstoura: string | null
}

interface Resposta {
  ativo: boolean
  hoje: string
  perfil: Perfil
  meses: Mes[]
  situacao: Situacao
}

const AVISO_RISCO: Record<Exclude<Situacao["risco"], "OK">, string> = {
  ATENCAO: "No ritmo atual o limite anual pode estourar. Vale segurar o faturamento ou já se preparar para migrar de regime.",
  ESTOURO_ATE_20:
    "O limite foi ultrapassado em até 20%. O imposto sobre o excedente é recolhido e o desenquadramento passa a valer em janeiro do ano seguinte. Confirme os detalhes com seu contador.",
  ESTOURO_ACIMA_20: "O limite foi ultrapassado em mais de 20%. Nesse patamar o desenquadramento é retroativo ao início do ano. Procure um contador com urgência.",
}

const ATIVIDADE: Record<string, string> = { COMERCIO: "comércio", SERVICOS: "serviços", COMERCIO_E_SERVICOS: "comércio e serviços", INDUSTRIA: "indústria", TRANSPORTE_CARGA: "transporte de carga" }
const ddmm = (dia: string) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}`
const nomeDoMes = (competencia: string) => {
  const texto = rotuloCompetencia(competencia)
  return texto.charAt(0).toUpperCase() + texto.slice(1).replace(/ de \d{4}$/, "")
}
const pct = (parte: number, todo: number) => (todo > 0 ? formatarPercentual(Math.round((parte / todo) * 10_000), 1) : "—")

function Reais({ centavos }: { centavos: number }) {
  const texto = formatarMoeda(Math.abs(centavos))
  const virgula = texto.lastIndexOf(",")
  return (
    <>
      {texto.slice(0, virgula)}
      <span>{texto.slice(virgula)}</span>
    </>
  )
}

function Quadro({ rotulo, children, apoio, tom }: { rotulo: string; children: React.ReactNode; apoio?: React.ReactNode; tom?: "negativo" }) {
  return (
    <section className={`${estilos.bloco} ${estilos.quadro}`} data-grande="">
      <span className={estilos.rotulo}>{rotulo}</span>
      <strong className={estilos.numero} data-tom={tom}>
        {children}
      </strong>
      {apoio && <small>{apoio}</small>}
    </section>
  )
}

/**
 * O ano acumulado mês a mês contra a linha do limite, com o ritmo de hoje
 * tracejado até dezembro. O mês corrente entra pela fração do mês que já correu.
 */
function GraficoDoAno({ meses, hoje, limite, projecao, mesInicio }: { meses: Mes[]; hoje: string; limite: number; projecao: number; mesInicio: number }) {
  const total = meses.reduce((soma, mes) => soma + mes.faturamentoCentavos, 0)
  const escala = Math.max(limite, projecao, total, 1) / 0.88
  const x = (mes: number) => (mes / 12) * 100
  const y = (valor: number) => 100 - (valor / escala) * 100
  const mesAtual = Number(hoje.slice(5, 7))
  const diasNoMes = new Date(Date.UTC(Number(hoje.slice(0, 4)), mesAtual, 0)).getUTCDate()
  const pontos: [number, number][] = [[mesInicio - 1, 0]]
  let acumulado = 0
  let fechado = 0
  for (const mes of meses) {
    acumulado += mes.faturamentoCentavos
    const numero = Number(mes.competencia.slice(5, 7))
    if (numero < mesAtual) {
      fechado = acumulado
      pontos.push([numero, acumulado])
    } else pontos.push([numero - 1 + Number(hoje.slice(8, 10)) / diasNoMes, acumulado])
  }
  const linha = pontos.map(([mes, valor]) => `${x(mes).toFixed(2)},${y(valor).toFixed(2)}`).join(" ")
  const ultimo = pontos[pontos.length - 1]
  return (
    <>
      <div className={estilos.grafico}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={`Faturamento acumulado ${formatarMoeda(total)} de ${formatarMoeda(limite)}; no ritmo de hoje fecha o ano em ${formatarMoeda(projecao)}`}>
          <defs>
            <linearGradient id="area-mei" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="currentColor" stopOpacity=".16" />
              <stop offset="1" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>
          <line x1="0" y1={y(limite)} x2="100" y2={y(limite)} stroke="var(--negativo)" strokeOpacity=".75" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          <line x1={x(mesAtual - 1)} y1={y(fechado)} x2="100" y2={y(projecao)} stroke="currentColor" strokeOpacity=".45" strokeWidth="1" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
          <polygon points={`${x(mesInicio - 1)},100 ${linha} ${x(ultimo[0]).toFixed(2)},100`} fill="url(#area-mei)" />
          <polyline points={linha} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
        <small className={estilos.limite} style={{ top: `calc(${y(limite)}% - 20px)` }}>
          limite {formatarMoeda(limite)}
        </small>
        <small style={{ top: `calc(${y(projecao)}% + 6px)` }}>dez: {formatarMoeda(projecao)}</small>
      </div>
      <div className={estilos.meses12} aria-hidden>
        {MESES_CURTOS.map((mes) => (
          <span key={mes}>{mes}</span>
        ))}
      </div>
    </>
  )
}

export default function Mei() {
  const router = useRouter()
  const [dados, setDados] = useState<Resposta | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [lancar, setLancar] = useState<Mes | "novo" | null>(null)
  const [editarPerfil, setEditarPerfil] = useState(false)

  const carregar = useCallback(async () => {
    try {
      const resposta = await buscar<Resposta>("/api/mei")
      // Sem perfil não há o que mostrar: o modo MEI se liga nas configurações.
      if (!resposta.ativo) router.replace("/configuracoes")
      else setDados(resposta)
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não consegui carregar o MEI.")
    }
  }, [router])

  useEffect(() => {
    void carregar()
  }, [carregar])

  /**
   * Baixa do DAS. O POST substitui a competência inteira, então o faturamento
   * já lançado vai junto — omitir zeraria a receita do mês. Mês sem lançamento
   * vai com receita zero, e o faturamento dele continua vindo do Balcão.
   */
  async function pagar(mes: Mes) {
    setOcupado(true)
    try {
      await enviar("/api/mei", {
        competencia: mes.competencia,
        receitaComercioCentavos: mes.lancamento?.receitaComercioCentavos ?? 0,
        receitaServicosCentavos: mes.lancamento?.receitaServicosCentavos ?? 0,
        dasPago: true,
        dasValorCentavos: mes.das.valorCentavos,
        observacao: mes.lancamento?.observacao ?? undefined,
      })
      showToast(`DAS de ${rotuloCompetencia(mes.competencia)} pago.`)
      await carregar()
    } catch (falha) {
      showToast(falha instanceof Error ? falha.message : "Não consegui dar baixa no DAS.")
    } finally {
      setOcupado(false)
    }
  }

  if (!dados) return <div className={estilos.pagina}>{erro && <p className={estilos.erro}>{erro}</p>}</div>

  const { perfil, situacao, meses, hoje } = dados
  const ano = hoje.slice(0, 4)
  const limite = perfil.limiteAnualEfetivoCentavos
  const mesInicio = Number(meses[0]?.competencia.slice(5, 7) ?? 1)
  const atrasados = meses.filter((mes) => mes.das.situacao === "atrasado" && mes.das.registrado)
  const semRegistro = meses.filter((mes) => mes.das.situacao === "atrasado" && !mes.das.registrado)
  const aVencer = meses.filter((mes) => mes.das.situacao === "a vencer")
  const ultimoPago = [...meses].reverse().find((mes) => mes.das.situacao === "pago")
  const doBalcao = meses.reduce((soma, mes) => soma + Math.min(mes.balcaoCentavos, mes.faturamentoCentavos), 0)
  const composicao = doBalcao > 0 ? `${formatarMoeda(doBalcao)} pelo Balcão, ${formatarMoeda(situacao.faturamentoAnoCentavos - doBalcao)} lançado à parte` : "tudo lançado à mão"

  const dasDaLista = [...atrasados, ...semRegistro, ...aVencer, ...(ultimoPago ? [ultimoPago] : [])]

  return (
    <div className={estilos.pagina}>
      <div className={estilos.topo}>
        <p>
          {perfil.razaoSocial ?? "Seu MEI"} · {ATIVIDADE[perfil.atividade] ?? perfil.atividade.toLowerCase()} · {ano}
        </p>
        <button type="button" className={estilos.botao} onClick={() => setLancar("novo")}>
          <Plus aria-hidden />
          Lançar mês
        </button>
      </div>

      {erro && <p className={estilos.erro}>{erro}</p>}

      <div className={estilos.quatro}>
        {situacao.disponivelCentavos >= 0 ? (
          <Quadro rotulo="Ainda cabe no ano" apoio={`${pct(situacao.disponivelCentavos, limite)} do limite`}>
            <Reais centavos={situacao.disponivelCentavos} />
          </Quadro>
        ) : (
          <Quadro rotulo="Passou do limite" tom="negativo" apoio={`de ${formatarMoeda(limite)}`}>
            <Reais centavos={situacao.disponivelCentavos} />
          </Quadro>
        )}
        <Quadro rotulo={`Faturado em ${ano}`} apoio={`${pct(situacao.faturamentoAnoCentavos, limite)} · ${MESES_CURTOS[mesInicio - 1]} a ${MESES_CURTOS[Number(hoje.slice(5, 7)) - 1]}`}>
          <Reais centavos={situacao.faturamentoAnoCentavos} />
        </Quadro>
        <Quadro
          rotulo="Média por mês"
          apoio={situacao.mediaMensalCentavos > 0 ? `cabe ${formatarMoeda(situacao.tetoMensalRestanteCentavos)}/mês` : "sem mês fechado ainda"}
        >
          {situacao.mediaMensalCentavos > 0 ? <Reais centavos={situacao.mediaMensalCentavos} /> : "—"}
        </Quadro>
        {atrasados.length > 0 ? (
          <Quadro rotulo="DAS" tom="negativo" apoio={`${nomeDoMes(atrasados[0].competencia).toLowerCase()} · desde ${ddmm(atrasados[0].das.vencimento)}`}>
            {atrasados.length} {atrasados.length === 1 ? "atrasado" : "atrasados"}
          </Quadro>
        ) : aVencer.length > 0 ? (
          <Quadro rotulo="Próximo DAS" apoio={`${nomeDoMes(aVencer[0].competencia).toLowerCase()} · vence ${ddmm(aVencer[0].das.vencimento)}`}>
            <Reais centavos={aVencer[0].das.valorCentavos} />
          </Quadro>
        ) : (
          <Quadro rotulo="DAS" apoio="nada a pagar agora">
            em dia
          </Quadro>
        )}
      </div>

      {(situacao.risco !== "OK" || perfil.limiteProporcional) && (
        <div className={estilos.avisos}>
          {situacao.risco !== "OK" && (
            <p className={estilos.aviso} data-tom={situacao.risco === "ATENCAO" ? undefined : "negativo"}>
              <i aria-hidden />
              <span>
                {AVISO_RISCO[situacao.risco]}
                {situacao.mesQueEstoura && situacao.risco === "ATENCAO" && <> No ritmo de hoje, o limite estoura em {rotuloCompetencia(situacao.mesQueEstoura)}.</>}
              </span>
            </p>
          )}
          {perfil.limiteProporcional && (
            <p className={estilos.aviso}>
              <i aria-hidden />
              <span>
                <b>Limite proporcional:</b> no ano de abertura o MEI tem 1/12 do limite por mês de atividade, {formatarMoeda(limite)} neste ano.
              </span>
            </p>
          )}
        </div>
      )}

      <div className={estilos.meio}>
        <section className={`${estilos.bloco} ${estilos.vendas}`} aria-label="Faturamento do ano">
          <div>
            <span className={estilos.rotulo}>Faturamento acumulado em {ano}</span>
            <strong className={estilos.grande}>
              <Reais centavos={situacao.faturamentoAnoCentavos} />
            </strong>
            <p className={estilos.frase}>
              {situacao.faturamentoAnoCentavos > 0 ? composicao : "nada faturado ainda"} · <b>{pct(situacao.faturamentoAnoCentavos, limite)}</b> do limite
            </p>
          </div>
          <GraficoDoAno meses={meses} hoje={hoje} limite={limite} projecao={situacao.projecaoAnualCentavos} mesInicio={mesInicio} />
        </section>

        <section className={`${estilos.bloco} ${estilos.lista}`} aria-labelledby="titulo-das">
          <h2 id="titulo-das">
            DAS · {formatarMoeda(perfil.dasMensalCentavos)} por mês, todo dia {perfil.diaVencimentoDas}
          </h2>
          {dasDaLista.length === 0 && <p className={estilos.dica}>Nenhum DAS a mostrar ainda.</p>}
          {dasDaLista.map((mes) => (
            <div key={mes.competencia} className={estilos.linha}>
              <span>
                {nomeDoMes(mes.competencia)}
                <small>
                  <b data-situacao={mes.das.registrado ? mes.das.situacao : undefined}>
                    {mes.das.situacao === "atrasado" && !mes.das.registrado ? "sem registro" : mes.das.situacao}
                  </b>{" "}
                  · {mes.das.situacao === "pago" ? "vencia" : mes.das.situacao === "atrasado" ? "venceu" : "vence"} {ddmm(mes.das.vencimento)}
                </small>
              </span>
              <span className={estilos.valor}>{formatarMoeda(mes.das.valorCentavos)}</span>
              {mes.das.situacao !== "pago" && (
                <button type="button" className={estilos.paguei} onClick={() => void pagar(mes)} disabled={ocupado} aria-label={`Paguei o DAS de ${rotuloCompetencia(mes.competencia)}`}>
                  <Check aria-hidden />
                  Paguei
                </button>
              )}
            </div>
          ))}
        </section>
      </div>

      <div className={estilos.baixo}>
        <section className={`${estilos.bloco} ${estilos.lista}`} aria-labelledby="titulo-meses">
          <h2 id="titulo-meses">Mês a mês</h2>
          {[...meses].reverse().map((mes) => (
            <button key={mes.competencia} type="button" className={estilos.linha} onClick={() => setLancar(mes)}>
              <span>
                {nomeDoMes(mes.competencia)}
                <small>{origem(mes, hoje)}</small>
              </span>
              <span className={estilos.valor}>
                {formatarMoeda(mes.faturamentoCentavos)}
                <small data-situacao={mes.das.registrado || mes.das.situacao !== "atrasado" ? mes.das.situacao : undefined}>
                  DAS {mes.das.situacao === "atrasado" && !mes.das.registrado ? "sem registro" : mes.das.situacao}
                </small>
              </span>
            </button>
          ))}
        </section>

        <div className={estilos.pfpj}>
          <span>
            Pró-labore: <b>{perfil.proLaboreCentavos > 0 ? `${formatarMoeda(perfil.proLaboreCentavos)}/mês` : "não informado"}</b> · conta PJ separada da pessoal
          </span>
          <button type="button" onClick={() => setEditarPerfil(true)}>
            Dados do MEI
          </button>
        </div>
      </div>

      <LancarMes alvo={lancar} dasPadrao={perfil.dasMensalCentavos} aoFechar={() => setLancar(null)} aoSalvar={carregar} hoje={hoje} />
      <DadosDoMei aberto={editarPerfil} perfil={perfil} aoFechar={() => setEditarPerfil(false)} aoSalvar={carregar} />
    </div>
  )
}

/** De onde veio o faturamento do mês: Balcão, lançado à parte, ou os dois. */
function origem(mes: Mes, hoje: string): string {
  const { balcaoCentavos: balcao, lancadoCentavos: lancado } = mes
  if (mes.fonte === "nenhum") return "sem faturamento"
  if (mes.fonte === "balcao" || lancado === balcao) return mes.competencia === hoje.slice(0, 7) ? "Balcão até hoje" : "pelo Balcão"
  if (balcao === 0) return "lançado à mão"
  if (lancado > balcao) return `Balcão ${formatarMoeda(balcao)} + ${formatarMoeda(lancado - balcao)} à parte`
  return `lançado ${formatarMoeda(lancado)} · o Balcão registrou ${formatarMoeda(balcao)}`
}

const reais = (centavos: number) => (centavos ? formatarMoeda(centavos, false) : "")

function LancarMes({ alvo, dasPadrao, hoje, aoFechar, aoSalvar }: { alvo: Mes | "novo" | null; dasPadrao: number; hoje: string; aoFechar: () => void; aoSalvar: () => Promise<void> }) {
  const [form, setForm] = useState({ competencia: "", comercio: "", servicos: "", dasPago: false, dasValor: "", observacao: "" })
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const mes = alvo && alvo !== "novo" ? alvo : null

  useEffect(() => {
    if (!alvo) return
    setErro(null)
    const lancamento = mes?.lancamento
    setForm({
      competencia: mes?.competencia ?? hoje.slice(0, 7),
      comercio: reais(lancamento?.receitaComercioCentavos ?? 0),
      servicos: reais(lancamento?.receitaServicosCentavos ?? 0),
      dasPago: lancamento?.dasPago ?? false,
      dasValor: reais(lancamento?.dasValorCentavos || dasPadrao),
      observacao: lancamento?.observacao ?? "",
    })
  }, [alvo, mes, dasPadrao, hoje])

  async function salvar(evento: React.FormEvent) {
    evento.preventDefault()
    setOcupado(true)
    setErro(null)
    try {
      await enviar("/api/mei", {
        competencia: form.competencia,
        receitaComercioCentavos: paraCentavos(form.comercio),
        receitaServicosCentavos: paraCentavos(form.servicos),
        dasPago: form.dasPago,
        dasValorCentavos: paraCentavos(form.dasValor),
        observacao: form.observacao || undefined,
      })
      showToast(`${rotuloCompetencia(form.competencia)} salvo.`)
      aoFechar()
      await aoSalvar()
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não consegui salvar o lançamento.")
    } finally {
      setOcupado(false)
    }
  }

  return (
    <Dialog open={Boolean(alvo)} onOpenChange={(abrir) => !abrir && aoFechar()}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>{mes ? rotuloCompetencia(mes.competencia) : "Lançar mês"}</DialogTitle>
          <DialogDescription>
            O Balcão soma cada venda aqui sozinho{mes && mes.balcaoCentavos > 0 ? ` (${formatarMoeda(mes.balcaoCentavos)} neste mês)` : ""}. Lance o total do mês só se vendeu fora dele: o valor digitado
            substitui o que está gravado.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <form onSubmit={salvar} className={estilos.form}>
            {!mes && (
              <label className={estilos.campo}>
                Mês
                <Input type="month" required value={form.competencia} onChange={(evento) => setForm({ ...form, competencia: evento.target.value })} />
              </label>
            )}
            <div className={estilos.dois}>
              <label className={estilos.campo}>
                Comércio (R$)
                <Input inputMode="decimal" placeholder="0,00" value={form.comercio} onChange={(evento) => setForm({ ...form, comercio: evento.target.value })} />
              </label>
              <label className={estilos.campo}>
                Serviços (R$)
                <Input inputMode="decimal" placeholder="0,00" value={form.servicos} onChange={(evento) => setForm({ ...form, servicos: evento.target.value })} />
              </label>
            </div>
            <div className={estilos.dois}>
              <label className={estilos.campo}>
                Valor do DAS (R$)
                <Input inputMode="decimal" placeholder="0,00" value={form.dasValor} onChange={(evento) => setForm({ ...form, dasValor: evento.target.value })} />
              </label>
              <label className={estilos.campo}>
                Observação
                <Input value={form.observacao} maxLength={200} onChange={(evento) => setForm({ ...form, observacao: evento.target.value })} />
              </label>
            </div>
            <label className={estilos.repete}>
              DAS deste mês já pago
              <Switch checked={form.dasPago} onCheckedChange={(dasPago) => setForm({ ...form, dasPago })} />
            </label>
            {erro && <p className={estilos.erro}>{erro}</p>}
            <button type="submit" className={estilos.botao} disabled={ocupado}>
              Salvar
            </button>
          </form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Os dados que mudam por lei ou por ano: limite, DAS e dia de vencimento. Só o
 * cadastro inicial gravava o perfil; depois dele não havia onde corrigir o DAS
 * quando o salário mínimo muda em janeiro.
 */
function DadosDoMei({ aberto, perfil, aoFechar, aoSalvar }: { aberto: boolean; perfil: Perfil; aoFechar: () => void; aoSalvar: () => Promise<void> }) {
  const [form, setForm] = useState({ abertura: "", limite: "", das: "", dia: "", proLabore: "" })
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!aberto) return
    setErro(null)
    setForm({
      abertura: perfil.dataAbertura?.slice(0, 10) ?? "",
      limite: reais(perfil.limiteAnualCentavos),
      das: reais(perfil.dasMensalCentavos),
      dia: String(perfil.diaVencimentoDas),
      proLabore: reais(perfil.proLaboreCentavos),
    })
  }, [aberto, perfil])

  async function salvar(evento: React.FormEvent) {
    evento.preventDefault()
    setOcupado(true)
    setErro(null)
    try {
      await enviar(
        "/api/mei",
        {
          dataAbertura: form.abertura,
          limiteAnualCentavos: paraCentavos(form.limite),
          dasMensalCentavos: paraCentavos(form.das),
          diaVencimentoDas: Number(form.dia),
          proLaboreCentavos: paraCentavos(form.proLabore),
        },
        "PUT",
      )
      showToast("Dados do MEI salvos.")
      aoFechar()
      await aoSalvar()
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não consegui salvar.")
    } finally {
      setOcupado(false)
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(abrir) => !abrir && aoFechar()}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Dados do MEI</DialogTitle>
          <DialogDescription>O DAS muda todo ano com o salário mínimo; confira em janeiro.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <form onSubmit={salvar} className={estilos.form}>
            <div className={estilos.dois}>
              <label className={estilos.campo}>
                Abertura do CNPJ
                <Input type="date" value={form.abertura} onChange={(evento) => setForm({ ...form, abertura: evento.target.value })} />
              </label>
              <label className={estilos.campo}>
                Limite anual (R$)
                <Input inputMode="decimal" required value={form.limite} onChange={(evento) => setForm({ ...form, limite: evento.target.value })} />
              </label>
            </div>
            <div className={estilos.dois}>
              <label className={estilos.campo}>
                DAS por mês (R$)
                <Input inputMode="decimal" required value={form.das} onChange={(evento) => setForm({ ...form, das: evento.target.value })} />
              </label>
              <label className={estilos.campo}>
                Vence todo dia
                <Input inputMode="numeric" required value={form.dia} onChange={(evento) => setForm({ ...form, dia: evento.target.value })} />
              </label>
            </div>
            <label className={estilos.campo}>
              Pró-labore por mês (R$)
              <Input inputMode="decimal" placeholder="0,00" value={form.proLabore} onChange={(evento) => setForm({ ...form, proLabore: evento.target.value })} />
            </label>
            <p className={estilos.dica}>Pró-labore é o que sai da conta do CNPJ para a pessoal todo mês. O resto fica na empresa.</p>
            {erro && <p className={estilos.erro}>{erro}</p>}
            <button type="submit" className={estilos.botao} disabled={ocupado}>
              Salvar
            </button>
          </form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
