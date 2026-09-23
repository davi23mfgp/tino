"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

import { enviar } from "@/lib/cliente"
import { competenciaMaisMeses, rotuloCompetencia } from "@/lib/datas"
import { formatarDecimal, formatarMoeda, formatarPercentual, paraCentavos } from "@/lib/dinheiro"
import { dataAteQuandoAguenta, mesesDeReservaSugeridos, planoDeJuntar, alvoEmCentavos, type FormaDeJuntar, type TipoDeRenda } from "@/lib/tino/reserva"
import { cn } from "@/lib/utils"
import { NovaMeta, type ContaMeta, type DadosFormularioMeta } from "@/components/nova-meta"
import type { LancamentoMeta } from "@/components/cartao-meta"
import estilos from "./reserva.module.css"

type MetaReserva = DadosFormularioMeta & { realizadoCentavos: number; previstoCentavos: number }

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"]

/** "28 de outubro", com o ano só quando não é o de hoje. */
function dataPorExtenso(iso: string, hoje: string) {
  const [ano, mes, dia] = iso.split("-").map(Number)
  return `${dia} de ${MESES[mes - 1]}${iso.slice(0, 4) === hoje.slice(0, 4) ? "" : ` de ${ano}`}`
}

const FORMAS: { forma: FormaDeJuntar["forma"]; rotulo: string }[] = [
  { forma: "POR_MES", rotulo: "Valor por mês" },
  { forma: "ATE_DATA", rotulo: "Até uma data" },
  { forma: "PERCENTUAL", rotulo: "Parte da renda" },
  { forma: "SOBRA", rotulo: "O que sobra" },
  { forma: "DE_UMA_VEZ", rotulo: "De uma vez" },
]
const PRAZOS = [6, 12, 18, 24, 36]
const FATIAS_BPS = [500, 1000, 1500, 2000]

