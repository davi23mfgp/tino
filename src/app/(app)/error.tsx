"use client"

import { useEffect } from "react"

import { relatarErro } from "@/lib/relatar-erro"

/**
 * Quando uma tela do app quebra: diz o que houve em português, oferece tentar
 * de novo e manda o erro para o registro do admin (/admin/erros). Antes não
 * havia esta tela, e a pessoa via a página de erro crua do Next.
 */
export default function ErroNaTela({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    relatarErro(error)
  }, [error])

  return (
    <div className="mx-auto grid max-w-md gap-4 py-16 text-center">
      <h2 className="text-[calc(20px*var(--escala-letra))] font-semibold">Algo deu errado nesta tela</h2>
      <p className="text-[calc(14px*var(--escala-letra))] text-muted-fg">
        O erro já foi registrado para correção. Seus dados não foram afetados.
      </p>
      <button
        type="button"
        onClick={() => retry()}
        className="mx-auto rounded-full bg-primary px-6 py-3 text-[calc(14px*var(--escala-letra))] font-semibold text-primary-foreground"
      >
        Tentar de novo
      </button>
    </div>
  )
}
