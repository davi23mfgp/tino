import { prisma } from "@/lib/prisma"
import { siteConhecido } from "@/lib/marcas"
import { logoDaInternet } from "@/lib/logo-da-internet"

type Contexto = { params: Promise<{ site: string }> }

/// O logo não muda de uma semana para outra. Na borda (Vercel), um mês; se o
/// serviço de ícones cair, o que já está guardado continua servindo.
const GUARDAR = "public, max-age=604800, s-maxage=2592000, stale-while-revalidate=604800"
const memoria = new Map<string, { tipo: string; bytes: Buffer } | null>()

/**
 * Logo de loja conhecida (`src/lib/marcas.ts`), para qualquer tela mostrar ao
 * lado da compra.
 *
 * Sem sessão de propósito: o logo é público, a resposta é igual para todo
 * mundo e pode ficar guardada na borda. Só atende site do catálogo ou de loja
 * identificada pela IA — não é um atalho para o servidor buscar ícone de
 * qualquer endereço.
 */
export async function GET(_requisicao: Request, contexto: Contexto) {
  const { site } = await contexto.params
  // Além do catálogo, o site de uma loja que a IA identificou. Quem grava
  // esses sites é só a rodada da noite, nunca uma requisição de fora.
  const permitido =
    siteConhecido(site) ||
    Boolean(await prisma.marcaDescoberta.findFirst({ where: { site, situacao: { in: ["IDENTIFICADA", "SUGERIDA"] } }, select: { chave: true } }))
  if (!permitido) return new Response(null, { status: 404 })

  if (!memoria.has(site)) memoria.set(site, await logoDaInternet(site))
  const logo = memoria.get(site)
  // Falhou: esquece, para a próxima visita tentar de novo, e avisa a borda
  // para não guardar a falha por muito tempo. A tela cai no ícone da categoria.
  if (!logo) {
    memoria.delete(site)
    return new Response(null, { status: 404, headers: { "Cache-Control": "public, max-age=300" } })
  }
  return new Response(new Uint8Array(logo.bytes), { headers: { "Content-Type": logo.tipo, "Cache-Control": GUARDAR } })
}
