"use client"

import { useState } from "react"
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

/// Ícone por tipo de meta, em traço fino e sem cor (Davi, 25/09): os
/// quadrados coloridos com gradiente pareciam emoji e brigavam com o anel,
/// que é onde a cor da tela deve estar.
const TIPO: Record<string, typeof Target> = {
  VIAGEM: Plane, APOSENTADORIA: Palmtree, IMOVEL: Home, VEICULO: Car, EDUCACAO: GraduationCap, QUITAR_DIVIDA: Receipt,
}
const semCentavosZerados = (centavos: number) => formatarMoeda(centavos).replace(/,00$/, "")
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
  const Icone = TIPO[meta.tipo] ?? Target
  const percentual = Math.min(100, Math.round(projecao.percentual))
  const prazo = meta.dataAlvo ? `${MES_CURTO[Number(meta.dataAlvo.slice(5, 7)) - 1]} ${meta.dataAlvo.slice(0, 4)}` : null
  // O que o prazo pede por mês, quando há prazo e a meta não chegou; o
  // medidor fica âmbar quando o planejado não alcança. Sem prazo, o cartão
  // mostra só o aporte planejado.
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
      <span className={estilos.icone}>
        {meta.fotoUrl ? <img src={meta.fotoUrl} alt="" /> : <Icone aria-hidden strokeWidth={1.6} />}
      </span>
      <div className={estilos.nome}>
        <h2>{meta.nome}</h2>
        <small>{falta === 0 ? "alvo alcançado" : vencida ? "prazo vencido" : prazo ? `até ${prazo}` : "sem prazo"}{meta.status === "PAUSADA" ? " · pausada" : ""}</small>
      </div>
      <Anel percentual={percentual} />
    </header>

    <dl className={estilos.numeros}>
      <div><dt>Guardado</dt><dd className="valor-sensivel">{semCentavosZerados(meta.saldoCentavos)}</dd></div>
      <div><dt>Falta</dt><dd className="valor-sensivel">{semCentavosZerados(falta)}</dd></div>
      {/* Com prazo, o "por mês" mora no medidor logo abaixo; repetido aqui,
          o mesmo número aparecia duas vezes no cartão. */}
      {pedePorMes === null && <div><dt>Por mês</dt><dd className="valor-sensivel">{semCentavosZerados(meta.aporteMensalCentavos)}</dd></div>}
    </dl>

    {/* O ritmo como medidor, não como frase (Davi, 25/09): o que a pessoa
        guarda por mês contra o que o prazo pede, e a barra mostra quanto do
        pedido o planejado cobre. */}
    {pedePorMes !== null && (
      <div className={estilos.ritmo} data-abaixo={abaixo || undefined}>
        <div><small>Guardando</small><b className="valor-sensivel">{semCentavosZerados(meta.aporteMensalCentavos)}<span>/mês</span></b></div>
        <div><small>O prazo pede</small><b className="valor-sensivel">{semCentavosZerados(pedePorMes)}<span>/mês</span></b></div>
        <span className={estilos.medidor} aria-hidden><i style={{ width: `${pedePorMes > 0 ? Math.min(100, (meta.aporteMensalCentavos * 100) / pedePorMes) : 100}%` }} /></span>
      </div>
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