export function TelaReserva({
  hoje,
  essencialCentavos,
  reservadoCentavos,
  alvoCentavos,
  mesesAlvo,
  rendaCentavos,
  sobraCentavos,
  meta,
  contas,
  lancamentos,
}: {
  hoje: string
  essencialCentavos: number
  reservadoCentavos: number
  alvoCentavos: number
  mesesAlvo: number
  rendaCentavos: number
  sobraCentavos: number
  meta: MetaReserva | null
  contas: ContaMeta[]
  lancamentos: LancamentoMeta[]
}) {
  const semEssencial = essencialCentavos <= 0
  const cobertura = semEssencial ? 0 : reservadoCentavos / essencialCentavos
  const ate = dataAteQuandoAguenta(hoje, reservadoCentavos, essencialCentavos)
  const comAlvo = dataAteQuandoAguenta(hoje, alvoCentavos, essencialCentavos)
  const falta = Math.max(0, alvoCentavos - reservadoCentavos)
  const completa = !semEssencial && falta === 0

  // A linha do tempo vai de hoje até o maior dos dois pontos: quem já passou
  // do alvo vê o próprio ponto além dele, e não preso no fim da régua.
  const escala = Math.max(mesesAlvo, cobertura, 0.01)
  const posicaoVoce = Math.min(100, (cobertura / escala) * 100)
  const posicaoAlvo = Math.min(100, (mesesAlvo / escala) * 100)

  return (
    <div className={estilos.pagina}>
      <section className={cn("ficha", estilos.topo)} data-completa={completa || undefined}>
        <p className={estilos.rotulo}>Se a renda parar hoje</p>
        {semEssencial ? (
          <>
            <h2 className={estilos.manchete}>Ainda não dá para dizer até quando sua reserva aguenta.</h2>
            <p className={estilos.apoio}>
              A conta precisa de um mês de gastos registrado para saber o seu custo essencial.{" "}
              <Link href="/lancar">Registrar gastos</Link>
            </p>
          </>
        ) : (
          <>
            <h2 className={estilos.manchete}>
              {reservadoCentavos > 0 ? (
                <>Sua reserva paga o essencial até <em>{dataPorExtenso(ate!, hoje)}</em>.</>
              ) : (
                <>Hoje a reserva <em>não cobre nenhum dia</em> do essencial.</>
              )}
            </h2>
            <p className={estilos.apoio}>
              {formatarMoeda(reservadoCentavos)} guardados ÷ {formatarMoeda(essencialCentavos)} por mês de essencial ={" "}
              {formatarDecimal(cobertura, 1)} {cobertura >= 1 && cobertura < 2 ? "mês" : "meses"}.
            </p>

            {/* Os três pontos são datas, não percentuais: "até 28 de outubro"
                contra "com o alvo, até março" é a régua que a pessoa entende. */}
            <div className={estilos.linhaDoTempo} role="img" aria-label={`Hoje, ${rotuloCompetencia(hoje.slice(0, 7), true)}. Sua reserva aguenta até ${dataPorExtenso(ate!, hoje)}. Com o alvo de ${mesesAlvo} meses, aguentaria até ${comAlvo ? dataPorExtenso(comAlvo, hoje) : "—"}.`}>
              <i className={estilos.trilho} />
              <i className={estilos.cheio} style={{ width: `${posicaoVoce}%` }} />
              <span className={estilos.marco} style={{ left: "0%" }} data-lado="inicio">
                <i data-cor="hoje" />
                <b>hoje</b>
                <small>{rotuloCompetencia(hoje.slice(0, 7), true)}</small>
              </span>
              {reservadoCentavos > 0 && (
                <span className={estilos.marco} style={{ left: `${posicaoVoce}%` }} data-lado={posicaoVoce > 80 ? "fim" : posicaoVoce < 12 ? "perto" : undefined}>
                  <i data-cor="voce" />
                  <b>{ate!.slice(8, 10)}/{rotuloCompetencia(ate!.slice(0, 7), true).split("/")[0]}</b>
                  <small>você</small>
                </span>
              )}
              {!completa && (
                <span className={estilos.marco} style={{ left: `${posicaoAlvo}%` }} data-lado="fim">
                  <i data-cor="alvo" />
                  <b>{comAlvo ? rotuloCompetencia(comAlvo.slice(0, 7), true) : "—"}</b>
                  <small>com o alvo</small>
                </span>
              )}
            </div>
          </>
        )}

        <Movimentar meta={meta} contas={contas} lancamentos={lancamentos} />
      </section>

      {!semEssencial && (
        <FormasDeJuntar
          hoje={hoje}
          falta={falta}
          alvoCentavos={alvoCentavos}
          mesesAlvo={mesesAlvo}
          rendaCentavos={rendaCentavos}
          sobraCentavos={sobraCentavos}
          meta={meta}
          contas={contas}
        />
      )}

      <SeuAlvo essencialCentavos={essencialCentavos} mesesAlvo={mesesAlvo} />
    </div>
  )
}

/**
 * Guardar e retirar na própria tela, sem abrir a meta. Um lançamento do
 * extrato pode ser usado no lugar de criar outro: a transferência para a
 * poupança já costuma estar lá, e contar duas vezes inflaria a reserva.
 */
