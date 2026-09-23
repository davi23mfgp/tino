"use client"

import Link from "next/link"
import { ArrowRight, Eye, EyeOff } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { enviar } from "@/lib/cliente"
import estilos from "./login.module.css"

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [senha, setSenha] = useState("")
  const [erro, setErro] = useState<string | null>(null)
  const [entrando, setEntrando] = useState(false)
  const [mostrarSenha, setMostrarSenha] = useState(false)

  async function entrar(evento: React.FormEvent) {
    evento.preventDefault()
    setEntrando(true)
    setErro(null)
    try {
      await enviar("/api/auth/login", { email, senha })
      router.push("/painel")
      router.refresh()
    } catch (excecao) {
      setErro(excecao instanceof Error ? excecao.message : "Não foi possível entrar. Tente novamente.")
      setEntrando(false)
    }
  }

  return <main className={estilos.pagina}>
    <div className={estilos.conteudo}>
      <section className={estilos.acesso} aria-labelledby="titulo-login">
        <Link href="/" className={estilos.marca} aria-label="Tino — página inicial"><img src="/mascote/tino-leao-marca.png" alt="" width={38} height={38} /><span>tino.</span></Link>
        <div className={estilos.formulario}>
          <p className={estilos.sobretitulo}>Seu espaço financeiro</p>
          <h1 id="titulo-login">Bom ter você de volta.</h1>
          <p className={estilos.introducao}>Entre para acompanhar seu dinheiro e o próximo passo.</p>
          <form onSubmit={entrar}>
            <label htmlFor="email-login">E-mail</label>
            <input id="email-login" type="email" value={email} onChange={(evento) => setEmail(evento.target.value)} placeholder="voce@exemplo.com" autoComplete="email" required />
            <label htmlFor="senha-login">Senha</label>
            <div className={estilos.campoSenha}>
              <input id="senha-login" type={mostrarSenha ? "text" : "password"} value={senha} onChange={(evento) => setSenha(evento.target.value)} placeholder="Sua senha" autoComplete="current-password" required />
              <button type="button" onClick={() => setMostrarSenha((atual) => !atual)} aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"} aria-pressed={mostrarSenha}>{mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </div>
            {erro && <p className={estilos.erro} role="alert">{erro}</p>}
            <button type="submit" disabled={entrando} className={estilos.entrar}>{entrando ? "Entrando…" : "Entrar no Tino"}{!entrando && <ArrowRight size={18} aria-hidden />}</button>
          </form>
          <p className={estilos.cadastro}>Ainda não tem conta? <Link href="/cadastro">Criar minha conta <ArrowRight size={15} aria-hidden /></Link></p>
        </div>
        <p className={estilos.rodape}>Clareza para cuidar do que é seu.</p>
      </section>
      <aside className={estilos.vitrine} aria-label="Prévia do aplicativo Tino">
        <div className={estilos.vitrineTexto}><span>O TINO NO SEU DIA A DIA</span><h2>Seu dinheiro,<br />em perspectiva.</h2><p>Saldo, cartões e próximos passos no mesmo lugar.</p></div>
        <div className={estilos.tela}><div className={estilos.telaTopo}><i /><i /><i /><span>Prévia real do aplicativo</span></div><img src="/demonstracao/inicio-desktop.png" alt="Prévia real do painel Tino com saldo, cartões e compras a conferir" width={1265} height={712} /></div>
        <p className={estilos.legenda}>Dados de demonstração</p>
      </aside>
    </div>
  </main>
}
