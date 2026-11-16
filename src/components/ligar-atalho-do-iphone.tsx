"use client"

import { useState } from "react"
import { Check, Copy, Plus, CreditCard, Send, ListChecks, Hand, Wand2 } from "lucide-react"

import estilos from "./ligar-aviso-do-banco.module.css"

/**
 * Ligar o iPhone.
 *
 * O iPhone não deixa um app ler o aviso de outro, mas o app Atalhos dispara
 * sozinho quando o cartão é usado na Carteira e entrega valor, loja e cartão
 * já separados. É o caminho que os apps de anotar por Apple Pay usam.
 *
 * O Tino é site instalado, então não consegue criar a automação pela pessoa:
 * a Apple só deixa isso para app da loja. O caminho curto é um atalho pronto,
 * publicado uma vez no iCloud (`NEXT_PUBLIC_ATALHO_IPHONE_URL`): a pessoa toca
 * em adicionar, cola o endereço quando o atalho pergunta, e escolhe esse
 * atalho na automação. Montar campo por campo fica recolhido, para quem
 * quiser: o Davi pediu que nada aqui seja pago nem difícil (10/11/2026).
 *
 * Fica dito na tela o que falha: maquininha que não devolve o registro à
 * Carteira não dispara nada, e compra com o cartão físico também não.
 */
export function LigarAtalhoDoIphone({
  endereco,
  chaveNova,
  aoGerar,
}: {
  endereco: string
  chaveNova: string | null
  aoGerar: () => void
}) {
  const [copiado, setCopiado] = useState(false)
  const [teste, setTeste] = useState<string | null>(null)
  const [testando, setTestando] = useState(false)
  const atalhoPronto = process.env.NEXT_PUBLIC_ATALHO_IPHONE_URL || null

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
      // Sem "confirmado": o teste tem de parar na fila, nunca virar lançamento.
      const resposta = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ valor: "R$ 34,90", loja: "Padaria São José (teste)" }),
      })
      setTeste(
        resposta.ok
          ? "Deu certo. A compra de teste está na fila de conferência. Confira e apague, se quiser."
          : "O envio não passou. A chave pode ter sido revogada; gere outra.",
      )
    } catch {
      setTeste("Não consegui falar com o servidor agora.")
    } finally {
      setTestando(false)
    }
  }

  return (
    <div className={estilos.guia}>
      <p className="mt-1.5 text-[calc(12px*var(--escala-letra))] leading-relaxed text-muted-fg">
        Pagou com o iPhone ou o relógio, o gasto chega ao Tino sozinho. Usa o app Atalhos, que já vem no iPhone e é
        gratuito.
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
            <p className="text-[max(10px,calc(12px*var(--escala-letra)))] font-semibold text-[color:var(--texto-3)]">
              Cole isto no atalho
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
                {testando ? "mandando…" : "mandar uma compra de teste"}
              </button>
            </div>
            <p className="mt-2 text-[max(10px,calc(12px*var(--escala-letra)))] leading-relaxed text-[color:var(--texto-3)]">
              Guarde agora: por segurança, o Tino não mostra esta chave de novo. Some da tela quando você sair.
            </p>
          </div>
          {teste && <p className="mt-2 text-[calc(12px*var(--escala-letra))] leading-relaxed">{teste}</p>}
        </>
      )}

      {atalhoPronto && (
        <ol className={estilos.passos}>
          <li><div className={estilos.figura}><Wand2 aria-hidden /><span>1</span></div><div><h3>Adicione o atalho do Tino</h3><p>Toque abaixo e depois em <b>Adicionar Atalho</b>. Quando ele perguntar o endereço, cole o que você copiou acima.</p><a href={atalhoPronto} target="_blank" rel="noopener noreferrer">Adicionar o atalho →</a></div></li>
          <li><div className={estilos.figura}><CreditCard aria-hidden /><span>2</span></div><div><h3>Ligue ao cartão</h3><p>No app <b>Atalhos</b>, aba <b>Automação</b>, toque em <b>+</b> e escolha <b>Transação</b>. Marque os cartões, <b>Executar Imediatamente</b>, e escolha o atalho <b>Anotar no Tino</b>.</p></div></li>
          <li><div className={estilos.figura}><ListChecks aria-hidden /><span>3</span></div><div><h3>Pronto</h3><p>Na próxima compra com o iPhone, o gasto aparece na fila do Tino para você conferir com um toque.</p></div></li>
        </ol>
      )}
      <details className="mt-3" open={!atalhoPronto}>
        <summary className="flex min-h-11 cursor-pointer items-center text-[calc(13px*var(--escala-letra))] font-medium">
          Montar à mão, passo a passo (uns 5 minutos)
        </summary>
      <ol className={estilos.passos}>
        <li><div className={estilos.figura}><CreditCard aria-hidden /><span>1</span></div><div><h3>Crie a automação do cartão</h3><p>Abra o app <b>Atalhos</b>, aba <b>Automação</b>, toque em <b>+</b> e escolha <b>Transação</b>. Marque os cartões da Carteira e <b>Executar Imediatamente</b>.</p></div></li>
        <li><div className={estilos.figura}><Send aria-hidden /><span>2</span></div><div><h3>Envie ao Tino</h3><p>Adicione a ação <b>Obter Conteúdo do URL</b>, cole o endereço acima e abra <b>Mostrar Mais</b>.</p><dl className={estilos.http}><div><dt>Método</dt><dd>POST</dd></div><div><dt>Corpo da requisição</dt><dd>JSON</dd></div><div><dt>valor</dt><dd>Entrada do Atalho → Valor</dd></div><div><dt>loja</dt><dd>Entrada do Atalho → Comerciante</dd></div><div><dt>cartao</dt><dd>Entrada do Atalho → Cartão ou Passe</dd></div></dl><p>Cada campo é do tipo Texto. Os nomes ficam assim mesmo, sem acento.</p></div></li>
        <li><div className={estilos.figura}><Wand2 aria-hidden /><span>3</span></div><div><h3>Quer lançar direto?</h3><p>Do jeito acima, a compra espera você na fila. Para já lançar, acrescente o campo <b>confirmado</b> com o texto <b>sim</b>. O Tino só lança quando reconhece o cartão pelo nome da conta; na dúvida, deixa na fila.</p></div></li>
        <li><div className={estilos.figura}><Hand aria-hidden /><span>4</span></div><div><h3>Dinheiro e Pix: dois toques atrás</h3><p>Crie um atalho com <b>Pedir Entrada</b> (texto) e <b>Obter Conteúdo do URL</b> com os campos <b>texto</b> (a entrada) e <b>livre</b> (sim). Depois, em <b>Ajustes → Acessibilidade → Toque → Toque Atrás</b>, escolha esse atalho. Dois toques nas costas do iPhone e você escreve "mercado 52,30".</p></div></li>
        <li><div className={estilos.figura}><ListChecks aria-hidden /><span>5</span></div><div><h3>Confira na próxima compra</h3><p>Use a compra de teste acima para provar o endereço. Na próxima compra de verdade, veja se ela chegou à fila.</p></div></li>
      </ol>
      </details>
      <p className="mt-2 text-[max(10px,calc(12px*var(--escala-letra)))] leading-relaxed text-[color:var(--texto-3)]">
        Só pega o que passa pela Carteira do iPhone. Compra com o cartão físico não dispara, e algumas maquininhas não
        devolvem o registro. Para essas, use os dois toques atrás ou o Telegram.
      </p>
    </div>
  )
}
