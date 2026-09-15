"use client"

import Link from "next/link"
import { AlertTriangle } from "lucide-react"

import { usarAlertas } from "@/components/alertas-provider"

/**
 * O aviso crítico, dentro do herói.
 *
 * No painel ele era uma faixa vermelha de largura inteira **acima** do número.
 * O olho batia no problema antes de a pessoa saber onde está — o contrário do
 * princípio de tela, que manda situar, depois apontar. E duas coisas grandes
 * na mesma dobra fazem as duas perderem.
 *
 * Aqui ele é uma etiqueta ao lado da conclusão: quem lê o número vê o
 * problema junto, no tamanho de problema, com o caminho para resolver.
 */
export function AvisoNoHeroi() {
  const { alertas } = usarAlertas()
  const critico = alertas.find((alerta) => alerta.severidade === "CRITICO")
  if (!critico) return null

  const conteudo = (
    <>
      <AlertTriangle aria-hidden className="size-3.5 shrink-0" />
      <span className="min-w-0 truncate">{critico.titulo}</span>
    </>
  )

  const estilo =
    "mt-3 inline-flex max-w-full items-center gap-1.5 rounded-[var(--raio-pilula)] bg-negativo/[0.14] px-3 py-1.5 text-[calc(12px*var(--escala-letra))] font-medium text-negativo"

  return critico.acaoRota ? (
    <Link href={critico.acaoRota} className={`${estilo} ios-tap hover:bg-negativo/20`}>
      {conteudo}
    </Link>
  ) : (
    <span className={estilo}>{conteudo}</span>
  )
}
