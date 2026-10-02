"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { ArrowLeft, UserRound, Users, Heart, Eye, EyeOff } from "lucide-react"
import { TinoMarca } from "@/components/tino-mascote"

import { enviar } from "@/lib/cliente"
import { cn } from "@/lib/utils"

// Cada landing fixa o produto; a pessoa não escolhe outra conta neste formulário.

const TIPOS = [
  { valor: "SOLO", rotulo: "Só eu", texto: "Uma pessoa, um orçamento." },
  { valor: "CASAL", rotulo: "Casal", texto: "Contas juntas e separadas." },
  { valor: "FAMILIA", rotulo: "Família", texto: "Com dependentes." },
] as const

const campo =
  "w-full rounded-[var(--raio-campo)] border border-pauta bg-background/60 backdrop-blur-vidro px-4 py-3 text-sm outline-none transition-colors focus:border-positivo/50 focus:bg-background"

export default function Cadastro({ modoMei = false }: { modoMei?: boolean }) {
  const router = useRouter()
  const [nome, setNome] = useState("")
  const [email, setEmail] = useState("")
  const [razaoSocial, setRazaoSocial] = useState("")
  const [cnpj, setCnpj] = useState("")
  const [telefoneContato, setTelefoneContato] = useState("")
  const [atividade, setAtividade] = useState("COMERCIO")
  const [senha, setSenha] = useState("")
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [tipoLar, setTipoLar] = useState<"SOLO" | "CASAL" | "FAMILIA">("SOLO")
  const [aceite, setAceite] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [criando, setCriando] = useState(false)

  async function criar(evento: React.FormEvent) {
    evento.preventDefault()
    setCriando(true)
    setErro(null)

    try {
      await enviar("/api/auth/cadastro", { nome, email, senha, tipoLar: modoMei ? "SOLO" : tipoLar, modoMei, aceiteTermos: aceite, ...(modoMei ? { razaoSocial, cnpj, telefoneContato, atividade } : {}) })
      router.push(modoMei ? "/loja" : "/painel")
      router.refresh()
    } catch (excecao) {
      setErro(excecao instanceof Error ? excecao.message : "Não consegui criar a conta.")
      setCriando(false)
    }
  }

  // ── Passo 2: os dados ─────────────────────────────────
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-[24px] border border-pauta bg-papel-1 p-6 shadow-xl sm:p-8">
        <Link href={modoMei ? "/para-mei" : "/"} className="text-[calc(13px*var(--escala-letra))] text-muted-fg hover:text-foreground inline-flex min-h-11 items-center gap-2"><ArrowLeft className="size-4" />Voltar</Link>
        <div className="mt-3 flex items-center gap-2"><TinoMarca className="size-8" /><span className="text-lg font-semibold">tino.</span></div>
        <h1 className="font-display mt-4 text-3xl font-bold tracking-tight">{modoMei ? "Criar conta MEI" : "Criar sua conta"}</h1>
        <p className="mt-1.5 text-[calc(13px*var(--escala-letra))] text-muted-fg">{modoMei ? "Vendas, estoque e caixa para o seu negócio." : "Contas, cartões, dívidas e metas em um lugar só."}</p>

        <form onSubmit={criar} className="mt-6 space-y-4">
          <label className="block space-y-2 text-sm"><span>Seu nome</span><input
            autoComplete="name"
            value={nome}
            onChange={(evento) => setNome(evento.target.value)}
            placeholder="seu nome"
            required
            className={campo}
          /></label>
          <label className="block space-y-2 text-sm"><span>E-mail</span><input
            type="email"
            value={email}
            onChange={(evento) => setEmail(evento.target.value)}
            placeholder="seu@email.com"
            autoComplete="email"
            required
            className={campo}
          /></label>
          <label className="block space-y-2 text-sm"><span>Senha</span><div className="relative"><input
            type={mostrarSenha ? "text" : "password"}
            value={senha}
            onChange={(evento) => setSenha(evento.target.value)}
            placeholder="senha (mínimo 8 caracteres)"
            autoComplete="new-password"
            minLength={8}
            required
            className={campo + " pr-12"}
          /><button type="button" onClick={() => setMostrarSenha(!mostrarSenha)} aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"} className="absolute right-1 top-1/2 grid size-11 -translate-y-1/2 place-items-center text-muted-fg">{mostrarSenha ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div><span className="block text-xs text-muted-fg">Use pelo menos 8 caracteres.</span></label>

          {modoMei && <div className="space-y-4 border-t border-pauta pt-4">
            <p className="text-xs uppercase tracking-widest text-muted-fg">Sobre o negócio</p>
            <label className="block space-y-2 text-sm"><span>Razão social</span><input required maxLength={160} value={razaoSocial} onChange={(evento)=>setRazaoSocial(evento.target.value)} className={campo} /></label>
            <label className="block space-y-2 text-sm"><span>CNPJ</span><input required inputMode="numeric" placeholder="00.000.000/0000-00" value={cnpj} onChange={(evento)=>setCnpj(evento.target.value)} className={campo} /></label>
            <label className="block space-y-2 text-sm"><span>Telefone ou WhatsApp</span><input required inputMode="tel" placeholder="(00) 00000-0000" value={telefoneContato} onChange={(evento)=>setTelefoneContato(evento.target.value)} className={campo} /></label>
            <label className="block space-y-2 text-sm"><span>Atividade do MEI</span><select value={atividade} onChange={(evento)=>setAtividade(evento.target.value)} className={campo}><option value="COMERCIO">Comércio</option><option value="SERVICOS">Serviços</option><option value="COMERCIO_E_SERVICOS">Comércio e serviços</option><option value="INDUSTRIA">Indústria</option><option value="TRANSPORTE_CARGA">Transporte de carga</option></select></label>
            <p className="text-xs text-muted-fg">Depois, confirme os dados fiscais na área da empresa. O cadastro não exige cartão.</p>
          </div>}

          {!modoMei && <div className="space-y-2 pt-2">
            <p className="text-xs uppercase tracking-widest text-muted-fg">Em casa, o dinheiro é de</p>
            <div className="grid grid-cols-3 gap-2">{TIPOS.map((tipo) => (
              <button
                key={tipo.valor}
                type="button"
                onClick={() => setTipoLar(tipo.valor)}
                aria-pressed={tipoLar === tipo.valor}
                className={cn(
                  "flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border px-2 py-3 text-center text-sm transition",
                  tipoLar === tipo.valor ? "border-positivo/50 bg-positivo/10" : "border-pauta hover:border-border",
                )}
              >
                {tipo.valor === "SOLO" ? <UserRound className="size-5" /> : tipo.valor === "CASAL" ? <Heart className="size-5" /> : <Users className="size-5" />}<span className="font-medium">{tipo.rotulo}</span>

              </button>
            ))}</div>
          </div>}

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
        <a href={modoMei ? "/api/auth/google?produto=mei" : "/api/auth/google"} className="mt-5 block w-full rounded-[var(--raio-pilula)] border border-pauta py-3 text-center text-sm font-medium transition hover:border-positivo/50">
          Cadastrar com Google
        </a>

        <p className="mt-6 text-center text-sm text-muted-fg">
          Já tem conta?{" "}
          <Link href={modoMei ? "/login/mei" : "/login"} className="text-acao hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </main>
  )
}
