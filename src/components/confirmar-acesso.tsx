"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { enviar } from "@/lib/cliente"
import estilos from "@/app/(auth)/login/login.module.css"

export default function ConfirmarMfa({ modoMei = false, modoAdmin = false }: { modoMei?: boolean; modoAdmin?: boolean }) {
  const [codigo, definirCodigo] = useState("")
  const [erro, definirErro] = useState("")
  const [ocupado, definirOcupado] = useState(false)
  const router = useRouter()
  async function confirmar(evento: React.FormEvent) {
    evento.preventDefault()
    definirOcupado(true); definirErro("")
    try { await enviar("/api/auth/mfa", { codigo }); router.push(modoAdmin ? "/admin" : modoMei ? "/loja" : "/painel"); router.refresh() }
    catch (falha) { definirErro(falha instanceof Error ? falha.message : "Não foi possível confirmar.") }
    finally { definirOcupado(false) }
  }
  return <main className={estilos.pagina}><div className={estilos.conteudo}><section className={estilos.cartao}>
    <header className={estilos.cabecalho}><h1>Confirme seu acesso</h1><p>Digite o código do seu autenticador ou um código de recuperação.</p></header>
    <form className={estilos.formulario} onSubmit={confirmar}>
      <label htmlFor="codigo-mfa">Código</label><div className={estilos.campo}><input id="codigo-mfa" autoComplete="one-time-code" autoFocus value={codigo} onChange={(evento) => definirCodigo(evento.target.value)} maxLength={32} required /></div>
      {erro && <p className={estilos.erro} role="alert">{erro}</p>}
      <button className={estilos.primario} disabled={ocupado}>{ocupado ? "Confirmando…" : "Confirmar"}</button>
    </form><p className={estilos.cadastro}><Link href={modoAdmin ? "/acesso-admin" : modoMei ? "/login/mei" : "/login"}>Voltar ao login</Link></p>
  </section></div></main>
}
