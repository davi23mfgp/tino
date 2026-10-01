"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { enviar } from "@/lib/cliente"
import { cn } from "@/lib/utils"

// Cadastro pessoal direto: a entrada MEI será separada na mesma landing.

const TIPOS = [
  { valor: "SOLO", rotulo: "Só eu", texto: "Uma pessoa, um orçamento." },
  { valor: "CASAL", rotulo: "Casal", texto: "Contas juntas e separadas." },
  { valor: "FAMILIA", rotulo: "Família", texto: "Com dependentes." },
] as const

const campo =
  "w-full rounded-[var(--raio-campo)] border border-pauta bg-background/60 backdrop-blur-vidro px-4 py-3 text-sm outline-none transition-colors focus:border-positivo/50 focus:bg-background"

export default function Cadastro() {
  const router = useRouter()
  const [nome, setNome] = useState("")
  const [email, setEmail] = useState("")
  const [senha, setSenha] = useState("")
  const [tipoLar, setTipoLar] = useState<"SOLO" | "CASAL" | "FAMILIA">("SOLO")
  const [aceite, setAceite] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [criando, setCriando] = useState(false)

  async function criar(evento: React.FormEvent) {
    evento.preventDefault()
    setCriando(true)
    setErro(null)

    try {
      await enviar("/api/auth/cadastro", { nome, email, senha, tipoLar, modoMei: false, aceiteTermos: aceite })
      router.push("/painel")
      router.refresh()
    } catch (excecao) {
      setErro(excecao instanceof Error ? excecao.message : "Não consegui criar a conta.")
      setCriando(false)
    }
  }

  // ── Passo 2: os dados ─────────────────────────────────
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="text-[calc(13px*var(--escala-letra))] text-muted-fg hover:text-foreground">Voltar</Link>
        <h1 className="font-display mt-4 text-3xl font-bold tracking-tight">Criar sua conta</h1>
        <p className="mt-1.5 text-[calc(13px*var(--escala-letra))] text-muted-fg">Contas, cartões, dívidas e metas em um lugar só.</p>

        <form onSubmit={criar} className="mt-7 space-y-3">
          <input
            value={nome}
            onChange={(evento) => setNome(evento.target.value)}
            placeholder="seu nome"
            required
            className={campo}
          />
          <input
            type="email"
            value={email}
            onChange={(evento) => setEmail(evento.target.value)}
            placeholder="seu@email.com"
            autoComplete="email"
            required
            className={campo}
          />
          <input
            type="password"
            value={senha}
            onChange={(evento) => setSenha(evento.target.value)}
            placeholder="senha (mínimo 8 caracteres)"
            autoComplete="new-password"
            minLength={8}
            required
            className={campo}
          />

          <div className="space-y-2 pt-2">
            <p className="text-xs uppercase tracking-widest text-muted-fg">Em casa, o dinheiro é de</p>
            {TIPOS.map((tipo) => (
              <button
                key={tipo.valor}
                type="button"
                onClick={() => setTipoLar(tipo.valor)}
                className={cn(
                  "w-full rounded-2xl border px-4 py-3 text-left text-sm transition",
                  tipoLar === tipo.valor ? "border-positivo/50 bg-positivo/10" : "border-pauta hover:border-border",
                )}
              >
                <span className="font-medium">{tipo.rotulo}</span>
                <span className="block text-[calc(12px*var(--escala-letra))] text-muted-fg">{tipo.texto}</span>
              </button>
            ))}
          </div>

          {/* Caixa desmarcada por padrão: aceite pré-marcado não é consentimento
              livre (LGPD, art. 8º) e não vale como prova. */}
          <label className="flex items-start gap-3 pt-2 text-sm text-muted-fg">
            <input
              type="checkbox"
              checked={aceite}
              onChange={(evento) => setAceite(evento.target.checked)}
              required
              className="mt-0.5 size-4 shrink-0 accent-[var(--positivo)]"
            />
            <span>
              Li e aceito os{" "}
              <Link href="/termos" target="_blank" className="text-acao hover:underline">
                Termos de Uso
              </Link>{" "}
              e a{" "}
              <Link href="/privacidade" target="_blank" className="text-acao hover:underline">
                Política de Privacidade
              </Link>
              .
            </span>
          </label>

          {erro && <p className="text-sm text-negativo">{erro}</p>}

          <button
            type="submit"
            disabled={criando || !aceite}
            className="w-full rounded-[var(--raio-pilula)] bg-primary py-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {criando ? "Criando…" : "Criar conta"}
          </button>
        </form>

        <div className="mt-5 flex items-center gap-3 text-xs text-muted-fg"><span className="h-px flex-1 bg-pauta" />ou<span className="h-px flex-1 bg-pauta" /></div>
        <a href="/api/auth/google" className="mt-5 block w-full rounded-[var(--raio-pilula)] border border-pauta py-3 text-center text-sm font-medium transition hover:border-positivo/50">
          Cadastrar com Google
        </a>

        <p className="mt-6 text-center text-sm text-muted-fg">
          Já tem conta?{" "}
          <Link href="/login" className="text-acao hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </main>
  )
}
