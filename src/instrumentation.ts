/** Roda uma vez quando o servidor sobe, antes de atender qualquer requisição. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return
  const { conferirAmbiente } = await import("@/lib/ambiente")
  const problemas = conferirAmbiente()
  for (const p of problemas) console.warn(`[tino] ambiente: ${p.variavel} — ${p.motivo}`)
  if (process.env.NODE_ENV === "production" && problemas.some((p) => p.fatal)) {
    throw new Error("Variável de ambiente obrigatória ausente. Veja o log acima.")
  }
}
