"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { enviar } from "@/lib/cliente"
import { formatarMoeda, paraCentavos } from "@/lib/dinheiro"
import { projetarMeta } from "@/lib/financeiro"
import { NovaMeta, type ContaMeta, type DadosFormularioMeta } from "@/components/nova-meta"

type MetaPainel = DadosFormularioMeta & { previstoCentavos: number; realizadoCentavos: number; pendenteCentavos: number; competencia: string; rendimentoAnualBps: number }
export type LancamentoMeta = { id: string; contaId: string; descricao: string; valorCentavos: number; tipo: string }
const campo = "min-h-11 w-full rounded-xl border border-pauta bg-background px-3 py-2 text-sm"

export function CartaoMeta({ meta, contas, lancamentos }: { meta: MetaPainel; contas: ContaMeta[]; lancamentos: LancamentoMeta[] }) {
  const router = useRouter()
  const [aporte, setAporte] = useState("")
  const [meses, setMeses] = useState(12)
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState("")
  const [chave, setChave] = useState<string | null>(null)
  const projecao = projetarMeta({ alvoCentavos: meta.alvoCentavos, saldoAtualCentavos: meta.saldoCentavos, aporteMensalCentavos: meta.aporteMensalCentavos, rendimentoAnualBps: meta.rendimentoAnualBps, dataAlvo: meta.dataAlvo ? new Date(meta.dataAlvo) : null })
  const falta = Math.max(0, meta.alvoCentavos - meta.saldoCentavos)
  const vencida = falta > 0 && !!meta.dataAlvo && meta.dataAlvo.slice(0, 10) < new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" })
  const valorSimulado = Math.max(0, paraCentavos(aporte || "0"))

  async function registrar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault(); setErro(""); setOcupado(true)
    const dados = new FormData(evento.currentTarget)
    const identificador = chave ?? crypto.randomUUID()
    setChave(identificador)
    const transacao = lancamentos.find(t => t.id === dados.get("transacao"))
    try {
      await enviar(`/api/metas/${meta.id}`, {
        chave: identificador, valorCentavos: transacao?.valorCentavos ?? paraCentavos(String(dados.get("valor"))),
        contaId: transacao?.contaId ?? dados.get("conta"), retirada: transacao ? transacao.tipo === "RECEITA" : dados.get("retirada") === "on",
        transacaoId: transacao?.id,
      })
      setChave(null); router.refresh()
    } catch (erro) { setErro(erro instanceof Error ? erro.message : "Não consegui registrar.") }
    finally { setOcupado(false) }
  }

  return <article className="overflow-hidden rounded-[20px] border border-pauta bg-card">
    {meta.fotoUrl && <img src={meta.fotoUrl} alt={meta.nome} className="h-40 w-full object-cover" />}
    <div className="space-y-4 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3"><div><h2 className="text-[calc(15px*var(--escala-letra))] font-semibold">{meta.nome}</h2><p className="text-xs text-muted-fg">{({ ATIVA: "Ativa", PAUSADA: "Pausada", CONCLUIDA: "Concluída", CANCELADA: "Cancelada" } as Record<string, string>)[meta.status]}{meta.compromissoMensal ? " · compromisso fixo" : ""}</p></div><NovaMeta meta={meta} contas={contas} /></div>
      <div><p className="text-3xl font-bold tracking-tight">{formatarMoeda(meta.saldoCentavos)}</p><p className="text-xs text-muted-fg">de {formatarMoeda(meta.alvoCentavos)} · {Math.round(projecao.percentual)}%</p></div>
      <progress aria-label={`Progresso de ${meta.nome}`} max={100} value={projecao.percentual} className="h-2 w-full accent-primary" />
      <p className="text-sm">{falta === 0 ? "Alvo alcançado" : vencida ? "Prazo vencido" : !projecao.noPrazo ? "Aporte planejado abaixo do necessário" : meta.dataAlvo ? "Plano compatível com o prazo" : "Sem prazo definido"}{meta.dataAlvo ? ` · ${new Date(meta.dataAlvo).toLocaleDateString("pt-BR", { timeZone: "UTC" })}` : ""}</p>
      <dl className="grid grid-cols-3 gap-2 text-xs"><div><dt className="text-muted-fg">Previsto no mês</dt><dd className="mt-1 font-semibold">{formatarMoeda(meta.previstoCentavos)}</dd></div><div><dt className="text-muted-fg">Realizado</dt><dd className="mt-1 font-semibold">{formatarMoeda(meta.realizadoCentavos)}</dd></div><div><dt className="text-muted-fg">Falta aportar</dt><dd className="mt-1 font-semibold">{formatarMoeda(meta.pendenteCentavos)}</dd></div></dl>
      <details><summary className="min-h-11 cursor-pointer py-3 text-sm">Ajuda do Tino</summary><p className="text-sm text-muted-fg">{falta === 0 ? "Você chegou ao valor planejado." : vencida ? `Ainda faltam ${formatarMoeda(falta)}. Revise o prazo ou o aporte no editor.` : meta.dataAlvo ? `Para o prazo informado, a estimativa é ${formatarMoeda(projecao.aporteNecessarioCentavos)} por mês. Você planejou ${formatarMoeda(meta.aporteMensalCentavos)}.` : `Ainda faltam ${formatarMoeda(falta)}. Defina um prazo para calcular o aporte necessário.`} {meta.pendenteCentavos > 0 ? `Em ${meta.competencia}, faltam ${formatarMoeda(meta.pendenteCentavos)} do aporte planejado.` : "O aporte planejado do mês está coberto."} O plano usa o saldo cadastrado e os aportes confirmados; rendimento informado é uma hipótese.</p></details>
      <details><summary className="min-h-11 cursor-pointer py-3 text-sm">Simular outra possibilidade</summary><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs">Aporte mensal (R$)<input inputMode="decimal" value={aporte} onChange={e => setAporte(e.target.value)} className={campo} /></label><label className="text-xs">Prazo em meses<input type="number" min={1} max={600} value={meses} onChange={e => setMeses(Math.max(1, Math.min(600, Number(e.target.value) || 1)))} className={campo} /></label></div><p className="mt-2 text-xs text-muted-fg">Sem rendimento: {formatarMoeda(Math.ceil(falta / meses))}/mês para concluir em {meses} meses.{valorSimulado > 0 ? ` Com ${formatarMoeda(valorSimulado)}/mês: ${Math.ceil(falta / valorSimulado)} meses.` : ""} Simular não altera sua meta.</p></details>
      {meta.status !== "PAUSADA" && meta.status !== "CANCELADA" && <details><summary className="min-h-11 cursor-pointer py-3 text-sm">Registrar aporte ou retirada</summary><form onSubmit={registrar} className="space-y-3">
        <label className="block text-xs">Usar lançamento já registrado<select name="transacao" className={campo}><option value="">Criar um novo lançamento</option>{lancamentos.map(t => <option key={t.id} value={t.id}>{t.descricao} · {formatarMoeda(t.valorCentavos)}</option>)}</select></label>
        <label className="block text-xs">Valor do novo lançamento (R$)<input name="valor" inputMode="decimal" className={campo} /></label>
        <label className="block text-xs">Conta<select name="conta" defaultValue={meta.contaId ?? ""} className={campo}><option value="">Escolha uma conta</option>{contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></label>
        <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" name="retirada" />É uma retirada</label>
        <p className="text-xs text-muted-fg">Se já aparece no extrato, selecione o lançamento para não contar duas vezes. Novo aporte registra uma saída da conta; retirada registra uma entrada.</p>
        {erro && <p role="alert" className="text-sm text-negativo">{erro}</p>}
        <button disabled={ocupado} className="min-h-11 rounded-full bg-primary px-4 text-sm text-primary-foreground disabled:opacity-50">{ocupado ? "Registrando…" : "Confirmar movimento"}</button>
      </form></details>}
    </div>
  </article>
}
