"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

/**
 * Levar embora e apagar.
 *
 * Os dois direitos que a LGPD dá ao titular e que nenhum app entrega por
 * educação: acesso/portabilidade (art. 18, II e V) e eliminação (VI).
 *
 * Apagar exige senha e a palavra escrita. A sessão prova que o navegador está
 * logado, não que quem está na frente dele é o dono — e um celular destravado
 * em cima da mesa não pode apagar a vida financeira de alguém com dois toques.
 * A palavra existe pelo mesmo motivo que existe em repositório de código: é a
 * única confirmação que não se acerta sem querer.
 */
export function MeusDados() {
  const router = useRouter()
  const [abrindo, setAbrindo] = useState(false)
  const [senha, setSenha] = useState("")
  const [confirmacao, setConfirmacao] = useState("")
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  async function apagar() {
    setOcupado(true)
    setErro(null)
    try {
      const resposta = await fetch("/api/usuario/excluir", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ senha, confirmacao }),
      })
      const dados = await resposta.json()
      if (!resposta.ok) throw new Error(dados.erro ?? "Não consegui apagar agora.")
      router.push("/")
      router.refresh()
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não consegui apagar agora.")
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[calc(13px*var(--escala-letra))] leading-relaxed text-[color:var(--texto-2)]">
          Baixe tudo o que o Tino guarda sobre você, em um arquivo que serve para importar em outro lugar. Não inclui
          senha nem chaves de acesso — credencial não é dado seu, é chave de casa.
        </p>
        <a
          href="/api/usuario/dados"
          className="mt-3 inline-flex min-h-11 items-center rounded-[var(--raio-pilula)] border border-pauta px-4 text-[calc(13px*var(--escala-letra))] font-medium"
        >
          Baixar meus dados
        </a>
      </div>

      <div className="border-t border-pauta pt-4">
        <p className="text-[calc(13px*var(--escala-letra))] leading-relaxed text-[color:var(--texto-2)]">
          Apagar a conta tira do banco seus lançamentos, contas, cartões, dívidas, metas e conversas. Não tem desfazer.
          Cobranças já emitidas ficam com o gateway de pagamento, que tem obrigação fiscal própria.
        </p>

        {!abrindo ? (
          <button
            type="button"
            onClick={() => setAbrindo(true)}
            className="mt-3 min-h-11 rounded-[var(--raio-pilula)] border border-negativo/40 px-4 text-[calc(13px*var(--escala-letra))] font-medium text-negativo"
          >
            Apagar minha conta
          </button>
        ) : (
          <div className="mt-3 space-y-3 rounded-[var(--raio-campo)] border border-negativo/40 bg-negativo/[0.06] p-3.5">
            <label className="block space-y-1.5">
              <span className="text-[calc(12px*var(--escala-letra))] text-[color:var(--texto-2)]">Sua senha</span>
              <input
                type="password"
                value={senha}
                onChange={(evento) => setSenha(evento.target.value)}
                autoComplete="current-password"
                className="min-h-11 w-full rounded-[var(--raio-campo)] border border-pauta bg-background px-3 text-[calc(14px*var(--escala-letra))]"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-[calc(12px*var(--escala-letra))] text-[color:var(--texto-2)]">
                Escreva <b>APAGAR</b> para confirmar
              </span>
              <input
                value={confirmacao}
                onChange={(evento) => setConfirmacao(evento.target.value)}
                className="min-h-11 w-full rounded-[var(--raio-campo)] border border-pauta bg-background px-3 text-[calc(14px*var(--escala-letra))]"
              />
            </label>

            {erro && <p className="text-[calc(13px*var(--escala-letra))] text-negativo">{erro}</p>}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void apagar()}
                disabled={ocupado || confirmacao.trim().toUpperCase() !== "APAGAR" || !senha}
                className="min-h-11 rounded-[var(--raio-pilula)] bg-negativo px-4 text-[calc(13px*var(--escala-letra))] font-semibold text-background disabled:opacity-40"
              >
                {ocupado ? "apagando…" : "Apagar para sempre"}
              </button>
              <button
                type="button"
                onClick={() => setAbrindo(false)}
                className="min-h-11 rounded-[var(--raio-pilula)] border border-pauta px-4 text-[calc(13px*var(--escala-letra))]"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      <p className="border-t border-pauta pt-4 text-[calc(12px*var(--escala-letra))] text-[color:var(--texto-3)]">
        O que o Tino guarda e com quem compartilha está na{" "}
        <Link href="/privacidade" className="text-acao underline-offset-4 hover:underline">
          política de privacidade
        </Link>
        .
      </p>
    </div>
  )
}
