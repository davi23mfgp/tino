"use client"

import { useState } from "react"
import { Check, Copy, Plus, Smartphone, Download, Bell, Filter, Send, ListChecks } from "lucide-react"

import estilos from "./ligar-aviso-do-banco.module.css"

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
  semCabecalho = false,
}: {
  /** Origem pública do app, sem barra no fim. */
  endereco: string
  /** A chave recém-criada. Só existe no momento da criação — depois, nem o banco a devolve. */
  chaveNova: string | null
  aoGerar: () => void
  /** Dentro de um diálogo que já tem o título: sem a moldura e sem repetir o nome. */
  semCabecalho?: boolean
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
          ? "Deu certo. O aviso de teste está na fila de conferência acima. Confira e apague, se quiser."
          : "O envio não passou. A chave pode ter sido revogada; gere outra.",
      )
    } catch {
      setTeste("Não consegui falar com o servidor agora.")
    } finally {
      setTestando(false)
    }
  }

  return (
    <div className={semCabecalho ? estilos.guia : `${estilos.guia} rounded-[var(--raio-cartao)] border border-pauta p-4`}>
      {!semCabecalho && (
        <p className="flex items-center gap-2 text-[calc(14px*var(--escala-letra))] font-medium">
          <Smartphone className="size-4" /> Compras pelo aviso do banco
        </p>
      )}
      <p className="mt-1.5 text-[calc(12px*var(--escala-letra))] leading-relaxed text-muted-fg">
        Configure no Android. O aviso da compra chega ao Tino para você conferir.
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

      <ol className={estilos.passos}>
        <li><div className={estilos.figura}><Download aria-hidden /><span>1</span></div><div><h3>Instale o MacroDroid</h3><p>Abra a loja oficial, instale e toque em <b>Adicionar macro</b>.</p><a href="https://play.google.com/store/apps/details?id=com.arlosoft.macrodroid" target="_blank" rel="noopener noreferrer">Instalar pelo Google Play →</a></div></li>
        <li><div className={estilos.figura}><Bell aria-hidden /><span>2</span></div><div><h3>Escolha o aviso do banco</h3><p>Em <b>Gatilhos → Notificação → Notificação recebida</b>, selecione apenas o app do banco. Quando o Android pedir, habilite <b>Acesso às notificações</b> para o MacroDroid.</p><div className={estilos.exemplo}><Bell size={16} aria-hidden /><span>Notificação recebida</span><small>App: seu banco</small></div></div></li>
        <li><div className={estilos.figura}><Filter aria-hidden /><span>3</span></div><div><h3>Filtre as compras</h3><p>Use o filtro de texto do gatilho com uma expressão que o seu banco usa, como <b>compra aprovada</b>. Confira o texto de um aviso real para não enviar promoções.</p><div className={estilos.exemplo}><Filter size={16} aria-hidden /><span>Texto contém</span><small>compra aprovada</small></div></div></li>
        <li><div className={estilos.figura}><Send aria-hidden /><span>4</span></div><div><h3>Envie ao Tino</h3><p>Em <b>Ações</b>, procure <b>Requisição HTTP</b>. Selecione POST e cole o endereço gerado acima.</p><dl className={estilos.http}><div><dt>Método</dt><dd>POST</dd></div><div><dt>Content-Type</dt><dd>application/json</dd></div><div><dt>Corpo</dt><dd><code>{'{"titulo":"TÍTULO_DO_AVISO","texto":"TEXTO_DO_AVISO"}'}</code></dd></div></dl><p>No corpo, substitua TÍTULO_DO_AVISO e TEXTO_DO_AVISO pelo <b>Texto mágico</b> do MacroDroid: título e texto da notificação do gatilho. Use o seletor de variáveis do app; não envie os nomes de exemplo como texto literal.</p></div></li>
        <li><div className={estilos.figura}><ListChecks aria-hidden /><span>5</span></div><div><h3>Salve e confira</h3><p>Dê um nome à macro, salve e deixe ativada. Use o aviso de teste acima para conferir a conexão com o Tino; ele não testa a macro. Na próxima compra, confirme se o aviso real chegou à fila.</p><div className={estilos.exemplo}><Check size={16} aria-hidden /><span>Aviso recebido</span><small>Conferir no Tino</small></div></div></li>
      </ol>
      <p className="mt-2 text-[max(10px,calc(12px*var(--escala-letra)))] leading-relaxed text-[color:var(--texto-3)]">
        Isto é Android. No iPhone o sistema não deixa nenhum app ler a notificação de outro. Ali o caminho é
        compartilhar o aviso com o Tino, ou falar pelo Telegram.
      </p>
    </div>
  )
}
