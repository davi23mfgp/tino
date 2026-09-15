import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * O bloco claro — um por tela, e um só.
 *
 * As três referências que o Davi mandou (Pierre, Meu Assessor, Calen) usam o
 * mesmo recurso para dizer "olhe aqui" sem gastar cor de alerta: no meio de
 * uma tela escura, um bloco claro é o que o olho encontra primeiro. O Tino
 * tinha isso na vitrine (`.lp-painel-claro`, o bloco de que ele mais gostou) e
 * não tinha dentro do produto.
 *
 * A regra de uso é a que faz funcionar: **um por tela**. Dois blocos claros
 * viram duas chamadas e a hierarquia volta a ser plana, que é justamente o
 * problema que ele veio resolver.
 *
 * O que entra aqui é sempre a mesma coisa: a conclusão da tela e o botão que
 * age sobre ela. Não é lugar de lista nem de gráfico.
 */
export function Destaque({
  rotulo,
  titulo,
  apoio,
  acao,
  acaoSecundaria,
  className,
}: {
  /** Duas ou três palavras, em caixa alta. */
  rotulo: string
  /** A conclusão, em tamanho de manchete. */
  titulo: React.ReactNode
  /** Uma linha de contexto. Opcional. */
  apoio?: React.ReactNode
  /** O botão que resolve. */
  acao?: { href: string; texto: string }
  /** Um segundo caminho, quando a tela precisa responder duas perguntas — em
      `/dividas`, "qual pago primeiro" e "de onde tiro o dinheiro". Fica com
      peso menor de propósito: dois botões iguais não são uma recomendação. */
  acaoSecundaria?: { href: string; texto: string }
  className?: string
}) {
  return (
    <section className={cn("superficie-clara p-5 sm:p-6", className)}>
      <p className="text-[max(10px,calc(11px*var(--escala-letra)))] font-semibold uppercase tracking-[0.14em] opacity-70">
        {rotulo}
      </p>

      <h2 className="mt-2 text-[calc(clamp(20px,2.6vw,26px)*var(--escala-letra))] font-semibold leading-[1.15] tracking-[-0.03em]">
        {titulo}
      </h2>

      {apoio && <p className="apoio-claro mt-2 text-[calc(13px*var(--escala-letra))] leading-relaxed">{apoio}</p>}

      {(acao || acaoSecundaria) && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {acao && (
            <Link href={acao.href} className="acao-clara text-[calc(13px*var(--escala-letra))]">
              {acao.texto}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          )}
          {acaoSecundaria && (
            <Link
              href={acaoSecundaria.href}
              className="apoio-claro inline-flex min-h-11 items-center text-[calc(13px*var(--escala-letra))] font-medium underline-offset-4 hover:underline"
            >
              {acaoSecundaria.texto}
            </Link>
          )}
        </div>
      )}
    </section>
  )
}
