"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"

import { enviar } from "@/lib/cliente"
import { Cartao } from "@/components/ui/painel"

/**
 * Canal de suporte de dentro do app.
 *
 * A tela de origem vai junto automaticamente. Pedir para a pessoa descrever
 * onde estava é pedir a informação que ela menos consegue dar — e sem ela quem
 * lê o chamado passa a primeira meia hora adivinhando qual página quebrou.
 */

const TIPOS = [
  { valor: "BUG", rotulo: "Algo quebrou" },
  { valor: "DUVIDA", rotulo: "Tenho uma dúvida" },
  { valor: "COBRANCA", rotulo: "É sobre cobrança" },
] as const

export function RelatarProblema() {
  const rota = usePathname()
  const [tipo, setTipo] = useState<(typeof TIPOS)[number]["valor"]>("BUG")
  const [mensagem, setMensagem] = useState("")
  const [enviando, setEnviando] = useState(false)
  const [retorno, setRetorno] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  async function mandar(evento: React.FormEvent) {
    evento.preventDefault()
    setEnviando(true)
    setErro(null)
    try {
      await enviar("/api/suporte", { tipo, mensagem, rota })
      setMensagem("")
      setRetorno("Recebido. O chamado ficou registrado com a sua conta e a tela em que você estava.")
    } catch (excecao) {
      setErro(excecao instanceof Error ? excecao.message : "Não consegui enviar agora.")
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Cartao titulo="Falar com o suporte">
      <form onSubmit={mandar} className="space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {TIPOS.map((opcao) => (
            <button
              key={opcao.valor}
              type="button"
              onClick={() => setTipo(opcao.valor)}
              className={`rounded-full border px-3.5 py-1.5 text-[12px] ${tipo === opcao.valor ? "border-acao/40 bg-acao/10 text-acao" : "border-pauta text-muted-fg"}`}
            >
              {opcao.rotulo}
            </button>
          ))}
        </div>

        <textarea
          value={mensagem}
          onChange={(evento) => setMensagem(evento.target.value)}
          required
          minLength={5}
          rows={4}
          placeholder={
            tipo === "BUG"
              ? "O que você fez, o que esperava e o que apareceu."
              : "Escreva do jeito que você contaria para alguém."
          }
          className="w-full rounded-[var(--raio-campo)] border border-pauta bg-background px-4 py-2.5 text-sm"
        />

        <button
          disabled={enviando}
          className="rounded-full bg-primary px-5 py-2.5 text-[13px] font-medium text-primary-foreground disabled:opacity-50"
        >
          {enviando ? "Enviando…" : "Enviar"}
        </button>
      </form>

      {retorno && <p className="mt-3 text-[13px] text-positivo">{retorno}</p>}
      {erro && <p className="mt-3 text-[13px] text-negativo">{erro}</p>}
    </Cartao>
  )
}
