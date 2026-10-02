"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { buscar, enviar } from "@/lib/cliente"
import { TrilhaLoja } from "@/components/trilha-loja"
import estilos from "./dados.module.css"

interface Cadastro { loja: { nome: string; cnpj: string | null; inscricaoEstadual: string | null; inscricaoEstadualIsenta: boolean; telefoneContato: string | null }; perfil: { cnpj: string | null; razaoSocial: string | null; atividade: string; dadosConfirmadosEm: string | null } }
const ATIVIDADES = [
  { valor: "COMERCIO", rotulo: "Comércio" },
  { valor: "SERVICOS", rotulo: "Serviços" },
  { valor: "COMERCIO_E_SERVICOS", rotulo: "Comércio e serviços" },
  { valor: "INDUSTRIA", rotulo: "Indústria" },
  { valor: "TRANSPORTE_CARGA", rotulo: "Transporte de carga" },
]
const inicial = { nome: "", razaoSocial: "", cnpj: "", telefoneContato: "", inscricaoEstadual: "", inscricaoEstadualIsenta: false, atividade: "COMERCIO" }
export default function DadosDaEmpresa() {
  const router = useRouter()
  const [form, setForm] = useState(inicial)
  const [carregando, setCarregando] = useState(true)
  const [confirmado, setConfirmado] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const carregar = useCallback(async () => {
    try {
      const dados = await buscar<Cadastro>("/api/loja/cadastro")
      setForm({ nome: dados.loja.nome, razaoSocial: dados.perfil.razaoSocial ?? "", cnpj: dados.perfil.cnpj ?? dados.loja.cnpj ?? "", telefoneContato: dados.loja.telefoneContato ?? "", inscricaoEstadual: dados.loja.inscricaoEstadual ?? "", inscricaoEstadualIsenta: dados.loja.inscricaoEstadualIsenta, atividade: dados.perfil.atividade })
      setConfirmado(dados.perfil.dadosConfirmadosEm)
    } catch (falha) { setErro(falha instanceof Error ? falha.message : "Não consegui carregar os dados da empresa.") }
    finally { setCarregando(false) }
  }, [])
  useEffect(() => { void carregar() }, [carregar])
  async function salvar(evento: React.FormEvent) {
    evento.preventDefault(); setSalvando(true); setErro(null)
    try { await enviar("/api/loja/cadastro", form, "PUT"); router.push("/loja/painel"); router.refresh() }
    catch (falha) { setErro(falha instanceof Error ? falha.message : "Não consegui confirmar os dados.") }
    finally { setSalvando(false) }
  }
  return <div className={estilos.pagina}><TrilhaLoja pagina="Dados da empresa" /><header><h2>Dados da empresa</h2><p>Confira as informações do seu MEI. Elas também ajudam a preparar a emissão de nota.</p>{confirmado && <small>Última confirmação: {new Date(confirmado).toLocaleDateString("pt-BR")}</small>}</header>
    {carregando ? <p>Carregando…</p> : <form className={estilos.form} onSubmit={salvar}>
      <div className={estilos.dois}><label>Nome do negócio<input required maxLength={100} value={form.nome} onChange={(e)=>setForm({...form,nome:e.target.value})} /></label><label>Razão social<input required maxLength={160} value={form.razaoSocial} onChange={(e)=>setForm({...form,razaoSocial:e.target.value})} /></label></div>
      <div className={estilos.dois}><label>CNPJ<input required inputMode="numeric" placeholder="00.000.000/0000-00" value={form.cnpj} onChange={(e)=>setForm({...form,cnpj:e.target.value})} /></label><label>Telefone ou WhatsApp do negócio<input required inputMode="tel" placeholder="(00) 00000-0000" value={form.telefoneContato} onChange={(e)=>setForm({...form,telefoneContato:e.target.value})} /></label></div>
      <div className={estilos.dois}><label>Atividade do MEI<select value={form.atividade} onChange={(e)=>setForm({...form,atividade:e.target.value})}>{ATIVIDADES.map((item)=><option key={item.valor} value={item.valor}>{item.rotulo}</option>)}</select></label><label>Regime tributário<input value="Simples Nacional · MEI" readOnly aria-label="Regime tributário" /></label></div>
      <div className={estilos.inscricao}><label>Inscrição estadual<input disabled={form.inscricaoEstadualIsenta} required={!form.inscricaoEstadualIsenta} maxLength={20} value={form.inscricaoEstadual} onChange={(e)=>setForm({...form,inscricaoEstadual:e.target.value})} /></label><label className={estilos.check}><input type="checkbox" checked={form.inscricaoEstadualIsenta} onChange={(e)=>setForm({...form,inscricaoEstadualIsenta:e.target.checked})} /> Isento</label></div>
      {form.inscricaoEstadualIsenta && <p className={estilos.nota}>A emissão de NFC-e no Tino ainda exige inscrição estadual. Marcar isento não garante que a nota possa ser emitida.</p>}
      {erro && <p role="alert" className={estilos.erro}>{erro}</p>}
      <div className={estilos.acoes}><Link href="/loja/painel">Confirmar mais tarde</Link><button type="submit" disabled={salvando}>{salvando ? "Salvando…" : "Confirmar dados"}</button></div>
    </form>}
  </div>
}
