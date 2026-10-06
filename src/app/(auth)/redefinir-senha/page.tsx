"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Eye, EyeOff, LockKeyhole } from "lucide-react"

import { enviar } from "@/lib/cliente"
import estilos from "../login/login.module.css"

/** Cria a senha nova a partir do link do e-mail (item 1.9). */
export default function RedefinirSenha() {
  const [token, setToken] = useState<string | null>(null)
  const [senha, setSenha] = useState("")
  const [confirmacao, setConfirmacao] = useState("")
  const [mostrar, setMostrar] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [pronto, setPronto] = useState(false)
  useEffect(() => { setToken(new URLSearchParams(window.location.search).get("token")) }, [])

  async function salvar(evento: React.FormEvent) {
    evento.preventDefault()
    if (senha.length < 8) { setErro("Use pelo menos 8 caracteres."); return }
    if (senha !== confirmacao) { setErro("As duas senhas não são iguais."); return }
    setOcupado(true); setErro(null)
    try {
      await enviar("/api/auth/senha/redefinir", { token, senha })
      setPronto(true)
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não consegui trocar a senha.")
    } finally {
      setOcupado(false)
    }
  }

  return (
    <main className={estilos.pagina}>
      <div className={estilos.conteudo}>
        <section className={estilos.cartao} aria-labelledby="titulo-redefinir">
          <header className={estilos.cabecalho}>
            <h1 id="titulo-redefinir">{pronto ? "Senha trocada" : "Senha nova"}</h1>
            <p>{pronto ? "Entre com a senha nova. Os outros aparelhos conectados saíram da conta." : "Escolha a senha que vai usar daqui para a frente."}</p>
          </header>
          {!pronto && token !== null && (token ? (
            <form onSubmit={salvar} className={estilos.formulario}>
              <label htmlFor="senha-nova">Senha nova</label>
              <div className={estilos.campo}><LockKeyhole size={17} aria-hidden="true" /><input id="senha-nova" type={mostrar ? "text" : "password"} value={senha} onChange={(evento) => setSenha(evento.target.value)} placeholder="mínimo 8 caracteres" autoComplete="new-password" required /><button type="button" className={estilos.mostrar} onClick={() => setMostrar(!mostrar)} aria-label={mostrar ? "Ocultar senha" : "Mostrar senha"}>{mostrar ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
              <label htmlFor="senha-confirma">Repita a senha</label>
              <div className={estilos.campo}><LockKeyhole size={17} aria-hidden="true" /><input id="senha-confirma" type={mostrar ? "text" : "password"} value={confirmacao} onChange={(evento) => setConfirmacao(evento.target.value)} autoComplete="new-password" required /></div>
              {/* O login separa o campo do botão com a linha de opções; aqui não há linha, então a margem vem daqui. */}
              <div style={{ marginTop: 18 }}>
                {erro && <p className={estilos.erro} role="alert">{erro}</p>}
                <button type="submit" disabled={ocupado} className={estilos.primario}>{ocupado ? "Salvando…" : "Salvar a senha nova"}</button>
              </div>
            </form>
          ) : <p role="alert" className={estilos.erro}>Este link está incompleto. Abra o link do e-mail de novo ou peça outro.</p>)}
          <p className={estilos.cadastro}>{pronto ? <Link href="/login">Entrar</Link> : <Link href="/esqueci-senha">Pedir outro link</Link>}</p>
        </section>
      </div>
    </main>
  )
}