function Movimentar({ meta, contas, lancamentos }: { meta: MetaReserva | null; contas: ContaMeta[]; lancamentos: LancamentoMeta[] }) {
  const router = useRouter()
  const [aberto, setAberto] = useState<"guardar" | "retirar" | null>(null)
  const [valor, setValor] = useState("")
  const [conta, setConta] = useState(meta?.contaId ?? contas[0]?.id ?? "")
  const [transacao, setTransacao] = useState("")
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState("")
  const [chave, setChave] = useState<string | null>(null)

  if (!meta) {
    return (
      <div className={estilos.acoes}>
        <p className={estilos.apoio}>Crie a reserva para registrar o que você guarda.</p>
        <NovaMeta contas={contas} reserva />
      </div>
    )
  }
  const parada = meta.status === "PAUSADA" || meta.status === "CANCELADA"
  const retirada = aberto === "retirar"
  // Aporte sai da conta (despesa); retirada volta para ela (receita).
  const doExtrato = lancamentos.filter((item) => item.tipo === (retirada ? "RECEITA" : "DESPESA"))

  function abrir(qual: "guardar" | "retirar") {
    setAberto((atual) => (atual === qual ? null : qual))
    setErro("")
    setTransacao("")
  }

  async function confirmar(evento: React.FormEvent) {
    evento.preventDefault()
    const escolhido = lancamentos.find((item) => item.id === transacao)
    const valorCentavos = escolhido?.valorCentavos ?? paraCentavos(valor || "0")
    if (valorCentavos <= 0) return setErro("Informe o valor.")
    setOcupado(true)
    setErro("")
    // A mesma chave em uma nova tentativa: se a primeira chegou e só a
    // resposta se perdeu, o servidor não grava duas vezes.
    const identificador = chave ?? crypto.randomUUID()
    setChave(identificador)
    try {
      await enviar(`/api/metas/${meta!.id}`, {
        chave: identificador,
        valorCentavos,
        contaId: escolhido?.contaId ?? conta,
        retirada,
        transacaoId: escolhido?.id,
      })
      setChave(null)
      setValor("")
      setAberto(null)
      router.refresh()
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não consegui registrar.")
    } finally {
      setOcupado(false)
    }
  }

  return (
    <>
      <div className={estilos.botoes}>
        <button type="button" className={estilos.guardar} aria-expanded={aberto === "guardar"} disabled={parada} onClick={() => abrir("guardar")}>
          Guardar agora
        </button>
        <button type="button" className={estilos.retirar} aria-expanded={aberto === "retirar"} disabled={parada || meta.saldoCentavos <= 0} onClick={() => abrir("retirar")}>
          Retirar
        </button>
      </div>
      {parada && <p className={estilos.apoio}>A reserva está pausada. Retome em &quot;Editar&quot; para movimentar.</p>}

      {aberto && (
        <form onSubmit={confirmar} className={estilos.movimento}>
          <label className={estilos.linhaValor}>
            <span>{retirada ? "Quanto retirar" : "Quanto guardar"}</span>
            <span className={estilos.valorDigitado}>
              R$ <input value={valor} onChange={(evento) => setValor(evento.target.value)} inputMode="decimal" placeholder="0,00" disabled={!!transacao} aria-label={retirada ? "Valor da retirada em reais" : "Valor guardado em reais"} autoFocus />
            </span>
          </label>
          <label className={estilos.campo}>
            <span>{retirada ? "Volta para a conta" : "Sai da conta"}</span>
            <select value={conta} onChange={(evento) => setConta(evento.target.value)} disabled={!!transacao}>
              {contas.length === 0 && <option value="">Nenhuma conta cadastrada</option>}
              {contas.map((item) => (
                <option key={item.id} value={item.id}>{item.nome}</option>
              ))}
            </select>
          </label>
          {doExtrato.length > 0 && (
            <label className={estilos.campo}>
              <span>Já aparece no extrato?</span>
              <select value={transacao} onChange={(evento) => setTransacao(evento.target.value)}>
                <option value="">Não, registrar agora</option>
                {doExtrato.map((item) => (
                  <option key={item.id} value={item.id}>{item.descricao} · {formatarMoeda(item.valorCentavos)}</option>
                ))}
              </select>
            </label>
          )}
          {erro && <p role="alert" className={estilos.erro}>{erro}</p>}
          <button type="submit" disabled={ocupado} className={estilos.confirmar}>
            {ocupado ? "Registrando…" : retirada ? "Confirmar retirada" : "Confirmar"}
          </button>
        </form>
      )}
    </>
  )
}

/**
 * Cinco jeitos de chegar ao mesmo alvo. Cada um parte do que a pessoa sabe
 * responder e devolve as mesmas duas coisas: quanto por mês e quando fica
 * pronto. "Usar como plano" grava o valor por mês na meta — e o prazo, quando
 * a pessoa escolheu por data.
 */
