"use client"

import { useCallback, useEffect, useState } from "react"
import { usePathname } from "next/navigation"

import { buscar, enviar } from "@/lib/cliente"
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


/**
 * Moldura opcional.
 *
 * Dentro de Configuracoes este bloco vive DENTRO de uma linha de ajuste, que
 * ja e um cartao -- cartao dentro de cartao desenha duas bordas e dois
 * recheios, que e parte do peso visual que Davi rejeitou. Com `semMoldura`
 * o conteudo entra solto e herda o espacamento de quem o abriu.
 */
function Moldura({ titulo, semMoldura, children }: { titulo: string; semMoldura?: boolean; children: React.ReactNode }) {
  if (semMoldura) return <>{children}</>
  return <Cartao titulo={titulo} estatico>{children}</Cartao>
}

interface MeuChamado {
  id: string
  tipo: (typeof TIPOS)[number]["valor"]
  status: "ABERTO" | "RESOLVIDO"
  mensagem: string
  resposta: string | null
  criadoEm: string
}

export function RelatarProblema({ semMoldura }: { semMoldura?: boolean } = {}) {
  const rota = usePathname()
  const [tipo, setTipo] = useState<(typeof TIPOS)[number]["valor"]>("BUG")
  const [mensagem, setMensagem] = useState("")
  const [enviando, setEnviando] = useState(false)
  const [retorno, setRetorno] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  // Os chamados que a pessoa já abriu, com a resposta do suporte. Antes a
  // resposta ficava só no painel do admin: quem perguntava nunca a via.
  const [meus, setMeus] = useState<MeuChamado[]>([])
  const carregarMeus = useCallback(async () => {
    try {
      setMeus(await buscar<MeuChamado[]>("/api/suporte"))
    } catch {
      // A lista é complemento: sem ela, o formulário continua funcionando.
    }
  }, [])
  useEffect(() => {
    void carregarMeus()
  }, [carregarMeus])

  async function mandar(evento: React.FormEvent) {
    evento.preventDefault()
    setEnviando(true)
    setErro(null)
    try {
      await enviar("/api/suporte", { tipo, mensagem, rota })
      setMensagem("")
      setRetorno("Recebido. O chamado ficou registrado com a sua conta e a tela em que você estava. A resposta aparece aqui embaixo e nos avisos do app.")
      void carregarMeus()
    } catch (excecao) {
      setErro(excecao instanceof Error ? excecao.message : "Não consegui enviar agora.")
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Moldura titulo="Falar com o suporte" semMoldura={semMoldura}>
      <form onSubmit={mandar} className="space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {TIPOS.map((opcao) => (
            <button
              key={opcao.valor}
              type="button"
              onClick={() => setTipo(opcao.valor)}
              className={`rounded-full border px-3.5 py-1.5 text-[calc(12px*var(--escala-letra))] ${tipo === opcao.valor ? "border-acao/40 bg-acao/10 text-acao" : "border-pauta text-muted-fg"}`}
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
          className="rounded-full bg-primary px-5 py-2.5 text-[calc(13px*var(--escala-letra))] font-medium text-primary-foreground disabled:opacity-50"
        >
          {enviando ? "Enviando…" : "Enviar"}
        </button>
      </form>

      {retorno && <p className="mt-3 text-[calc(13px*var(--escala-letra))] text-positivo">{retorno}</p>}
      {erro && <p className="mt-3 text-[calc(13px*var(--escala-letra))] text-negativo">{erro}</p>}

      {meus.length > 0 && (
        <div id="meus-chamados" className="mt-4 grid gap-2 border-t border-pauta pt-4">
          <p className="text-[calc(13px*var(--escala-letra))] font-medium">Seus chamados</p>
          {meus.slice(0, 5).map((chamado) => (
            <div key={chamado.id} className="grid gap-1.5 rounded-2xl border border-pauta p-3 text-[calc(13px*var(--escala-letra))]">
              <p className="flex justify-between gap-3 text-[calc(12px*var(--escala-letra))] text-muted-fg">
                <span>
                  {TIPOS.find((opcao) => opcao.valor === chamado.tipo)?.rotulo ?? "Dúvida"} ·{" "}
                  {new Date(chamado.criadoEm).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                </span>
                <span className={chamado.resposta ? "text-positivo" : undefined}>
                  {chamado.resposta ? "respondido" : chamado.status === "RESOLVIDO" ? "resolvido" : "aguardando resposta"}
                </span>
              </p>
              <p className="line-clamp-2 text-muted-fg">{chamado.mensagem}</p>
              {chamado.resposta && <p className="whitespace-pre-wrap rounded-xl bg-papel-2 p-2.5 leading-relaxed">{chamado.resposta}</p>}
            </div>
          ))}
        </div>
      )}
    </Moldura>
  )
}
