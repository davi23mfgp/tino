/**
 * O logo de uma loja, puxado da internet pelo site dela.
 *
 * Quem busca é o servidor, nunca o navegador de quem usa o app: o serviço de
 * ícones recebe só o endereço da loja, e não fica sabendo quem comprou onde.
 * O serviço é o de ícones de site do Google (gratuito, sem chave), com o do
 * DuckDuckGo de reserva. O endereço de destino é sempre um desses dois — o
 * site da loja vai só como parâmetro —, então não há como usar esta função
 * para o servidor abrir um endereço qualquer.
 */
const FONTES = [
  (site: string) => `https://www.google.com/s2/favicons?domain=${encodeURIComponent(site)}&sz=128`,
  (site: string) => `https://icons.duckduckgo.com/ip3/${encodeURIComponent(site)}.ico`,
]
const TIPOS = new Set(["image/png", "image/jpeg", "image/webp", "image/x-icon", "image/vnd.microsoft.icon"])

/** "https://www.Loja.com.br/ofertas" → "loja.com.br". Devolve null se não for um site. */
export function siteLimpo(entrada: string): string | null {
  const site = entrada.trim().toLowerCase().replace(/^[a-z]+:\/\//, "").replace(/^www\./, "").split(/[/?#:]/)[0]
  // Só nome de domínio com ponto: nada de IP, localhost ou porta.
  return /^(?=.{4,100}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/.test(site) ? site : null
}

export async function logoDaInternet(site: string): Promise<{ tipo: string; bytes: Buffer } | null> {
  for (const fonte of FONTES) {
    try {
      const resposta = await fetch(fonte(site), { signal: AbortSignal.timeout(5000), redirect: "follow" })
      // O Google devolve um globo genérico com 404 quando não acha o ícone:
      // globo não é logo de ninguém.
      if (!resposta.ok) continue
      const tipo = (resposta.headers.get("content-type") ?? "").split(";")[0].trim()
      if (!TIPOS.has(tipo)) continue
      const bytes = Buffer.from(await resposta.arrayBuffer())
      if (bytes.length < 100 || bytes.length > 500 * 1024) continue
      return { tipo, bytes }
    } catch {
      // Fora do ar ou lento: tenta a próxima fonte.
    }
  }
  return null
}
