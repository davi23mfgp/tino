"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Lock } from "lucide-react"

import type { EstadoDoAcesso } from "@/lib/acesso-assinatura"

/**
 * A parede que aparece quando o acesso acabou.
 *
 * Fica no cliente por um motivo só: layout de servidor não recebe o caminho da
 * página, e sem o caminho não dá para deixar `/assinatura` de fora — a pessoa
 * cairia num redirecionamento infinito entre a parede e a tela onde ela
 * resolve o problema.
 *
 * O que continua aberto, e por quê:
 *
 * - `/assinatura`, porque é onde se resolve.
 * - `/configuracoes`, porque é de lá que se exporta e se apaga a conta. Isso é
 *   direito do titular (LGPD, art. 18) e não pode depender de estar pagando —
 *   quem parou de pagar tem ainda mais motivo para querer levar os dados.
 *
 * A parede não apaga nada e não é irreversível: pagar devolve tudo como
 * estava, porque os dados continuam no banco intactos.
 */

const LIVRES = ["/assinatura", "/configuracoes"]

const RECADO: Record<string, { titulo: string; texto: string }> = {
  TESTE_VENCIDO: {
    titulo: "Seu teste terminou",
    texto: "Seus dados continuam aqui, inteiros. Escolha um plano para voltar a usar o Tino.",
  },
  CANCELADA: {
    titulo: "Sua assinatura foi cancelada",
    texto: "Nada foi apagado. Assinar de novo devolve tudo como estava.",
  },
  ATRASO: {
    titulo: "O pagamento não passou",
    texto: "Tentamos por alguns dias e não deu certo. Atualize a forma de pagamento para continuar.",
  },
}

export function ParedeDeAssinatura({
  acesso,
  children,
}: {
  acesso: EstadoDoAcesso
  children: React.ReactNode
}) {
  const caminho = usePathname()

  if (acesso.liberado || LIVRES.some((livre) => caminho.startsWith(livre))) {
    return <>{children}</>
  }

  const recado = RECADO[acesso.motivo ?? ""] ?? {
    titulo: "Seu acesso está pausado",
    texto: "Escolha um plano para continuar usando o Tino.",
  }

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-lg flex-col justify-center px-1 py-10">
      <div className="ficha p-6 text-center sm:p-8">
        <span
          aria-hidden
          className="mx-auto mb-5 grid size-12 place-items-center rounded-full border border-pauta bg-papel-2"
        >
          <Lock className="size-5" />
        </span>

        <h1 className="text-[calc(clamp(20px,3vw,26px)*var(--escala-letra))] font-semibold leading-tight tracking-tight">
          {recado.titulo}
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-[calc(14px*var(--escala-letra))] leading-relaxed text-[color:var(--texto-2)]">
          {recado.texto}
        </p>

        <Link
          href="/assinatura"
          className="mt-6 inline-flex min-h-11 items-center rounded-[var(--raio-pilula)] bg-acao px-6 text-[calc(14px*var(--escala-letra))] font-semibold text-background"
        >
          Ver os planos
        </Link>

        <p className="mt-5 text-[calc(12px*var(--escala-letra))] leading-relaxed text-[color:var(--texto-3)]">
          Seus dados continuam seus:{" "}
          <Link href="/configuracoes" className="text-acao underline-offset-4 hover:underline">
            baixar tudo ou apagar a conta
          </Link>
          .
        </p>
      </div>
    </div>
  )
}
