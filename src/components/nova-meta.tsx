"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { enviar } from "@/lib/cliente"
import { paraCentavos } from "@/lib/dinheiro"
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export type ContaMeta = { id: string; nome: string }
export type DadosFormularioMeta = {
  id: string; nome: string; tipo: string; alvoCentavos: number; saldoCentavos: number;
  aporteMensalCentavos: number; dataAlvo: string | null; contaId: string | null;
  fotoUrl: string | null; lembreteDia: number | null; compromissoMensal: boolean; status: string;
}
const campo = "min-h-11 w-full rounded-xl border border-pauta bg-background px-3 py-2 text-sm"

export function NovaMeta({ contas = [], meta, reserva = false }: { contas?: ContaMeta[]; meta?: DadosFormularioMeta; reserva?: boolean }) {
  const router = useRouter()
  const [aberto, setAberto] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [lendoFoto, setLendoFoto] = useState(false)
  const [erro, setErro] = useState("")
  const [fotoUrl, setFotoUrl] = useState<string | null>(meta?.fotoUrl ?? null)
  const [compromisso, setCompromisso] = useState(meta?.compromissoMensal ?? false)

  async function lerFoto(arquivo?: File) {
    if (!arquivo) return
    setErro("")
    if (!["image/png", "image/jpeg", "image/webp"].includes(arquivo.type) || arquivo.size > 500 * 1024) { setErro("Use PNG, JPEG ou WebP de até 500 KB."); return }
    setLendoFoto(true)
    try {
      const foto = await createImageBitmap(arquivo)
      if (foto.width > 6000 || foto.height > 6000) { foto.close(); throw new Error("Use uma foto com até 6000 pixels por lado.") }
      foto.close()
      const leitor = new FileReader()
      const url = await new Promise<string>((resolve, reject) => {
        leitor.onload = () => typeof leitor.result === "string" ? resolve(leitor.result) : reject(new Error("Foto inválida."))
        leitor.onerror = () => reject(new Error("Não consegui ler a foto."))
        leitor.readAsDataURL(arquivo)
      })
      setFotoUrl(url)
    } catch { setErro("Não consegui abrir essa imagem. Escolha outra foto.") }
    finally { setLendoFoto(false) }
  }

  async function salvar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const dados = new FormData(evento.currentTarget)
    setOcupado(true); setErro("")
    try {
      await enviar(meta ? `/api/metas/${meta.id}` : "/api/metas", {
        nome: dados.get("nome"), tipo: dados.get("tipo"), alvoCentavos: paraCentavos(String(dados.get("alvo"))),
        ...(!meta ? { saldoCentavos: paraCentavos(String(dados.get("saldo") || "0")) } : {}),
        aporteMensalCentavos: paraCentavos(String(dados.get("aporte") || "0")),
        dataAlvo: dados.get("prazo") || null, contaId: dados.get("conta") || null,
        lembreteDia: dados.get("lembrete") ? Number(dados.get("lembrete")) : null,
        compromissoMensal: compromisso, fotoUrl,
        ...(meta ? { status: dados.get("status") } : {}),
      }, meta ? "PATCH" : "POST")
      setAberto(false); router.refresh()
    } catch (erro) { setErro(erro instanceof Error ? erro.message : "Não consegui salvar.") }
    finally { setOcupado(false) }
  }
  const reais = (valor?: number) => valor ? String(valor / 100).replace(".", ",") : ""
  return <>
    <button className="min-h-11 rounded-full border border-pauta px-4 text-sm" onClick={() => setAberto(true)}>{meta ? "Editar meta" : reserva ? "Criar reserva" : "Nova meta"}</button>
    <Dialog open={aberto} onOpenChange={setAberto}><DialogContent>
      <DialogHeader><DialogTitle>{meta ? "Editar meta" : reserva ? "Sua reserva" : "Nova meta"}</DialogTitle></DialogHeader>
      <form onSubmit={salvar}><DialogBody className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs">Nome<input name="nome" required maxLength={120} defaultValue={meta?.nome ?? (reserva ? "Reserva de emergência" : "")} className={campo} /></label>
        <label className="text-xs">Tipo<select name="tipo" defaultValue={meta?.tipo ?? (reserva ? "RESERVA_EMERGENCIA" : "OUTRO")} className={campo}>
          {Object.entries({ OUTRO: "Outra meta", VIAGEM: "Viagem", RESERVA_EMERGENCIA: "Reserva de emergência", APOSENTADORIA: "Aposentadoria", IMOVEL: "Imóvel", VEICULO: "Veículo", EDUCACAO: "Educação", QUITAR_DIVIDA: "Quitar dívida" }).map(([valor, nome]) => <option key={valor} value={valor}>{nome}</option>)}
        </select></label>
        <label className="text-xs">Quanto juntar (R$)<input name="alvo" required inputMode="decimal" defaultValue={reais(meta?.alvoCentavos)} className={campo} /></label>
        {!meta && <label className="text-xs">Saldo já guardado (R$)<input name="saldo" inputMode="decimal" className={campo} /></label>}
        <label className="text-xs">Aporte planejado por mês (R$)<input name="aporte" inputMode="decimal" defaultValue={reais(meta?.aporteMensalCentavos)} className={campo} /></label>
        <label className="text-xs">Prazo opcional<input name="prazo" type="date" defaultValue={meta?.dataAlvo?.slice(0, 10)} className={campo} /></label>
        <label className="text-xs">Conta de saída dos aportes<select name="conta" required={compromisso} defaultValue={meta?.contaId ?? ""} className={campo}><option value="">Escolher depois</option>{contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></label>
        <label className="text-xs">Dia do lembrete mensal (opcional)<input name="lembrete" type="number" min={1} max={31} defaultValue={meta?.lembreteDia ?? ""} className={campo} /></label>
        <label className="flex min-h-11 items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={compromisso} onChange={e => setCompromisso(e.target.checked)} />Tratar aporte como compromisso fixo</label>
        <p className="text-xs text-muted-fg sm:col-span-2">Planejar não movimenta dinheiro. Confirme o aporte quando acontecer. Lembretes aparecem ao atualizar os alertas do Tino; dias 29–31 se ajustam ao fim do mês.</p>
        {meta && <label className="text-xs">Situação<select name="status" defaultValue={meta.status} className={campo}>{Object.entries({ ATIVA: "Ativa", PAUSADA: "Pausada", CONCLUIDA: "Concluída", CANCELADA: "Cancelada" }).map(([valor, nome]) => <option key={valor} value={valor}>{nome}</option>)}</select></label>}
        <label className="text-xs sm:col-span-2">Foto opcional · até 500 KB<input type="file" accept="image/png,image/jpeg,image/webp" className={campo} onChange={e => void lerFoto(e.target.files?.[0])} /></label>
        {fotoUrl && <div className="sm:col-span-2"><img src={fotoUrl} alt="Foto escolhida para a meta" className="h-28 w-full rounded-xl object-cover" /><button type="button" className="min-h-11 text-sm" onClick={() => setFotoUrl(null)}>Remover foto</button></div>}
        {erro && <p role="alert" className="text-sm text-negativo sm:col-span-2">{erro}</p>}
      </DialogBody><DialogFooter><button disabled={ocupado || lendoFoto} className="min-h-11 rounded-full bg-primary px-5 text-sm text-primary-foreground disabled:opacity-50">{ocupado ? "Salvando…" : "Salvar meta"}</button></DialogFooter></form>
    </DialogContent></Dialog>
  </>
}
