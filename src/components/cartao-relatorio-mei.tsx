"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { FileText } from "lucide-react"

import { buscar } from "@/lib/cliente"
import { rotuloCompetencia } from "@/lib/datas"
import { mesParaFechar } from "@/lib/loja/relatorio-mei"

/**
 * O relatório do mês que passou, na tela MEI (passo 41, A com B): diz o mês, o
 * prazo e quantas vendas ainda faltam marcar, tudo do banco, e leva à tela de
 * fechar. Some se a busca falhar, em vez de mostrar um número inventado.
 */
export function CartaoRelatorioMei() {
  const [resumo, setResumo] = useState<{ mes: string; prazo: string; pendentes: number; vendas: number } | null>(null)

  useEffect(() => {
    const mes = mesParaFechar(new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" }))
    buscar<{ prazo: string; pendentes: number; vendas: unknown[] }>(`/api/loja/relatorio?mes=${mes}`)
      .then((dados) => setResumo({ mes, prazo: dados.prazo, pendentes: dados.pendentes, vendas: dados.vendas.length }))
      .catch(() => undefined)
  }, [])

  if (!resumo) return null
  const nome = rotuloCompetencia(resumo.mes)
  return (
    <Link href="/loja/fechar-mes" className="ficha flex items-center gap-3 border border-primary/40 p-4">
      <FileText className="size-6 shrink-0 text-primary" aria-hidden />
      <span className="min-w-0 flex-1">
        <b className="block text-[calc(15px*var(--escala-letra))]">Relatório de {nome}</b>
        <span className="block text-[calc(13px*var(--escala-letra))] text-muted-fg">
          guarde até {resumo.prazo.slice(0, 5)}{resumo.pendentes > 0 ? ` · pendentes de nota: ${resumo.pendentes}` : resumo.vendas > 0 ? " · notas marcadas" : ""}
        </span>
      </span>
      <span className="shrink-0 text-[calc(13px*var(--escala-letra))] font-semibold text-primary">Fechar o mês</span>
    </Link>
  )
}
