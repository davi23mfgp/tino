import { NextResponse } from "next/server"

import { getSessao } from "@/lib/auth"
import { registrarErro } from "@/lib/erros"
import { cabeNoLimite, ipDaRequisicao, REGRAS } from "@/lib/limite"

/**
 * Erro que aconteceu na tela de alguém (29/09/2026).
 *
 * Aberta sem sessão de propósito: a tela de login também quebra, e é justamente
 * aí que a pessoa desiste. O limite por IP (`REGRAS.publico`) segura quem
 * tentar encher o registro, e a sessão, quando existe, só anota de quem foi.
 * Responde 204 mesmo quando descarta: quem manda é um `sendBeacon`, que não lê
 * resposta, e dizer "recusado" a um script mal-intencionado só o ensina.
 */
export async function POST(requisicao: Request) {
  if ((await cabeNoLimite(`erros:${ipDaRequisicao(requisicao)}`, REGRAS.publico)) !== null) return new NextResponse(null, { status: 204 })

  let dados: { mensagem?: unknown; pilha?: unknown; rota?: unknown }
  try {
    const texto = await requisicao.text()
    if (texto.length > 12_000) return new NextResponse(null, { status: 204 })
    dados = JSON.parse(texto)
  } catch {
    return new NextResponse(null, { status: 204 })
  }
  if (typeof dados.mensagem !== "string" || !dados.mensagem.trim()) return new NextResponse(null, { status: 204 })

  const sessao = await getSessao().catch(() => null)
  await registrarErro({
    origem: "NAVEGADOR",
    mensagem: dados.mensagem,
    pilha: typeof dados.pilha === "string" ? dados.pilha : null,
    rota: typeof dados.rota === "string" ? dados.rota : null,
    usuarioId: sessao?.usuarioId ?? null,
  })
  return new NextResponse(null, { status: 204 })
}
