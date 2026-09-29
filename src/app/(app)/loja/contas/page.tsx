"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Building2, Check, ChevronLeft, ChevronRight, CircleDashed, CreditCard, Home, Plus, Receipt, Trash2, Truck, UserRound, Zap } from "lucide-react"

import { buscar, enviar } from "@/lib/cliente"
import { formatarMoeda, paraCentavos } from "@/lib/dinheiro"
import { diaDaSemana, diasDoCalendario, diasEntre, somarDias, textoDoPrazo, tituloDoCalendario, type SituacaoDaConta } from "@/lib/loja/contas"
import { TrilhaLoja } from "@/components/trilha-loja"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { showToast } from "@/components/ui/toast"
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

import estilos from "./contas.module.css"

/**
 * Contas a pagar da loja — M1 do canvas (Davi, 29/09/2026).
 *
 * Separadas das despesas pessoais de propósito: misturar o aluguel do box com
 * o aluguel de casa é o que faz o MEI achar que lucrou quando só girou dinheiro.
 *
 * Vencido e "esta semana" aparecem separados — um já é problema, o outro ainda
 * é aviso, e juntar os dois faz a pessoa parar de olhar.
 *
 * Toda data aqui é texto de dia ("2026-09-28") vindo do servidor, que conhece o
 * fuso do lar. Comparar `new Date(vencimento)` com a hora do aparelho fazia a
 * conta do dia virar "vencida" logo de manhã.
 */

interface Conta {
  id: string
  descricao: string
  categoria: string
  valorCentavos: number
  dia: string
  paga: boolean
  pagaNoDia: string | null
  mensal: boolean
  situacao: SituacaoDaConta
}

interface Resposta {
  hoje: string
  contas: Conta[]
  resumo: {
    abertoCentavos: number
    vencidoCentavos: number
    daSemanaCentavos: number
    pagoNoMesCentavos: number
  }
}

type Filtro = "aberto" | "vencidas" | "pagas"

/// Cor e ícone de cada tipo: a mesma paleta das categorias do lado pessoal.
const TIPOS: Record<string, { rotulo: string; icone: typeof Home; cor: string }> = {
  ALUGUEL: { rotulo: "Aluguel", icone: Home, cor: "oklch(0.72 0.13 250)" },
  FORNECEDOR: {
    rotulo: "Fornecedor",
    icone: Truck,
    cor: "oklch(0.76 0.14 60)",
  },
  ENERGIA: {
    rotulo: "Luz, água, internet",
    icone: Zap,
    cor: "oklch(0.84 0.15 95)",
  },
  CONDOMINIO: {
    rotulo: "Condomínio",
    icone: Building2,
    cor: "oklch(0.7 0.15 300)",
  },
  IMPOSTO: { rotulo: "Imposto", icone: Receipt, cor: "oklch(0.76 0.11 190)" },
  MAQUININHA: {
    rotulo: "Maquininha",
    icone: CreditCard,
    cor: "oklch(0.72 0.14 340)",
  },
  FUNCIONARIO: {
    rotulo: "Funcionário",
    icone: UserRound,
    cor: "oklch(0.74 0.12 150)",
  },
  OUTRO: { rotulo: "Outro", icone: CircleDashed, cor: "oklch(0.7 0.02 250)" },
}
const tipo = (categoria: string) => TIPOS[categoria] ?? TIPOS.OUTRO