function FormasDeJuntar({
  hoje,
  falta,
  alvoCentavos,
  mesesAlvo,
  rendaCentavos,
  sobraCentavos,
  meta,
  contas,
}: {
  hoje: string
  falta: number
  alvoCentavos: number
  mesesAlvo: number
  rendaCentavos: number
  sobraCentavos: number
  meta: MetaReserva | null
  contas: ContaMeta[]
}) {
  const router = useRouter()
  const planoAtual = meta?.aporteMensalCentavos ?? 0
  const [forma, setForma] = useState<FormaDeJuntar["forma"]>("POR_MES")
  const [porMes, setPorMes] = useState(planoAtual > 0 ? String(planoAtual / 100) : "400")
  const [prazo, setPrazo] = useState(12)
  const [fatia, setFatia] = useState(1000)
  const [deUmaVez, setDeUmaVez] = useState("")
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState("")
  const [salvo, setSalvo] = useState(false)

  const escolha: FormaDeJuntar =
    forma === "POR_MES"
      ? { forma, porMesCentavos: paraCentavos(porMes || "0") }
      : forma === "ATE_DATA"
        ? { forma, meses: prazo }
        : forma === "PERCENTUAL"
          ? { forma, bps: fatia, rendaMensalCentavos: rendaCentavos }
          : forma === "SOBRA"
            ? { forma, sobraMensalCentavos: sobraCentavos }
            : { forma, valorCentavos: paraCentavos(deUmaVez || "0") }
  const plano = planoDeJuntar(falta, escolha)
  const competenciaHoje = hoje.slice(0, 7)
  const pronto = plano.meses ? rotuloCompetencia(competenciaMaisMeses(competenciaHoje, plano.meses), true) : null
  const mudouPlano = plano.porMesCentavos > 0 && plano.porMesCentavos !== planoAtual

  async function usarComoPlano() {
    if (!meta) return
    setSalvando(true)
    setErro("")
    try {
      await enviar(
        `/api/metas/${meta.id}`,
        {
          aporteMensalCentavos: plano.porMesCentavos,
          // O alvo da meta volta a ser o do panorama: gravado uma vez, ele
          // ficava para trás quando o custo essencial mudava.
          alvoCentavos: Math.max(1, alvoCentavos),
          // Plano por data grava o prazo; os outros tiram o que houver. Um
          // prazo velho ao lado de um valor novo fazia a meta acusar "aporte
          // abaixo do necessário" para um plano que a pessoa acabou de escolher.
          dataAlvo: forma === "ATE_DATA" ? `${competenciaMaisMeses(competenciaHoje, prazo)}-01` : null,
        },
        "PATCH",
      )
      setSalvo(true)
      router.refresh()
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não consegui salvar o plano.")
    } finally {
      setSalvando(false)
    }
  }

  if (falta === 0) {
    return (
      <section className={cn("ficha", estilos.bloco)}>
        <h2>Reserva completa</h2>
        <p className={estilos.apoio}>Você já tem os {mesesAlvo} meses do alvo. Daqui em diante, o que sobrar pode ir para metas e investimentos.</p>
        <Link href="/investir" className={estilos.link}>Ver investimentos</Link>
      </section>
    )
  }

  return (
    <section className={cn("ficha", estilos.bloco)}>
      <header>
        <h2>Para chegar aos {mesesAlvo} meses</h2>
        <small>falta {formatarMoeda(falta)}</small>
      </header>

      <p className={estilos.pergunta}>Como você quer juntar?</p>
      <div className={estilos.formas} role="group" aria-label="Forma de juntar">
        {FORMAS.map((item) => (
          <button key={item.forma} type="button" aria-pressed={forma === item.forma} onClick={() => { setForma(item.forma); setSalvo(false) }}>
            {item.rotulo}
          </button>
        ))}
      </div>

      <div className={estilos.controle}>
        {forma === "POR_MES" && (
          <>
            <label className={estilos.linhaValor}>
              <span>Guardar por mês</span>
              <span className={estilos.valorDigitado}>
                R$ <input value={porMes} onChange={(evento) => setPorMes(evento.target.value)} inputMode="decimal" aria-label="Valor guardado por mês em reais" />
              </span>
            </label>
            <input
              type="range"
              min={0}
              max={3000}
              step={50}
              value={Math.min(3000, paraCentavos(porMes || "0") / 100)}
              onChange={(evento) => setPorMes(evento.target.value)}
              aria-label="Guardar por mês"
              className={estilos.regua}
            />
          </>
        )}

        {forma === "ATE_DATA" && (
          <div className={estilos.chips} role="group" aria-label="Em quanto tempo">
            {PRAZOS.map((meses) => (
              <button key={meses} type="button" aria-pressed={prazo === meses} onClick={() => setPrazo(meses)}>
                {rotuloCompetencia(competenciaMaisMeses(competenciaHoje, meses), true)}
              </button>
            ))}
          </div>
        )}

        {forma === "PERCENTUAL" &&
          (rendaCentavos > 0 ? (
            <>
              <div className={estilos.chips} role="group" aria-label="Parte da renda">
                {FATIAS_BPS.map((bps) => (
                  <button key={bps} type="button" aria-pressed={fatia === bps} onClick={() => setFatia(bps)}>
                    {formatarPercentual(bps, 0)}
                  </button>
                ))}
              </div>
              <p className={estilos.nota}>Da sua renda média de {formatarMoeda(rendaCentavos)} por mês.</p>
            </>
          ) : (
            <p className={estilos.nota}>
              Sem renda registrada não dá para calcular a fatia. <Link href="/configuracoes">Informe sua renda</Link>
            </p>
          ))}

        {forma === "SOBRA" && (
          <p className={estilos.nota}>
            {sobraCentavos > 0
              ? <>Em média sobram {formatarMoeda(sobraCentavos)} por mês — entradas menos saídas dos últimos meses.</>
              : <>Em média não sobra nada: as saídas passam das entradas em {formatarMoeda(Math.abs(sobraCentavos))} por mês. <Link href="/orcamento">Ver onde cortar</Link></>}
          </p>
        )}

        {forma === "DE_UMA_VEZ" && (
          <>
            <label className={estilos.linhaValor}>
              <span>13º, bônus, venda, restituição</span>
              <span className={estilos.valorDigitado}>
                R$ <input value={deUmaVez} onChange={(evento) => setDeUmaVez(evento.target.value)} inputMode="decimal" placeholder="0,00" aria-label="Valor guardado de uma vez em reais" />
              </span>
            </label>
          </>
        )}
      </div>

      <p className={estilos.resposta} aria-live="polite">
        {forma === "DE_UMA_VEZ" ? (
          paraCentavos(deUmaVez || "0") <= 0 ? (
            "Informe o valor que vai entrar."
          ) : plano.restanteCentavos === 0 ? (
            <>Com isso a reserva <b>fica completa</b>.</>
          ) : (
            <>Depois disso ainda faltam <b>{formatarMoeda(plano.restanteCentavos)}</b>.</>
          )
        ) : plano.meses === null ? (
          "Nesse ritmo a reserva não chega ao alvo."
        ) : (
          <>
            {formatarMoeda(plano.porMesCentavos)} por mês · completa em <b>{pronto}</b>
            <small>
              {plano.meses} {plano.meses === 1 ? "mês" : "meses"}, sem contar rendimento
            </small>
          </>
        )}
      </p>

      {meta && (
        <div className={estilos.plano}>
          <span>
            {planoAtual > 0 ? <>Seu plano: {formatarMoeda(planoAtual)} por mês · guardou {formatarMoeda(meta.realizadoCentavos)} este mês</> : "Nenhum valor mensal planejado ainda."}
          </span>
          {forma !== "DE_UMA_VEZ" && mudouPlano && (
            <button type="button" onClick={() => void usarComoPlano()} disabled={salvando} className={estilos.usar}>
              {salvando ? "Salvando…" : "Usar como plano"}
            </button>
          )}
          {salvo && !mudouPlano && <small className={estilos.salvo}>Plano salvo.</small>}
          <NovaMeta meta={meta} contas={contas} />
        </div>
      )}
      {erro && <p role="alert" className={estilos.erro}>{erro}</p>}
    </section>
  )
}

