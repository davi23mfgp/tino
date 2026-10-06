"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import { Check, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react"

import { SEM_MEI } from "@/lib/acesso"
import { enviar } from "@/lib/cliente"
import estilos from "./login.module.css"

const mensagensGoogle: Record<string, string> = {
  "google-indisponivel": "O acesso com Google ainda não foi configurado.",
  "google-cancelado": "A entrada com Google foi cancelada.",
  "google-expirado": "A tentativa expirou. Tente entrar com Google novamente.",
  "google-falhou": "Não foi possível confirmar sua conta Google. Tente novamente.",
  "google-sem-conta": "Esse e-mail ainda não tem conta no Tino. Crie sua conta primeiro.",
  "sem-mei": SEM_MEI,
  "google-vinculo": "Para proteger sua conta, entre com sua senha antes de vincular este e-mail Google.",
}

export default function FormularioLogin({ googleDisponivel, modoMei = false, modoAdmin = false }: { googleDisponivel: boolean; modoMei?: boolean; modoAdmin?: boolean }) {
  const router = useRouter()
  const parametros = useSearchParams()
  const [email, setEmail] = useState("")
  const [senha, setSenha] = useState("")
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [manterConectado, setManterConectado] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [entrando, setEntrando] = useState(false)
  const erroGoogle = parametros.get("erro")

  async function entrar(evento: React.FormEvent) {
    evento.preventDefault()
    setEntrando(true)
    setErro(null)
    try {
      if (modoAdmin) {
        // A entrada do admin não mantém conectado: o painel vê a conta de todo mundo.
        const resposta = await enviar<{ precisaMfa?: boolean }>("/api/auth/login", { email, senha, manterConectado: false, porta: "admin" })
        router.push(resposta.precisaMfa ? "/acesso-admin/mfa" : "/admin")
        router.refresh()
        return
      }
      const resposta = await enviar<{ precisaMfa?: boolean }>("/api/auth/login", { email, senha, manterConectado, produto: modoMei ? "mei" : "pessoal" })
      router.push(resposta.precisaMfa ? (modoMei ? "/login/mei/mfa" : "/login/mfa") : (modoMei ? "/loja" : "/painel"))
      router.refresh()
    } catch (excecao) {
      setErro(excecao instanceof Error ? excecao.message : "Não consegui entrar.")
      setEntrando(false)
    }
  }

  return (
    <main className={estilos.pagina}>
      <div className={estilos.leaoFundo} aria-hidden="true" />
      <div className={estilos.conteudo}>
        <section className={estilos.cartao} aria-labelledby="titulo-login">
          <div className={estilos.marca}><img src="/mascote/leao-login.png" alt="" className={estilos.marcaIcone} /><span>tino<span className={estilos.ponto}>.</span></span></div>
          <header className={estilos.cabecalho}>
            <h1 id="titulo-login">{modoAdmin ? "Administração" : modoMei ? "Entrar no Tino MEI" : "Entrar"}</h1>
            <p>{modoAdmin ? "Entrada restrita, com senha e código." : modoMei ? "Seu negócio, em um só lugar." : "Seu dinheiro te espera."}</p>
          </header>

          <form onSubmit={entrar} className={estilos.formulario}>
            <label htmlFor="email-login">E-mail</label>
            <div className={estilos.campo}><Mail size={17} aria-hidden="true" /><input id="email-login" type="email" value={email} onChange={(evento) => setEmail(evento.target.value)} placeholder="seu@email.com" autoComplete="email" required /></div>
            <label htmlFor="senha-login">Senha</label>
            <div className={estilos.campo}><LockKeyhole size={17} aria-hidden="true" /><input id="senha-login" type={mostrarSenha ? "text" : "password"} value={senha} onChange={(evento) => setSenha(evento.target.value)} placeholder="Sua senha" autoComplete="current-password" required /><button type="button" className={estilos.mostrar} onClick={() => setMostrarSenha(!mostrarSenha)} aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}>{mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>

            {!modoAdmin && <div className={estilos.opcoes}>
              <label className={estilos.lembrar}><input type="checkbox" checked={manterConectado} onChange={(evento) => setManterConectado(evento.target.checked)} /><span className={estilos.caixa}><Check size={13} strokeWidth={3} /></span>Manter conectado</label>
              <Link href={modoMei ? "/esqueci-senha?mei=1" : "/esqueci-senha"} className={estilos.link}>Esqueci a senha</Link>
            </div>}

            {(erro || (erroGoogle && mensagensGoogle[erroGoogle])) && <p className={estilos.erro} role="alert">{erro || mensagensGoogle[erroGoogle!]}</p>}
            <button type="submit" disabled={entrando} className={estilos.primario}>{entrando ? "Entrando…" : "Entrar"}</button>
          </form>

          {!modoAdmin && <>
          <div className={estilos.divisor}><span>ou</span></div>
          {googleDisponivel ? <a className={estilos.google} href={`/api/auth/google?produto=${modoMei ? "mei" : "pessoal"}&manter=${manterConectado ? "1" : "0"}`}><span className={estilos.googleIcone} aria-hidden="true">G</span>Continuar com Google</a> : <Link className={estilos.google} href={modoMei ? "/login/mei?erro=google-indisponivel" : "/login?erro=google-indisponivel"}><span className={estilos.googleIcone} aria-hidden="true">G</span>Continuar com Google</Link>}
          <p className={estilos.cadastro}>Ainda não tem conta? <Link href={modoMei ? "/cadastro/mei" : "/cadastro"}>Criar conta grátis por 14 dias</Link></p>
          </>}
        </section>
        <p className={estilos.rodape}><LockKeyhole size={12} aria-hidden="true" /> Conexão segura · seus dados seguem a <Link href="/privacidade">LGPD</Link></p>
      </div>
    </main>
  )
}
