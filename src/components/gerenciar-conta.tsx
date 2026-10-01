"use client"

import { useState } from "react"
import { enviar } from "@/lib/cliente"
import { paraCentavos } from "@/lib/dinheiro"
import { SeletorInstituicao } from "@/components/seletor-instituicao"
import { Button } from "@/components/ui/button"
import { SelectNative } from "@/components/ui/select-native"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody } from "@/components/ui/dialog"
import { showToast } from "@/components/ui/toast"

interface ContaGerenciavel { id: string; tipo: string; nome: string; instituicao: string | null; limiteCentavos: number | null; diaVencimento: number | null }

export function GerenciarConta({ conta, excluirInicialmente = false, fechar, aoSalvar, aoRemover }: {
  conta: ContaGerenciavel; excluirInicialmente?: boolean; fechar: () => void; aoSalvar: () => void; aoRemover: () => void
}) {
  const ehCartao = conta.tipo === "CARTAO_CREDITO"
  const rotulo = ehCartao ? "cartão" : "conta"
  const [instituicao, setInstituicao] = useState(conta.instituicao ?? "")
  const [nome, setNome] = useState(conta.nome)
  const [limite, setLimite] = useState(conta.limiteCentavos === null ? "" : (conta.limiteCentavos / 100).toFixed(2).replace(".", ","))
  const [vencimento, setVencimento] = useState(conta.diaVencimento === null ? "" : String(conta.diaVencimento))
  const [confirmando, setConfirmando] = useState(excluirInicialmente)
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  async function salvar(e: React.FormEvent) {
    e.preventDefault(); setOcupado(true); setErro(null)
    try {
      if (ehCartao && limite && (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:[,.]\d{1,2})?$/.test(limite.trim()) || paraCentavos(limite) > 2147483647)) throw new Error("Informe um limite válido.")
      await enviar(`/api/contas/${conta.id}`, { nome: nome.trim(), instituicao: instituicao || null, ...(ehCartao ? { limiteCentavos: limite ? paraCentavos(limite) : null, diaVencimento: vencimento ? Number(vencimento) : null } : {}) }, "PATCH")
      showToast(ehCartao ? "Cartão atualizado" : "Conta atualizada"); aoSalvar(); fechar()
    } catch (e) { setErro(e instanceof Error ? e.message : "Não consegui salvar.") } finally { setOcupado(false) }
  }
  async function excluir() {
    setOcupado(true); setErro(null)
    try {
      const resultado = await enviar<{ arquivada?: boolean }>(`/api/contas/${conta.id}`, {}, "DELETE")
      showToast(resultado.arquivada ? `Registro arquivado. Seu histórico foi preservado.` : (ehCartao ? "Cartão excluído" : "Conta excluída")); aoRemover()
    } catch (e) { setErro(e instanceof Error ? e.message : "Não consegui excluir.") } finally { setOcupado(false) }
  }
  return <Dialog open onOpenChange={(aberto) => { if (!aberto && !ocupado) fechar() }}><DialogContent><DialogHeader><DialogTitle>{`${confirmando ? "Excluir" : "Editar"} ${rotulo}`}</DialogTitle><DialogDescription>{conta.nome}</DialogDescription></DialogHeader><DialogBody>
    {confirmando ? <div className="space-y-4"><p className="text-sm">Deseja excluir {ehCartao ? "este cartão" : "esta conta"}? Se houver lançamentos, faturas ou outros registros vinculados, o registro será arquivado para preservar o histórico.</p><div className="flex justify-end gap-2"><Button variant="ghost" disabled={ocupado} onClick={() => setConfirmando(false)}>Voltar</Button><Button variant="destructive" disabled={ocupado} onClick={excluir}>{ocupado ? "Excluindo…" : "Confirmar exclusão"}</Button></div></div> : <form onSubmit={salvar} className="space-y-4">
      <SeletorInstituicao valor={instituicao} aoEscolher={(banco) => { setInstituicao(banco); setNome(ehCartao ? `Cartão ${banco}` : banco) }} />
      <label className="block space-y-1 text-sm">Nome {ehCartao ? "do cartão" : "da conta"}<Input value={nome} onChange={(e) => setNome(e.target.value)} required /></label>
      {ehCartao && <><label className="block space-y-1 text-sm">Limite total (R$)<Input inputMode="decimal" value={limite} onChange={(e) => setLimite(e.target.value)} /></label>
      <label className="block space-y-1 text-sm">Dia de vencimento<SelectNative value={vencimento} onChange={(e) => setVencimento(e.target.value)}><option value="">Selecione o dia</option>{Array.from({ length: 31 }, (_, i) => <option key={i + 1} value={i + 1}>Dia {i + 1}</option>)}</SelectNative></label></>}
      <div className="flex justify-between gap-2"><Button type="button" variant="ghost" onClick={() => setConfirmando(true)}>Excluir {rotulo}</Button><Button disabled={ocupado}>{ocupado ? "Salvando…" : "Salvar"}</Button></div>
    </form>}
    {erro && <p role="alert" className="mt-3 text-sm text-negativo">{erro}</p>}
  </DialogBody></DialogContent></Dialog>
}