/**
 * O alvo em meses e por quê. As respostas não ficam gravadas — só o número de
 * meses —, então a tela começa pelo perfil mais comum e mostra o alvo
 * vigente ao lado do sugerido.
 */
function SeuAlvo({ essencialCentavos, mesesAlvo }: { essencialCentavos: number; mesesAlvo: number }) {
  const router = useRouter()
  const [tipoDeRenda, setTipoDeRenda] = useState<TipoDeRenda>("ASSALARIADO")
  const [dependentes, setDependentes] = useState(0)
  const [rendaUnica, setRendaUnica] = useState(false)
  const [planoDeSaude, setPlanoDeSaude] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState("")

  const sugestao = mesesDeReservaSugeridos({ tipoDeRenda, dependentes, rendaUnica, planoDeSaude })
  const diferente = sugestao.meses !== mesesAlvo

  async function aplicar() {
    setSalvando(true)
    setErro("")
    try {
      await enviar("/api/reserva", { meses: sugestao.meses, custoEssencialCentavos: essencialCentavos }, "PUT")
      router.refresh()
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível salvar o alvo.")
    } finally {
      setSalvando(false)
    }
  }

  const chip = (ativo: boolean, rotulo: string, aoTocar: () => void) => (
    <button key={rotulo} type="button" aria-pressed={ativo} onClick={aoTocar}>
      {rotulo}
    </button>
  )

  return (
    <section className={cn("ficha", estilos.bloco)}>
      <header>
        <h2>Seu alvo: {mesesAlvo} meses</h2>
        {essencialCentavos > 0 && <small>{formatarMoeda(alvoEmCentavos(essencialCentavos, mesesAlvo))}</small>}
      </header>
      <p className={estilos.pergunta}>Como entra o seu dinheiro</p>
      <div className={estilos.chips} role="group" aria-label="Como entra o seu dinheiro">
        {chip(tipoDeRenda === "ASSALARIADO", "Salário fixo", () => setTipoDeRenda("ASSALARIADO"))}
        {chip(tipoDeRenda === "MISTA", "Fixo e variável", () => setTipoDeRenda("MISTA"))}
        {chip(tipoDeRenda === "VARIAVEL", "Tudo variável", () => setTipoDeRenda("VARIAVEL"))}
      </div>
      <p className={estilos.pergunta}>Quem depende de você</p>
      <div className={estilos.chips} role="group" aria-label="Quantas pessoas dependem de você">
        {[0, 1, 2, 3, 4].map((quantas) => chip(dependentes === quantas, quantas === 0 ? "Só eu" : quantas === 4 ? "4 ou mais" : String(quantas), () => setDependentes(quantas)))}
      </div>
      <div className={estilos.chips} role="group" aria-label="Outras situações">
        {chip(rendaUnica, "A casa vive de uma renda só", () => setRendaUnica(!rendaUnica))}
        {chip(planoDeSaude, "Tenho plano de saúde", () => setPlanoDeSaude(!planoDeSaude))}
      </div>

      <ul className={estilos.conta}>
        {sugestao.partes.map((parte) => (
          <li key={parte.rotulo}>
            <span>{parte.rotulo}</span>
            <b data-negativo={parte.meses < 0 || undefined}>{parte.meses > 0 ? "+" : ""}{parte.meses} {Math.abs(parte.meses) === 1 ? "mês" : "meses"}</b>
          </li>
        ))}
        <li className={estilos.soma}>
          <span>Com essas respostas</span>
          <b>{sugestao.meses} meses{essencialCentavos > 0 ? ` · ${formatarMoeda(alvoEmCentavos(essencialCentavos, sugestao.meses))}` : ""}</b>
        </li>
      </ul>
      {diferente && (
        <button type="button" onClick={() => void aplicar()} disabled={salvando} className={estilos.usar}>
          {salvando ? "Salvando…" : `Mudar o alvo para ${sugestao.meses} meses`}
        </button>
      )}
      {erro && <p role="alert" className={estilos.erro}>{erro}</p>}
    </section>
  )
}
