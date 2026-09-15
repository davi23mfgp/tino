"use client"

import { useState } from "react"
import { Check, Copy, Plus, Smartphone } from "lucide-react"

/**
 * Ligar o aviso do banco.
 *
 * É o caminho mais perto do automático que existe sem Open Finance: o banco já
 * manda um aviso no celular a cada compra, um encaminhador repassa esse texto
 * para o Tino, e `src/lib/captura/notificacao.ts` tira dali valor, lugar,
 * final do cartão e parcela.
 *
 * O que faltava não era código, era a configuração chegar pronta. Antes a tela
 * explicava o que fazer e deixava a pessoa montar a URL, escolher entre
 * cabeçalho e query, e torcer. Agora ela entrega o endereço inteiro com a
 * chave dentro, um botão de copiar, e um envio de teste que prova o caminho
 * antes de qualquer configuração no celular.
 *
 * A chave vai na URL de propósito: vários encaminhadores sem código só sabem
 * montar endereço, e exigir cabeçalho excluiria justamente quem mais precisa
 * disto. Quem puder usar cabeçalho continua podendo — a API aceita os dois.
 */
export function LigarAvisoDoBanco({
  endereco,
  chaveNova,
  aoGerar,
}: {
  /** Origem pública do app, sem barra no fim. */
  endereco: string
  /** A chave recém-criada. Só existe no momento da criação — depois, nem o banco a devolve. */
  chaveNova: string | null
  aoGerar: () => void
}) {
  const [copiado, setCopiado] = useState(false)
  const [teste, setTeste] = useState<string | null>(null)
  const [testando, setTestando] = useState(false)

  const url = chaveNova ? `${endereco}/api/capturar?chave=${chaveNova}` : null

  async function copiar() {
    if (!url) return
    await navigator.clipboard.writeText(url)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2500)
  }

  async function mandarTeste() {
    if (!url) return
    setTestando(true)
    setTeste(null)
    try {
      // Um aviso de compra de verdade, do jeito que o banco escreve. Se o
      // leitor entender este, entende os outros.
      const resposta = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          titulo: "Nubank",
          texto: "Compra aprovada no crédito: R$ 34,90 em PADARIA SAO JOSE - cartão final 4416",
        }),
      })
      setTeste(
        resposta.ok
          ? "Deu certo. O aviso de teste está na fila de conferência acima — confira e apague, se quiser."
          : "O envio não passou. A chave pode ter sido revogada; gere outra.",
      )
    } catch {
      setTeste("Não consegui falar com o servidor agora.")
    } finally {
      setTestando(false)
    }
  }

  return (
    <div className="rounded-[var(--raio-cartao)] border border-pauta p-4">
      <p className="flex items-center gap-2 text-[calc(14px*var(--escala-letra))] font-medium">
        <Smartphone className="size-4" /> Compras pelo aviso do banco
      </p>
      <p className="mt-1.5 text-[calc(12px*var(--escala-letra))] leading-relaxed text-muted-fg">
        O aviso que o banco já manda vira lançamento sozinho, na hora da compra. É o mais perto do automático — e o
        Tino recusa compra negada, estorno e pré-autorização de posto.
      </p>

      {!url ? (
        <button
          onClick={aoGerar}
          className="mt-3 flex items-center gap-1.5 rounded-full border border-acao/40 bg-acao/10 px-4 py-2 text-[calc(12px*var(--escala-letra))] font-medium text-acao"
        >
          <Plus className="size-3.5" /> gerar meu endereço
        </button>
      ) : (
        <>
          <div className="mt-3 rounded-[var(--raio-campo)] border border-acao/40 bg-acao/[0.07] p-3">
            <p className="text-[max(10px,calc(12px*var(--escala-letra)))] font-semibold uppercase tracking-[0.14em] text-[color:var(--texto-3)]">
              Cole isto no encaminhador
            </p>
            <p className="numero mt-2 break-all text-[calc(12px*var(--escala-letra))] leading-relaxed">{url}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={copiar}
                className="flex items-center gap-1.5 rounded-full bg-acao px-4 py-2 text-[calc(12px*var(--escala-letra))] font-semibold text-background"
              >
                {copiado ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                {copiado ? "copiado" : "copiar endereço"}
              </button>
              <button
                onClick={mandarTeste}
                disabled={testando}
                className="rounded-full border border-pauta px-4 py-2 text-[calc(12px*var(--escala-letra))] font-medium disabled:opacity-50"
              >
                {testando ? "mandando…" : "mandar um aviso de teste"}
              </button>
            </div>
            <p className="mt-2 text-[max(10px,calc(12px*var(--escala-letra)))] leading-relaxed text-[color:var(--texto-3)]">
              Guarde agora: por segurança, o Tino não mostra esta chave de novo. Some da tela quando você sair.
            </p>
          </div>

          {teste && <p className="mt-2 text-[calc(12px*var(--escala-letra))] leading-relaxed">{teste}</p>}
        </>
      )}

      <ol className="mt-3 space-y-1.5 text-[calc(12px*var(--escala-letra))] leading-relaxed text-muted-fg">
        <li>
          1. No Android, instale um encaminhador de notificação — MacroDroid e Tasker fazem isso — e dê a ele a
          permissão de <b>acesso às notificações</b>.
        </li>
        <li>
          2. Gatilho: <b>notificação recebida</b>, filtrando só o app do seu banco e o da carteira. Filtrar importa:
          sem filtro, promoção e mensagem de aniversário também viriam para cá.
        </li>
        <li>
          3. Ação: <b>requisição HTTP POST</b> para o endereço acima, com corpo JSON{" "}
          <code className="rounded bg-papel-2 px-1.5 py-0.5">{`{"titulo":"[app]","texto":"[texto]"}`}</code> — onde{" "}
          <code className="rounded bg-papel-2 px-1.5 py-0.5">[app]</code> e{" "}
          <code className="rounded bg-papel-2 px-1.5 py-0.5">[texto]</code> são as variáveis do encaminhador.
        </li>
        <li>4. Faça uma compra pequena e veja se ela aparece na fila aqui em cima.</li>
      </ol>

      <p className="mt-2 text-[max(10px,calc(12px*var(--escala-letra)))] leading-relaxed text-[color:var(--texto-3)]">
        Isto é Android. No iPhone o sistema não deixa nenhum app ler a notificação de outro — ali o caminho é
        compartilhar o aviso com o Tino, ou falar pelo WhatsApp.
      </p>
    </div>
  )
}
