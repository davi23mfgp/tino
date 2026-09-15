import Link from "next/link"
import { ArrowRight, Bell, FileUp, MessageCircle } from "lucide-react"

import { Abertura } from "@/components/abertura"

/**
 * Como o gasto entra sozinho.
 *
 * A tela antiga dizia "falta contratar o agregador" e oferecia um caminho só:
 * mandar o extrato em arquivo. Ficava parecendo que o Tino só funciona pela
 * metade — e não é verdade. O que o Open Finance entrega é **o lançamento
 * entrar sozinho**, e para isso já existem três caminhos prontos aqui dentro,
 * que custam zero e não dependem de fornecedor nenhum.
 *
 * A ordem é a de quem trabalha menos:
 *
 * 1. O aviso que o banco já manda no celular é encaminhado para o Tino. Quem
 *    lê esse texto é `src/lib/captura/notificacao.ts`, que já entende valor,
 *    estabelecimento, final do cartão, parcela e instituição — e recusa
 *    compra negada, estorno e pré-autorização de posto.
 * 2. Falar ou escrever o gasto, pelo WhatsApp ou pelo próprio app.
 * 3. Extrato e fatura em arquivo, que fecham o mês inteiro de uma vez.
 *
 * Nenhum deles é Open Finance de verdade: não trazem o saldo da conta, e o
 * caminho 1 depende de um encaminhador instalado no Android. A tela diz isso.
 */

const CAMINHOS = [
  {
    Icone: Bell,
    titulo: "O aviso do banco vira lançamento",
    texto:
      "O Tino lê o aviso de compra que o seu banco já manda e entende valor, lugar e final do cartão. É o mais perto do automático.",
    detalhe: "Android, com um encaminhador de notificação. Crie a chave na fila de conferência.",
    href: "/capturas",
    acao: "Criar a chave",
  },
  {
    Icone: MessageCircle,
    titulo: "Falar ou escrever na hora",
    texto: "Mandou áudio ou mensagem, virou lançamento. Pelo WhatsApp, pelo Telegram ou aqui dentro.",
    detalhe: "Funciona em qualquer celular, sem instalar nada.",
    href: "/lancar",
    acao: "Anotar agora",
  },
  {
    Icone: FileUp,
    titulo: "Extrato e fatura de uma vez",
    texto: "OFX, CSV ou PDF do mês inteiro. A fatura também pode chegar por e-mail direto para o Tino.",
    detalhe: "É o que fecha o mês sem furo, quando os outros dois deixam passar algo.",
    href: "/importar",
    acao: "Enviar arquivo",
  },
]

export function SemOpenFinance() {
  return (
    <div className="mx-auto w-full max-w-lg space-y-4 py-2">
      <Abertura
        rotulo="Entrada automática"
        titulo={<>Seu gasto pode entrar no Tino <em>sem você digitar</em>.</>}
        apoio="Três caminhos, do que dá menos trabalho para o que dá mais. Todos já funcionam hoje."
      />

      <ol className="space-y-3">
        {CAMINHOS.map(({ Icone, titulo, texto, detalhe, href, acao }, indice) => (
          <li key={titulo} className="ficha p-4">
            <div className="flex items-start gap-3">
              <span
                aria-hidden
                className="grid size-10 shrink-0 place-items-center rounded-full border border-pauta bg-card text-foreground"
              >
                <Icone className="size-[18px]" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[max(10px,calc(12px*var(--escala-letra)))] font-semibold uppercase tracking-[0.14em] text-[color:var(--texto-3)]">
                  Caminho {indice + 1}
                </p>
                <h2 className="mt-1 text-[calc(15px*var(--escala-letra))] font-semibold">{titulo}</h2>
                <p className="mt-1.5 text-[calc(13px*var(--escala-letra))] leading-relaxed text-[color:var(--texto-2)]">{texto}</p>
                <p className="mt-1.5 text-[calc(12px*var(--escala-letra))] text-[color:var(--texto-3)]">{detalhe}</p>
                <Link
                  href={href}
                  className="mt-3 inline-flex items-center gap-1.5 text-[calc(13px*var(--escala-letra))] font-medium text-acao underline-offset-4 hover:underline"
                >
                  {acao}
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>
          </li>
        ))}
      </ol>

      <p className="px-1 text-[calc(12px*var(--escala-letra))] leading-relaxed text-[color:var(--texto-3)]">
        Tudo que entra por aqui passa pela fila de conferência antes de virar saldo — o Tino não inventa lançamento. O
        saldo continua saindo dos seus lançamentos, não de uma conexão com o banco.
      </p>
    </div>
  )
}
