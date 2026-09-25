"use client"

import { useState, type CSSProperties } from "react"
import { useRouter } from "next/navigation"
import { Car, GraduationCap, Home, Palmtree, Pencil, Plane, Receipt, SlidersHorizontal, Target } from "lucide-react"

import { enviar } from "@/lib/cliente"
import { formatarMoeda, paraCentavos } from "@/lib/dinheiro"
import { projetarMeta } from "@/lib/financeiro"
import { NovaMeta, type ContaMeta, type DadosFormularioMeta } from "@/components/nova-meta"
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import estilos from "./cartao-meta.module.css"

type MetaPainel = DadosFormularioMeta & { previstoCentavos: number; realizadoCentavos: number; pendenteCentavos: number; competencia: string; rendimentoAnualBps: number }
export type LancamentoMeta = { id: string; contaId: string; descricao: string; valorCentavos: number; tipo: string }
const campo = "min-h-11 w-full rounded-xl border border-pauta bg-background px-3 py-2 text-sm"

/// Ícone e cor por tipo de meta: a pessoa acha a meta pela cor antes de ler o
/// nome, e a cor não muda de uma visita para outra.
const TIPO: Record<string, { Icone: typeof Target; cor: string }> = {
  VIAGEM: { Icone: Plane, cor: "linear-gradient(145deg, oklch(0.62 0.15 230), oklch(0.36 0.09 250))" },
  APOSENTADORIA: { Icone: Palmtree, cor: "linear-gradient(145deg, oklch(0.6 0.14 160), oklch(0.34 0.08 170))" },
  IMOVEL: { Icone: Home, cor: "linear-gradient(145deg, oklch(0.66 0.14 60), oklch(0.38 0.08 50))" },
  VEICULO: { Icone: Car, cor: "linear-gradient(145deg, oklch(0.6 0.16 290), oklch(0.34 0.09 290))" },
  EDUCACAO: { Icone: GraduationCap, cor: "linear-gradient(145deg, oklch(0.66 0.15 90), oklch(0.4 0.08 80))" },
  QUITAR_DIVIDA: { Icone: Receipt, cor: "linear-gradient(145deg, oklch(0.62 0.17 25), oklch(0.36 0.1 25))" },
}
const PADRAO = { Icone: Target, cor: "linear-gradient(145deg, oklch(0.62 0.12 200), oklch(0.36 0.07 210))" }
const MES_CURTO = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]

/**
 * Cartão de meta (Davi, 25/09: cartões da opção C, com a linha "guardando X
 * por mês; para chegar no prazo, Y" da opção A).
 *
 * Três números — guardado, falta e por mês — e os dois botões que a pessoa
 * usa de verdade, guardar e retirar, à vista. Antes o registro, a simulação e
 * a ajuda ficavam em três menus fechados com triângulo, e guardar dinheiro
 * numa meta pedia abrir um deles e achar o formulário no fim do cartão.
 */
