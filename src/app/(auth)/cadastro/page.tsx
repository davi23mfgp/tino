"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { ArrowLeft, ShoppingBag, Wallet } from "lucide-react"

import { enviar } from "@/lib/cliente"
import { cn } from "@/lib/utils"
import { TinoMascote } from "@/components/tino-mascote"

/**
 * Criar conta, em dois passos.
 *
 * O primeiro decide o produto: as contas de casa, ou as contas de casa mais a
 * loja. A escolha muda o app inteiro — quem não é MEI nunca vê balcão,
 * prateleira nem limite de faturamento, e o menu encolhe um terço.
 *
 * Perguntar isso primeiro, e não como uma caixinha no fim do formulário, é o
 * que evita a pessoa criar a conta errada e descobrir depois de cadastrar tudo.
 */

const TIPOS = [
  { valor: "SOLO", rotulo: "Só eu", texto: "Uma pessoa, um orçamento." },
  { valor: "CASAL", rotulo: "Casal", texto: "Contas juntas e separadas." },
  { valor: "FAMILIA", rotulo: "Família", texto: "Com dependentes." },
] as const

const campo =
  "w-full rounded-[var(--raio-campo)] border border-pauta bg-background/60 backdrop-blur-vidro px-4 py-3 text-sm outline-none transition-colors focus:border-positivo/50 focus:bg-background"

export default function Cadastro() {
  const router = useRouter()
  const [modoMei, setModoMei] = useState<boolean | null>(null)
  const [nome, setNome] = useState("")
  const [email, setEmail] = useState("")
  const [senha, setSenha] = useState("")
  const [tipoLar, setTipoLar] = useState<"SOLO" | "CASAL" | "FAMILIA">("SOLO")
  const [erro, setErro] = useState<string | null>(null)
  const [criando, setCriando] = useState(false)

  async function criar(evento: React.FormEvent) {
    evento.preventDefault()
    setCriando(true)
    setErro(null)

    try {
      await enviar("/api/auth/cadastro", { nome, email, senha, tipoLar, modoMei: modoMei === true })
      router.push("/painel")
      router.refresh()
    } catch (excecao) {
      setErro(excecao instanceof Error ? excecao.message : "Não consegui criar a conta.")
      setCriando(false)
    }
  }

  // ── Passo 1: que Tino ─────────────────────────────────
  if (modoMei === null) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3">
            <TinoMascote estado="tranquilo" className="size-11" />
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-fg">Tino</p>
              <h1 className="font-display text-2xl font-bold tracking-tight">O que você quer organizar?</h1>
            </div>
          </div>

          <div className="mt-8 space-y-3">
            <button
              onClick={() => setModoMei(false)}
              className="ficha flex w-full items-start gap-4 p-5 text-left transition hover:border-positivo/50"
            >
              <Wallet className="mt-0.5 size-6 shrink-0 text-positivo" />
              <span>
                <span className="font-display block text-[16px] font-semibold">Meu dinheiro</span>
                <span className="mt-1 block text-[13px] leading-relaxed text-muted-fg">
                  Contas, cartões, dívidas e metas. Para quem quer saber onde o dinheiro está indo e o que fazer com o
                  que sobra.
                </span>
              </span>
            </button>

            <button
              onClick={() => setModoMei(true)}
              className="ficha flex w-full items-start gap-4 p-5 text-left transition hover:border-positivo/50"
            >
              <ShoppingBag className="mt-0.5 size-6 shrink-0 text-positivo" />
              <span>
                <span className="font-display block text-[16px] font-semibold">Meu dinheiro e minha loja</span>
                <span className="mt-1 block text-[13px] leading-relaxed text-muted-fg">
                  Tudo o que está acima, mais venda no balcão, estoque, limite do MEI e DAS — com o dinheiro do CNPJ
                  separado do seu.
                </span>
              </span>
            </button>
          </div>

          <p className="mt-6 text-center text-[13px] text-muted-fg">
            Dá para mudar depois, em Configurações.
            <br />
            Já tem conta?{" "}
            <Link href="/login" className="text-acao hover:underline">
              Entrar
            </Link>
          </p>
        </div>
      </main>
    )
  }

  // ── Passo 2: os dados ─────────────────────────────────
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <button
          onClick={() => setModoMei(null)}
          className="flex items-center gap-1.5 text-[13px] text-muted-fg hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> voltar
        </button>

        <h1 className="font-display mt-4 text-3xl font-bold tracking-tight">
          {modoMei ? "Sua conta e sua loja" : "Criar sua conta"}
        </h1>
        <p className="mt-1.5 text-[13px] text-muted-fg">
          {modoMei
            ? "Você vai ter o balcão, a prateleira e o acompanhamento do limite do MEI."
            : "Contas, cartões, dívidas e metas em um lugar só."}
        </p>

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
                <span className="block text-[12px] text-muted-fg">{tipo.texto}</span>
              </button>
            ))}
          </div>

          {erro && <p className="text-sm text-negativo">{erro}</p>}

          <button
            type="submit"
            disabled={criando}
            className="w-full rounded-[var(--raio-pilula)] bg-primary py-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {criando ? "Criando…" : "Criar conta"}
          </button>
        </form>

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
