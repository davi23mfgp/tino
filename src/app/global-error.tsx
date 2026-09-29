"use client"

import { useEffect } from "react"

import { relatarErro } from "@/lib/relatar-erro"

/**
 * Último recurso: quando o próprio layout raiz quebra. Precisa ter `html` e
 * `body` porque substitui o layout inteiro. Estilo embutido, porque o CSS do
 * app pode ser justamente o que não carregou.
 */
export default function ErroGeral({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    relatarErro(error)
  }, [error])

  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", background: "#0b0b0b", color: "#f4f4f4", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ maxWidth: 420, padding: 24, textAlign: "center" }}>
          <h2 style={{ fontSize: 20, fontWeight: 600 }}>Algo deu errado</h2>
          <p style={{ color: "#a3a3a3", fontSize: 14 }}>O erro já foi registrado para correção. Seus dados não foram afetados.</p>
          <button type="button" onClick={() => retry()} style={{ marginTop: 12, padding: "12px 24px", borderRadius: 999, border: 0, background: "#45f05c", color: "#0b0b0b", fontWeight: 600, fontSize: 14 }}>
            Tentar de novo
          </button>
        </div>
      </body>
    </html>
  )
}