const MESES_CURTOS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]
const ddmm = (dia: string) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}`
const curtoDaSemana = (dia: string) => diaDaSemana(dia).slice(0, 3)
/// A grade anda quatro semanas por clique: a semana da borda continua à vista.
const PASSO_DA_GRADE = 4

/** Situação da conta como o calendário e a lista pintam: vencida, da semana ou depois. */
function tom(situacao: SituacaoDaConta) {
  if (situacao === "vencida") return "vencida"
  if (situacao === "vence hoje" || situacao === "esta semana") return "semana"
  return "depois"
}

function dividirCentavos(centavos: number) {
  const texto = formatarMoeda(centavos)
  const virgula = texto.lastIndexOf(",")
  return virgula < 0 ? [texto, ""] : [texto.slice(0, virgula), texto.slice(virgula)]
}

function IconeDoTipo({ categoria }: { categoria: string }) {
  const { icone: Icone, cor } = tipo(categoria)
  return (
    <span className={estilos.tipo} style={{ "--cor": cor } as React.CSSProperties} aria-hidden>
      <Icone />
    </span>
  )
}

export default function ContasDaLoja() {
  const [dados, setDados] = useState<Resposta | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [filtro, setFiltro] = useState<Filtro>("aberto")
  const [passo, setPasso] = useState(0)
  const [escolhido, setEscolhido] = useState<string | null>(null)
  const [aberta, setAberta] = useState<string | null>(null)
  const [nova, setNova] = useState(false)

  const carregar = useCallback(async () => {
    try {
      setDados(await buscar<Resposta>("/api/loja/contas"))
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não consegui carregar as contas.")
    }
  }, [])

  useEffect(() => {
    void carregar()
  }, [carregar])

  const hoje = dados?.hoje ?? null
  const contas = useMemo(() => dados?.contas ?? [], [dados])
  const abertas = useMemo(() => contas.filter((conta) => !conta.paga).sort((a, b) => a.dia.localeCompare(b.dia)), [contas])
  const vencidas = abertas.filter((conta) => conta.situacao === "vencida")
  const pagas = useMemo(() => contas.filter((conta) => conta.paga).sort((a, b) => (b.pagaNoDia ?? "").localeCompare(a.pagaNoDia ?? "")), [contas])
  const visiveis = filtro === "aberto" ? abertas : filtro === "vencidas" ? vencidas : pagas.slice(0, 30)

  const porDia = useMemo(() => {
    const mapa = new Map<string, Conta[]>()
    for (const conta of abertas) mapa.set(conta.dia, [...(mapa.get(conta.dia) ?? []), conta])
    return mapa
  }, [abertas])

  // O dia escolhido de partida é o próximo que tem conta: é o que a pessoa
  // veio ver. Sem conta pela frente, fica hoje.
  const proximoComConta = hoje ? (abertas.find((conta) => conta.dia >= hoje)?.dia ?? hoje) : null
  const diaDoPainel = escolhido ?? proximoComConta
  const dias = hoje ? diasDoCalendario(somarDias(hoje, passo * PASSO_DA_GRADE * 7)) : []

  const conta = contas.find((item) => item.id === aberta) ?? null

  async function pagar(alvo: Conta) {
    setOcupado(true)
    try {
      await enviar("/api/loja/contas", { id: alvo.id }, "PATCH")
      showToast(alvo.mensal ? `"${alvo.descricao}" paga. A do mês que vem já está na lista.` : `"${alvo.descricao}" paga.`)
      setAberta(null)
      await carregar()
    } catch (falha) {
      showToast(falha instanceof Error ? falha.message : "Não consegui dar baixa.")
    } finally {
      setOcupado(false)
    }
  }

  /**
   * "Desfazer em vez de confirmar" — mesmo padrão de `/recorrencias`. A conta
   * some da lista na hora; o DELETE de verdade só sai depois de 5s sem
   * ninguém desfazer.
   */
  function apagar(alvo: Conta) {
    setAberta(null)
    setDados((atual) =>
      atual
        ? {
            ...atual,
            contas: atual.contas.filter((item) => item.id !== alvo.id),
          }
        : atual,
    )
    let desfeito = false
    showToast(`"${alvo.descricao}" apagada`, {
      action: {
        label: "Desfazer",
        onClick: () => {
          desfeito = true
          setDados((atual) => (atual && !atual.contas.some((item) => item.id === alvo.id) ? { ...atual, contas: [...atual.contas, alvo] } : atual))
        },
      },
    })
    setTimeout(async () => {
      if (desfeito) return
      await buscar(`/api/loja/contas?id=${alvo.id}`, { method: "DELETE" })
      await carregar()
    }, 5000)
  }

  const resumo = dados?.resumo
  const [inteiro, centavos] = dividirCentavos(resumo?.abertoCentavos ?? 0)
  const ultima = abertas[abertas.length - 1]
  const atrasoMaior = hoje && vencidas[0] ? -diasEntre(hoje, vencidas[0].dia) : 0
  const fimDaSemana = hoje ? somarDias(hoje, 6) : null

  const tres = [
    {
      rotulo: "Vencido",
      valor: resumo?.vencidoCentavos ?? 0,
      cor: "var(--negativo)",
      apoio: vencidas.length === 0 ? "nada atrasado" : `${vencidas.length} ${vencidas.length === 1 ? "conta" : "contas"}, há ${atrasoMaior} ${atrasoMaior === 1 ? "dia" : "dias"}`,
    },
    {
      rotulo: "Na semana",
      valor: resumo?.daSemanaCentavos ?? 0,
      cor: "var(--ambar)",
      apoio: fimDaSemana ? `até ${curtoDaSemana(fimDaSemana)}, ${ddmm(fimDaSemana)}` : "",
    },
    {
      rotulo: "Pago",
      valor: resumo?.pagoNoMesCentavos ?? 0,
      cor: "var(--acao)",
      apoio: hoje ? `em ${MESES_CURTOS[Number(hoje.slice(5, 7)) - 1]}` : "",
    },
  ]

  const linha = (item: Conta) => {
    const situacao = item.paga ? "paga" : tom(item.situacao)
    return (
      <div key={item.id} className={estilos.linha} data-situacao={situacao} data-paga={item.paga ? "" : undefined}>
        <span className={estilos.data} aria-hidden>
          <b>{(item.paga ? (item.pagaNoDia ?? item.dia) : item.dia).slice(8, 10)}</b>
          <small>{MESES_CURTOS[Number((item.paga ? (item.pagaNoDia ?? item.dia) : item.dia).slice(5, 7)) - 1]}</small>
        </span>
        <div className={estilos.info}>
          <div>
            <button type="button" className={estilos.nome} onClick={() => setAberta(item.id)}>
              {item.descricao}
            </button>
            <b className={estilos.valor}>{formatarMoeda(item.valorCentavos)}</b>
          </div>
          <div>
            <span className={estilos.prazo} data-situacao={situacao}>
              {item.paga ? `paga em ${ddmm(item.pagaNoDia ?? item.dia)} · vencia ${ddmm(item.dia)}` : hoje ? textoDoPrazo(item.dia, hoje) : ddmm(item.dia)}
            </span>
            {!item.paga && (
              <button type="button" className={estilos.paguei} onClick={() => void pagar(item)} disabled={ocupado} aria-label={`Paguei ${item.descricao}`}>
                <Check aria-hidden />
                Paguei
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  const doDia = diaDoPainel ? (porDia.get(diaDoPainel) ?? []) : []

  const calendario = hoje && (
    <section className={`${estilos.bloco} ${estilos.calendario}`} aria-labelledby="titulo-calendario">
      <header>
        <h2 id="titulo-calendario">{tituloDoCalendario(dias)}</h2>
        <div className={estilos.setas}>
          <button type="button" onClick={() => setPasso(passo - 1)} disabled={passo <= -3} aria-label="Semanas anteriores">
            <ChevronLeft aria-hidden />
          </button>
          <button type="button" onClick={() => setPasso(passo + 1)} disabled={passo >= 12} aria-label="Próximas semanas">
            <ChevronRight aria-hidden />
          </button>
        </div>
      </header>
      <div className={estilos.dias} role="grid" aria-label="Vencimentos por dia">
        {["S", "T", "Q", "Q", "S", "S", "D"].map((letra, indice) => (
          <span key={indice} aria-hidden>
            {letra}
          </span>
        ))}
        {dias.map((dia) => {
          const noDia = porDia.get(dia) ?? []
          // O dia leva a cor da conta mais urgente dele.
          const pior = noDia.some((item) => item.situacao === "vencida") ? "vencida" : noDia.some((item) => tom(item.situacao) === "semana") ? "semana" : noDia.length ? "depois" : undefined
          const total = noDia.reduce((soma, item) => soma + item.valorCentavos, 0)
          return (
            <button
              key={dia}
              type="button"
              className={estilos.dia}
              data-hoje={dia === hoje ? "" : undefined}
              data-escolhido={dia === diaDoPainel ? "" : undefined}
              data-passado={dia < hoje ? "" : undefined}
              data-tem={noDia.length ? "" : undefined}
              data-situacao={pior}
              aria-pressed={dia === diaDoPainel}
              aria-label={`${diaDaSemana(dia)}, ${ddmm(dia)}${noDia.length ? `: ${noDia.length} ${noDia.length === 1 ? "conta" : "contas"}, ${formatarMoeda(total)}` : ": nada vence"}`}
              onClick={() => setEscolhido(dia)}
            >
              <span>{Number(dia.slice(8, 10))}</span>
              <i aria-hidden />
            </button>
          )
        })}
      </div>
      <div className={estilos.legenda} aria-hidden>
        <span>
          <i style={{ background: "var(--negativo)" }} />
          vencida
        </span>
        <span>
          <i style={{ background: "var(--ambar)" }} />
          esta semana
        </span>
        <span>
          <i
            style={{
              background: "color-mix(in oklab, var(--foreground), transparent 30%)",
            }}
          />
          depois
        </span>
      </div>
      {diaDoPainel && (
        <div className={estilos.doDia} aria-live="polite">
          {doDia.length === 0 ? (
            <p>Nada vence {diaDoPainel === hoje ? "hoje" : `em ${diaDaSemana(diaDoPainel)}, ${ddmm(diaDoPainel)}`}.</p>
          ) : (
            doDia.map((item) => (
              <button key={item.id} type="button" onClick={() => setAberta(item.id)}>
                <IconeDoTipo categoria={item.categoria} />
                <span>
                  <small>
                    {curtoDaSemana(item.dia)}, {ddmm(item.dia)} · {textoDoPrazo(item.dia, hoje)}
                  </small>
                  {item.descricao}
                </span>
                <b>{formatarMoeda(item.valorCentavos)}</b>
              </button>
            ))
          )}
        </div>
      )}
    </section>
  )

  return (
    <div className={estilos.pagina}>
      <TrilhaLoja pagina="Contas a pagar" />

      {erro && <p className={estilos.erro}>{erro}</p>}

      <div className={estilos.grade}>
        <div className={estilos.coluna}>
          <section className={`${estilos.bloco} ${estilos.hero}`} aria-label="Resumo das contas">
            <header>
              <div>
                <p>Em aberto</p>
                <strong className={estilos.total}>
                  {inteiro}
                  <span>{centavos}</span>
                </strong>
                <small>{abertas.length === 0 ? "Nenhuma conta em aberto" : `${abertas.length} ${abertas.length === 1 ? "conta" : "contas"} · a última vence em ${ddmm(ultima.dia)}`}</small>
              </div>
              <button type="button" className={`${estilos.mais} ${estilos.soCelular}`} onClick={() => setNova(true)} aria-label="Nova conta">
                <Plus aria-hidden />
              </button>
            </header>
            <div className={estilos.tres}>
              {tres.map((item) => (
                <div key={item.rotulo}>
                  <span>
                    <i style={{ background: item.cor }} aria-hidden />
                    {item.rotulo}
                  </span>
                  <b>{formatarMoeda(item.valor)}</b>
                  <small>{item.apoio}</small>
                </div>
              ))}
            </div>
          </section>

          {calendario}
        </div>

        <div className={estilos.coluna}>
          <div className={estilos.barra}>
            <div className={estilos.filtro} role="group" aria-label="Quais contas mostrar">
              {(
                [
                  ["aberto", "Em aberto", abertas.length],
                  ["vencidas", "Vencidas", vencidas.length],
                  ["pagas", "Pagas", pagas.length],
                ] as const
              ).map(([valor, rotulo, quantos]) => (
                <button key={valor} type="button" aria-pressed={filtro === valor} onClick={() => setFiltro(valor)}>
                  {rotulo}
                  <span>{quantos}</span>
                </button>
              ))}
            </div>
            <button type="button" className={`${estilos.botao} ${estilos.soComputador}`} data-principal onClick={() => setNova(true)}>
              <Plus aria-hidden />
              Nova conta
            </button>
          </div>

          <section className={`${estilos.bloco} ${estilos.lista}`} aria-label="Contas">
            {!dados ? (
              <p className={estilos.vazio}>Carregando…</p>
            ) : visiveis.length === 0 ? (
              <p className={estilos.vazio}>
                {filtro === "aberto"
                  ? "Nenhuma conta em aberto. Lance o aluguel, o condomínio e o fornecedor: com eles, o app consegue dizer o lucro de verdade."
                  : filtro === "vencidas"
                    ? "Nada vencido."
                    : "Nenhuma conta paga ainda."}
              </p>
            ) : (
              visiveis.map(linha)
            )}
          </section>
        </div>
      </div>

      <Dialog open={Boolean(conta)} onOpenChange={(abrir) => !abrir && setAberta(null)}>
        <DialogContent className="sm:max-w-[460px]">
          {conta && hoje && (
            <>
              <DialogHeader>
                <DialogTitle>{conta.descricao}</DialogTitle>
                <DialogDescription>
                  {tipo(conta.categoria).rotulo} · {conta.paga ? `paga em ${ddmm(conta.pagaNoDia ?? conta.dia)}` : textoDoPrazo(conta.dia, hoje)}
                </DialogDescription>
              </DialogHeader>
              <DialogBody>
                <div className={estilos.ficha}>
                  <strong className={estilos.grande}>{formatarMoeda(conta.valorCentavos)}</strong>
                  <div>
                    <div className={estilos.kv}>
                      <span>Vence</span>
                      <b>
                        {diaDaSemana(conta.dia)}, {ddmm(conta.dia)}
                      </b>
                    </div>
                    <div className={estilos.kv}>
                      <span>Repete</span>
                      <b>{conta.mensal ? "todo mês" : "uma vez"}</b>
                    </div>
                  </div>
                  {!conta.paga && conta.mensal && <p className={estilos.dica}>Ao marcar como paga, a do mês que vem nasce sozinha, com o mesmo valor.</p>}
                  <div className={estilos.dois}>
                    {!conta.paga ? (
                      <button type="button" className={estilos.botao} data-principal onClick={() => void pagar(conta)} disabled={ocupado}>
                        <Check aria-hidden />
                        Paguei
                      </button>
                    ) : (
                      <span />
                    )}
                    <button type="button" className={estilos.botao} data-perigo onClick={() => apagar(conta)}>
                      <Trash2 aria-hidden />
                      Apagar
                    </button>
                  </div>
                </div>
              </DialogBody>
            </>
          )}
        </DialogContent>
      </Dialog>

      <NovaConta aberta={nova} hoje={hoje} aoFechar={() => setNova(false)} aoLancar={carregar} />
    </div>
  )
}

function NovaConta({ aberta, hoje, aoFechar, aoLancar }: { aberta: boolean; hoje: string | null; aoFechar: () => void; aoLancar: () => Promise<void> }) {
  const vazio = {
    descricao: "",
    categoria: "ALUGUEL",
    valor: "",
    vencimento: hoje ?? "",
    mensal: true,
  }
  const [dados, setDados] = useState(vazio)
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  // A data de partida é o "hoje" do servidor, no fuso do lar; a do aparelho em
  // UTC já era amanhã depois das 21h.
  useEffect(() => {
    if (aberta)
      setDados((atual) => ({
        ...atual,
        vencimento: atual.vencimento || hoje || "",
      }))
  }, [aberta, hoje])

  async function lancar(evento: React.FormEvent) {
    evento.preventDefault()
    setOcupado(true)
    setErro(null)
    try {
      await enviar("/api/loja/contas", {
        descricao: dados.descricao,
        categoria: dados.categoria,
        valorCentavos: paraCentavos(dados.valor),
        vencimento: dados.vencimento,
        mensal: dados.mensal,
      })
      showToast(`"${dados.descricao.trim()}" lançada.`)
      setDados({ ...vazio, vencimento: dados.vencimento })
      aoFechar()
      await aoLancar()
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não consegui lançar a conta.")
    } finally {
      setOcupado(false)
    }
  }

  return (
    <Dialog open={aberta} onOpenChange={(abrir) => !abrir && aoFechar()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Nova conta</DialogTitle>
          <DialogDescription>O que a loja paga para existir: aluguel, fornecedor, luz, imposto.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <form onSubmit={lancar} className={estilos.ficha}>
            <label className={estilos.campo}>
              Do que é
              <Input value={dados.descricao} onChange={(evento) => setDados({ ...dados, descricao: evento.target.value })} placeholder="aluguel do ponto" maxLength={80} required autoFocus />
            </label>
            <div className={estilos.dois}>
              <label className={estilos.campo}>
                Valor (R$)
                <Input inputMode="decimal" value={dados.valor} onChange={(evento) => setDados({ ...dados, valor: evento.target.value })} placeholder="0,00" required />
              </label>
              <label className={estilos.campo}>
                Vence em
                <Input type="date" value={dados.vencimento} onChange={(evento) => setDados({ ...dados, vencimento: evento.target.value })} required />
              </label>
            </div>
            <div className={estilos.chips} role="group" aria-label="Tipo da conta">
              {Object.entries(TIPOS).map(([valor, item]) => (
                <button key={valor} type="button" aria-pressed={dados.categoria === valor} onClick={() => setDados({ ...dados, categoria: valor })}>
                  {item.rotulo}
                </button>
              ))}
            </div>
            <label className={estilos.repete}>
              Repete todo mês
              <Switch checked={dados.mensal} onCheckedChange={(mensal) => setDados({ ...dados, mensal })} />
            </label>
            <p className={estilos.dica}>{dados.mensal ? "Quando você marcar como paga, a do mês seguinte nasce sozinha." : "Conta de uma vez só: some da lista quando for paga."}</p>
            {erro && <p className={estilos.erro}>{erro}</p>}
            <button type="submit" className={estilos.botao} data-principal disabled={ocupado}>
              <Plus aria-hidden />
              Lançar conta
            </button>
          </form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
