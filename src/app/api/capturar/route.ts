import { NextResponse } from "next/server"

import { autenticarChave, registrarCaptura } from "@/lib/captura"

export const dynamic = "force-dynamic"

/**
 * Entrada rápida de gastos, autenticada por chave em vez de sessão.
 *
 * É o endereço que o celular chama em segundo plano quando uma notificação de
 * compra aparece. Não usa cookie de propósito: o encaminhador roda sem
 * navegador e o cookie expiraria no meio do dia sem ninguém perceber.
 *
 * A chave pode vir no cabeçalho ou na query, porque vários encaminhadores de
 * Android só sabem montar URL — exigir cabeçalho excluiria justamente as
 * ferramentas sem código que tornam isso viável para quem não programa.
 */
export async function POST(requisicao: Request) {
  const url = new URL(requisicao.url)
  const cabecalho = requisicao.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  const chaveValor = cabecalho || url.searchParams.get("chave") || url.searchParams.get("token")

  const chave = await autenticarChave(chaveValor)
  if (!chave) return NextResponse.json({ erro: "Chave inválida ou revogada." }, { status: 401 })

  // Aceita JSON, formulário e texto puro: cada app de automação manda de um
  // jeito, e recusar formato é onde a integração morre para o usuário comum.
  const tipo = requisicao.headers.get("content-type") ?? ""
  let texto = ""
  let textoLivre = false

  if (tipo.includes("application/json")) {
    const corpo = (await requisicao.json().catch(() => ({}))) as {
      texto?: string
      text?: string
      mensagem?: string
      titulo?: string
      title?: string
      livre?: boolean
    }
    // Notificação tem título ("Nubank") e corpo ("Compra de R$ 30..."), e o
    // banco só aparece no título — juntar os dois melhora a identificação.
    texto = [corpo.titulo ?? corpo.title, corpo.texto ?? corpo.text ?? corpo.mensagem].filter(Boolean).join(" — ")
    textoLivre = Boolean(corpo.livre)
  } else if (tipo.includes("form")) {
    const formulario = await requisicao.formData()
    texto = [formulario.get("titulo"), formulario.get("texto") ?? formulario.get("text")]
      .filter(Boolean)
      .join(" — ")
  } else {
    texto = await requisicao.text()
  }

  texto = texto.trim()
  if (!texto) return NextResponse.json({ erro: "Nada para ler." }, { status: 400 })

  const resultado = await registrarCaptura({
    larId: chave.larId,
    chaveId: chave.id,
    texto,
    origem: chave.origem,
    textoLivre,
  })

  return NextResponse.json({
    ok: true,
    status: resultado.status,
    mensagem: resultado.resposta,
    valorCentavos: resultado.leitura.valorCentavos,
    estabelecimento: resultado.leitura.estabelecimento,
  })
}

/** Teste rápido da chave — o usuário confere que a ponte está de pé. */
export async function GET(requisicao: Request) {
  const url = new URL(requisicao.url)
  const chave = await autenticarChave(
    requisicao.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || url.searchParams.get("chave"),
  )

  if (!chave) return NextResponse.json({ erro: "Chave inválida ou revogada." }, { status: 401 })
  return NextResponse.json({ ok: true, canal: chave.nome })
}