export function CartaoMeta({ meta, contas, lancamentos }: { meta: MetaPainel; contas: ContaMeta[]; lancamentos: LancamentoMeta[] }) {
  const router = useRouter()
  const [movimento, setMovimento] = useState<"guardar" | "retirar" | null>(null)
  const [simular, setSimular] = useState(false)
  const [aporte, setAporte] = useState("")
  const [meses, setMeses] = useState(12)
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState("")
  const [chave, setChave] = useState<string | null>(null)
  const projecao = projetarMeta({ alvoCentavos: meta.alvoCentavos, saldoAtualCentavos: meta.saldoCentavos, aporteMensalCentavos: meta.aporteMensalCentavos, rendimentoAnualBps: meta.rendimentoAnualBps, dataAlvo: meta.dataAlvo ? new Date(meta.dataAlvo) : null })
  const falta = Math.max(0, meta.alvoCentavos - meta.saldoCentavos)
  const vencida = falta > 0 && !!meta.dataAlvo && meta.dataAlvo.slice(0, 10) < new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" })
  const valorSimulado = Math.max(0, paraCentavos(aporte || "0"))
  const { Icone, cor } = TIPO[meta.tipo] ?? PADRAO
  const percentual = Math.min(100, Math.round(projecao.percentual))
  const prazo = meta.dataAlvo ? `${MES_CURTO[Number(meta.dataAlvo.slice(5, 7)) - 1]} ${meta.dataAlvo.slice(0, 4)}` : null
  // "Por mês" é o que o prazo pede, quando há prazo e a meta não chegou; em
  // âmbar quando o planejado não alcança. Sem prazo, é o aporte planejado.
  const pedePorMes = meta.dataAlvo && falta > 0 && !vencida ? projecao.aporteNecessarioCentavos : null
  const abaixo = pedePorMes !== null && pedePorMes > meta.aporteMensalCentavos
  const ativa = meta.status !== "PAUSADA" && meta.status !== "CANCELADA"

  async function registrar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault(); setErro(""); setOcupado(true)
    const dados = new FormData(evento.currentTarget)
    const identificador = chave ?? crypto.randomUUID()
    setChave(identificador)
    const transacao = lancamentos.find(t => t.id === dados.get("transacao"))
    try {
      await enviar(`/api/metas/${meta.id}`, {
        chave: identificador, valorCentavos: transacao?.valorCentavos ?? paraCentavos(String(dados.get("valor"))),
        contaId: transacao?.contaId ?? dados.get("conta"), retirada: transacao ? transacao.tipo === "RECEITA" : movimento === "retirar",
        transacaoId: transacao?.id,
      })
      setChave(null); setMovimento(null); router.refresh()
    } catch (erro) { setErro(erro instanceof Error ? erro.message : "Não consegui registrar.") }
    finally { setOcupado(false) }
  }

  return <article className={estilos.cartao}>
    <header className={estilos.topo}>
      <span className={estilos.icone} style={{ "--cor": cor } as CSSProperties}>
        {meta.fotoUrl ? <img src={meta.fotoUrl} alt="" /> : <Icone aria-hidden />}
      </span>
      <div className={estilos.nome}>
        <h2>{meta.nome}</h2>
        <small>{falta === 0 ? "alvo alcançado" : vencida ? "prazo vencido" : prazo ? `até ${prazo}` : "sem prazo"}{meta.status === "PAUSADA" ? " · pausada" : ""}</small>
      </div>
      <Anel percentual={percentual} />
    </header>

    <dl className={estilos.numeros}>
      <div><dt>Guardado</dt><dd className="valor-sensivel">{formatarMoeda(meta.saldoCentavos).replace(/,00$/, "")}</dd></div>
      <div><dt>Falta</dt><dd className="valor-sensivel">{formatarMoeda(falta).replace(/,00$/, "")}</dd></div>
      <div><dt>Por mês</dt><dd className="valor-sensivel" data-abaixo={abaixo || undefined}>{formatarMoeda(pedePorMes ?? meta.aporteMensalCentavos).replace(/,00$/, "")}</dd></div>
    </dl>

    {pedePorMes !== null && prazo && (
      <p className={estilos.ritmo} data-abaixo={abaixo || undefined}>
        Guardando {formatarMoeda(meta.aporteMensalCentavos)}/mês. Para chegar em {prazo}: <b>{formatarMoeda(pedePorMes)}/mês</b>
      </p>
    )}

    {ativa && falta >= 0 && (
      <div className={estilos.botoes}>
        <button type="button" onClick={() => setMovimento("guardar")}>+ Guardar</button>
        <button type="button" onClick={() => setMovimento("retirar")} disabled={meta.saldoCentavos <= 0}>Retirar</button>
      </div>
    )}

    <div className={estilos.extras}>
      <NovaMeta meta={meta} contas={contas} classeBotao={estilos.extra} rotuloBotao={<><Pencil aria-hidden />Editar</>} />
      <button type="button" className={estilos.extra} onClick={() => setSimular(true)}><SlidersHorizontal aria-hidden />Simular</button>
    </div>

    <Dialog open={movimento !== null} onOpenChange={(aberto) => !aberto && setMovimento(null)}>
      <DialogContent largura="curta">
        <DialogHeader><DialogTitle>{movimento === "retirar" ? "Retirar de" : "Guardar em"} {meta.nome}</DialogTitle><DialogDescription>Se o movimento já está no extrato, escolha o lançamento para não contar duas vezes.</DialogDescription></DialogHeader>
        <form onSubmit={registrar}><DialogBody className="space-y-3">
          <label className="block text-xs">Valor (R$)<input name="valor" inputMode="decimal" autoFocus className={campo} /></label>
          <label className="block text-xs">Conta<select name="conta" defaultValue={meta.contaId ?? ""} className={campo}><option value="">Escolha uma conta</option>{contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></label>
          <label className="block text-xs">Ou usar um lançamento do extrato<select name="transacao" className={campo}><option value="">Não, criar um novo</option>{lancamentos.map(t => <option key={t.id} value={t.id}>{t.descricao} · {formatarMoeda(t.valorCentavos)}</option>)}</select></label>
          {erro && <p role="alert" className="text-sm text-negativo">{erro}</p>}
          <button disabled={ocupado} className="min-h-11 w-full rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50">{ocupado ? "Registrando…" : movimento === "retirar" ? "Confirmar retirada" : "Confirmar"}</button>
        </DialogBody></form>
      </DialogContent>
    </Dialog>

    <Dialog open={simular} onOpenChange={setSimular}>
      <DialogContent largura="curta">
        <DialogHeader><DialogTitle>Simular {meta.nome}</DialogTitle><DialogDescription>Simular não altera sua meta.</DialogDescription></DialogHeader>
        <DialogBody className="space-y-3">
          <div className="grid grid-cols-2 gap-3"><label className="text-xs">Por mês (R$)<input inputMode="decimal" value={aporte} onChange={e => setAporte(e.target.value)} className={campo} /></label><label className="text-xs">Prazo em meses<input type="number" min={1} max={600} value={meses} onChange={e => setMeses(Math.max(1, Math.min(600, Number(e.target.value) || 1)))} className={campo} /></label></div>
          <p className="text-sm text-muted-fg">Sem rendimento: {formatarMoeda(Math.ceil(falta / meses))}/mês para concluir em {meses} meses.{valorSimulado > 0 ? ` Com ${formatarMoeda(valorSimulado)}/mês: ${Math.ceil(falta / valorSimulado)} meses.` : ""}</p>
        </DialogBody>
      </DialogContent>
    </Dialog>
  </article>
}

function Anel({ percentual }: { percentual: number }) {
  return (
    <svg className={estilos.anel} viewBox="0 0 36 36" role="img" aria-label={`${percentual}% da meta`}>
      <circle cx="18" cy="18" r="15" fill="none" strokeWidth="3.2" className={estilos.anelFundo} />
      <circle cx="18" cy="18" r="15" fill="none" strokeWidth="3.2" strokeLinecap="round" transform="rotate(-90 18 18)" strokeDasharray={`${Math.max(1.5, (percentual / 100) * 94.2)} 94.2`} className={estilos.anelCheio} />
      <text x="18" y="21" textAnchor="middle">{percentual}%</text>
    </svg>
  )
}
