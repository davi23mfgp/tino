/** O navegador não deve usar a sessão do Tino para executar pedidos de outro site. */
export function origemPermitida(requisicao: Request): boolean {
  if (["GET", "HEAD", "OPTIONS"].includes(requisicao.method)) return true
  const origem = requisicao.headers.get("origin")
  if (requisicao.headers.get("sec-fetch-site") === "cross-site") return false
  if (origem) {
    try {
      const endereco = new URL(requisicao.url)
      // O Next normaliza 127.0.0.1 para localhost em algumas rotas. Host é
      // o destino que o navegador realmente pediu; não usar forwarded-host
      // fornecido pelo cliente para decidir permissão.
      const host = requisicao.headers.get("host")
      if (host) endereco.host = host
      return origem === endereco.origin
    } catch { return false }
  }
  // Integrações sem cookie usam assinatura/chave própria. Com cookie, a
  // escrita precisa comprovar origem; CORS não impede envio de formulários.
  return !requisicao.headers.get("cookie")
}
