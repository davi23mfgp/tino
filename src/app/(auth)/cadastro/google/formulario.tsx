"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { TinoMarca } from "@/components/tino-mascote"
import { enviar } from "@/lib/cliente"

type TipoLar = "SOLO" | "CASAL" | "FAMILIA"

export default function FormularioCadastroGoogle({ email, nomeInicial, modoMei = false }: { email: string; nomeInicial: string; modoMei?: boolean }) {
  const router = useRouter()
  const [nome, setNome] = useState(nomeInicial)
  const [tipoLar, setTipoLar] = useState<TipoLar>("SOLO")
  const [aceite, setAceite] = useState(false)
  const [criando, setCriando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function criar(evento: React.FormEvent) {
    evento.preventDefault()
    setCriando(true)
    setErro(null)
    try {
      await enviar("/api/auth/google/cadastro", { nome, tipoLar: modoMei ? "SOLO" : tipoLar, modoMei, aceiteTermos: aceite })
      router.push(modoMei ? "/loja/comecar?inicio=1" : "/painel")
      router.refresh()
    } catch (excecao) {
      setErro(excecao instanceof Error ? excecao.message : "Não consegui criar a conta.")
      setCriando(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-[28px] border border-white/15 bg-[#151b17]/90 p-6 text-white shadow-2xl backdrop-blur-xl sm:p-8">
        <TinoMarca className="size-12" />
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">{modoMei ? "Criar conta MEI com Google" : "Criar conta com Google"}</h1>
        <p className="mt-2 text-sm text-white/65">Confirme seus dados para começar seus 14 dias grátis.</p>
        <form onSubmit={criar} className="mt-7 space-y-5">
          <div>
            <label htmlFor="google-nome" className="mb-2 block text-sm text-white/75">Seu nome</label>
            <input id="google-nome" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={80} required autoComplete="name" className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 outline-none focus:border-[#35ef5b]" />
          </div>
          <div>
            <label htmlFor="google-email" className="mb-2 block text-sm text-white/75">E-mail verificado pelo Google</label>
            <input id="google-email" value={email} readOnly className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white/70" />
          </div>
          {!modoMei && <fieldset>
            <legend className="mb-2 text-sm text-white/75">Em casa, o dinheiro é de</legend>
            <div className="grid grid-cols-3 gap-2">
              {([ ["SOLO", "Só eu"], ["CASAL", "Casal"], ["FAMILIA", "Família"] ] as const).map(([valor, rotulo]) => <button key={valor} type="button" aria-pressed={tipoLar === valor} onClick={() => setTipoLar(valor)} className={`rounded-xl border p-3 text-sm transition ${tipoLar === valor ? "border-[#35ef5b] bg-[#35ef5b]/10" : "border-white/20 hover:border-white/40"}`}>{rotulo}</button>)}
            </div>
          </fieldset>}
          <label className="flex items-start gap-3 text-sm leading-relaxed text-white/75">
            <input type="checkbox" checked={aceite} onChange={(e) => setAceite(e.target.checked)} required className="mt-1 size-4 accent-[#35ef5b]" />
            <span>Li e aceito os <Link href="/termos" target="_blank" className="text-[#35ef5b] underline">Termos de Uso</Link> e a <Link href="/privacidade" target="_blank" className="text-[#35ef5b] underline">Política de Privacidade</Link>.</span>
          </label>
          {erro && <p role="alert" className="text-sm text-red-300">{erro}</p>}
          <button type="submit" disabled={criando || !aceite} className="w-full rounded-full bg-[#35ef5b] py-3 font-semibold text-black transition hover:bg-[#68fa83] disabled:opacity-50">{criando ? "Criando conta…" : "Criar conta com Google"}</button>
        </form>
        <p className="mt-5 text-center text-sm text-white/60">Já tem conta? <Link href={modoMei ? "/login/mei" : "/login"} className="text-[#35ef5b] hover:underline">Entrar</Link></p>
      </div>
    </main>
  )
}
