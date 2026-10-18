"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Mail } from "lucide-react"

import { enviar } from "@/lib/cliente"
import estilos from "../login/login.module.css"

/** Pede o link de nova senha (item 1.9). Mesmo cartão do login: não é tela nova, é o passo que faltava. */
export default function EsqueciSenha() {
  const [email, setEmail] = useState("")
  const [mei, setMei] = useState(false)
  const [estado, setEstado] = useState<"pedindo" | "enviado" | "sem-email">("pedindo")
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  useEffect(() => { setMei(new URLSearchParams(window.location.search).has("mei")) }, [])
  const voltar = mei ? "/login/mei" : "/login"

  async function pedir(evento: React.FormEvent) {
    evento.preventDefault()
    setOcupado(true); setErro(null)
    try {
      const resposta = await enviar<{ emailDisponivel: boolean }>("/api/auth/senha/esqueci", { email })
      setEstado(resposta.emailDisponivel ? "enviado" : "sem-email")
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não consegui pedir o link.")
    } finally {
      setOcupado(false)
    }
  }

  return (
    <main className={estilos.pagina}>
      <div className={estilos.conteudo}>
        <section className={estilos.cartao} aria-labelledby="titulo-esqueci">
          <header className={estilos.cabecalho}>
            <h1 id="titulo-esqueci">Esqueci a senha</h1>
            <p>{estado === "pedindo" ? "Digite o seu e-mail. Mandamos um link para criar uma senha nova." : ""}</p>
          </header>
          {estado === "pedindo" && (
            <form onSubmit={pedir} className={estilos.formulario}>
              <label htmlFor="email-esqueci">E-mail</label>
              <div className={estilos.campo}><Mail size={17} aria-hidden="true" /><input id="email-esqueci" type="email" value={email} onChange={(evento) => setEmail(evento.target.value)} placeholder="seu@email.com" autoComplete="email" required /></div>
              {/* O login separa o campo do botão com a linha de opções; aqui não há linha, então a margem vem daqui. */}
              <div style={{ marginTop: 18 }}>
                {erro && <p className={estilos.erro} role="alert">{erro}</p>}
                <button type="submit" disabled={ocupado} className={estilos.primario}>{ocupado ? "Enviando…" : "Mandar o link"}</button>
              </div>
            </form>
          )}
          {estado === "enviado" && (
            <p role="status" className={estilos.formulario}>
              Se houver uma conta com <b>{email}</b>, o link já está na sua caixa de entrada. Ele vale por 30 minutos e funciona uma vez só. Não chegou? Olhe o lixo eletrônico.
            </p>
          )}
          {estado === "sem-email" && (
            <p role="alert" className={estilos.formulario}>
              {/* Num span: o `.formulario` é flex em coluna e quebraria o link e o ponto em linhas soltas. */}
              <span>O envio de e-mail do Tino ainda não está ligado, então o link não sai daqui. Para trocar a senha agora, escreva para <a href="mailto:davi23mfgp@gmail.com?subject=Recuperar%20acesso%20ao%20Tino" className={estilos.link}>davi23mfgp@gmail.com</a>.</span>
            </p>
          )}
          <p className={estilos.cadastro}><Link href={voltar}>Voltar ao login</Link></p>
        </section>
      </div>
    </main>
  )
}
