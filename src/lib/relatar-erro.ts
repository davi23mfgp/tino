/**
 * Manda um erro da tela para `/api/erros` sem atrapalhar ninguém.
 *
 * `sendBeacon` sobrevive a a pessoa fechar a aba logo depois do erro; sem ele,
 * `fetch` com `keepalive`. Os envios por página têm teto: um erro dentro de um
 * laço de renderização mandaria centenas por segundo.
 */
let enviados = 0
const TETO_POR_PAGINA = 5

export function relatarErro(erro: unknown) {
  if (typeof window === "undefined" || enviados >= TETO_POR_PAGINA) return
  enviados += 1
  const corpo = JSON.stringify({
    mensagem: erro instanceof Error ? `${erro.name}: ${erro.message}` : String(erro),
    pilha: erro instanceof Error ? erro.stack?.slice(0, 4000) : undefined,
    // Só o caminho: a consulta pode levar e-mail ou token.
    rota: window.location.pathname,
  })
  try {
    if (navigator.sendBeacon?.("/api/erros", new Blob([corpo], { type: "application/json" }))) return
    void fetch("/api/erros", { method: "POST", body: corpo, keepalive: true, headers: { "Content-Type": "application/json" } }).catch(() => {})
  } catch {
    // Relatar erro não pode virar outro erro.
  }
}
