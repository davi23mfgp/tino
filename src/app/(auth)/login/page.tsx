"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { enviar } from "@/lib/cliente"

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [senha, setSenha] = useState("")
  const [erro, setErro] = useState<string | null>(null)
  const [entrando, setEntrando] = useState(false)

  async function entrar(evento: React.FormEvent) {
    evento.preventDefault()
    setEntrando(true)
    setErro(null)

    try {
      await enviar("/api/auth/login", { email, senha })
      router.push("/painel")
      router.refresh()
    } catch (excecao) {
      setErro(excecao instanceof Error ? excecao.message : "Não consegui entrar.")
      setEntrando(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-fg">Tino</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Seu dinheiro te esperando para uma conversa.</h1>
        <p className="mt-2 text-sm text-muted-fg">Entre para ver onde você está e o que fazer agora.</p>

        <form onSubmit={entrar} className="mt-8 space-y-3">
          <input
            type="email"
            value={email}
            onChange={(evento) => setEmail(evento.target.value)}
            placeholder="seu@email.com"
            autoComplete="email"
            required
            className="w-full rounded-[var(--raio-campo)] border border-pauta bg-background px-4 py-3 text-sm outline-none focus:border-acao/50"
          />
          <input
            type="password"
            value={senha}
            onChange={(evento) => setSenha(evento.target.value)}
            placeholder="sua senha"
            autoComplete="current-password"
            required
            className="w-full rounded-[var(--raio-campo)] border border-pauta bg-background px-4 py-3 text-sm outline-none focus:border-acao/50"
          />

          {erro && <p className="text-sm text-negativo">{erro}</p>}

          <button
            type="submit"
            disabled={entrando}
            className="w-full rounded-[var(--raio-pilula)] bg-primary py-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {entrando ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-fg">
          Ainda não tem conta?{" "}
          <Link href="/cadastro" className="text-acao hover:underline">
            Criar agora
          </Link>
        </p>
      </div>
    </main>
  )
}
