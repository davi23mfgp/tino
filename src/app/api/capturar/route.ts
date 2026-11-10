import { NextResponse } from "next/server"

import { autenticarChave, confirmarCaptura, registrarCaptura } from "@/lib/captura"
import { lerEstruturada, type CapturaEstruturada } from "@/lib/captura/estruturada"
import { formatarMoeda } from "@/lib/dinheiro"
import { prisma } from "@/lib/prisma"
import { consumirLimite, ipDaRequisicao, LimiteEstourado, REGRAS } from "@/lib/limite"

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

  // Antes de conferir a chave, segura o laço por IP: chave errada em série é
  // varredura, e conferir chave custa uma ida ao banco por tentativa.
  try {
    await consumirLimite(`capturar:ip:${ipDaRequisicao(requisicao)}`, REGRAS.captura)
  } catch (excecao) {
    if (excecao instanceof LimiteEstourado) {
      return NextResponse.json({ erro: excecao.message }, { status: 429 })
    }
    throw excecao
  }

  const chave = await autenticarChave(chaveValor)
  if (!chave) return NextResponse.json({ erro: "Chave inválida ou revogada." }, { status: 401 })

  // Aceita JSON, formulário e texto puro: cada app de automação manda de um
  // jeito, e recusar formato é onde a integração morre para o usuário comum.
  const tipo = requisicao.headers.get("content-type") ?? ""
  let texto = ""
  let textoLivre = false
  // Atalho do iPhone manda os campos separados (valor, loja, cartao) e pode
  // dizer que a pessoa já confirmou na tela do celular.
  let estruturada: CapturaEstruturada | null = null
  let confirmado = false
  const sim = (valor: unknown) => valor === true || /^(sim|true|1)$/i.test(String(valor ?? "").trim())

  if (tipo.includes("application/json")) {
    const corpo = (await requisicao.json().catch(() => ({}))) as {
      texto?: string
      text?: string
      mensagem?: string
      titulo?: string
      title?: string
      livre?: boolean
      valor?: unknown
      loja?: unknown
      cartao?: unknown
      confirmado?: unknown
    }
    if (corpo.valor !== undefined && corpo.valor !== "") {
      estruturada = lerEstruturada(corpo)
      confirmado = sim(corpo.confirmado)
    }
    // Notificação tem título ("Nubank") e corpo ("Compra de R$ 30..."), e o
    // banco só aparece no título — juntar os dois melhora a identificação.
    texto = [corpo.titulo ?? corpo.title, corpo.texto ?? corpo.text ?? corpo.mensagem].filter(Boolean).join(": ")
    textoLivre = Boolean(corpo.livre)
  } else if (tipo.includes("form")) {
    const formulario = await requisicao.formData()
    const valor = formulario.get("valor")
    if (typeof valor === "string" && valor.trim()) {
      estruturada = lerEstruturada({ valor, loja: formulario.get("loja"), cartao: formulario.get("cartao") })
      confirmado = sim(formulario.get("confirmado"))
    }
    texto = [formulario.get("titulo"), formulario.get("texto") ?? formulario.get("text")]
      .filter(Boolean)
      .join(": ")
  } else {
    texto = await requisicao.text()
  }

  texto = (estruturada?.texto ?? texto).trim()
  if (!texto) return NextResponse.json({ erro: "Nada para ler." }, { status: 400 })

  const chaveDeIdempotencia = requisicao.headers.get("idempotency-key")?.trim().slice(0, 120) || null

  const resultado = await registrarCaptura({
    larId: chave.larId,
    chaveId: chave.id,
    texto,
    origem: chave.origem,
    textoLivre,
    leituraPronta: estruturada?.leitura,
    cartaoNome: estruturada?.cartaoNome,
    // Atalho do celular sem rede reenvia a mesma captura. Quem mandar o
    // cabeçalho ganha idempotência; quem não mandar, a captura é criada.
    eventoId: chaveDeIdempotencia ? `api:${chaveDeIdempotencia}` : null,
  })

  // Regra 5: a conferência aqui foi o "Confirmar" que o atalho mostrou no
  // celular. Só vale quando o Tino sabe a conta sem palpite; na dúvida, o
  // gasto fica na fila, porque conta errada ninguém percebe na hora.
  if (confirmado && estruturada && resultado.status === "PENDENTE" && resultado.contaCerta) {
    const transacao = await confirmarCaptura({ larId: chave.larId, capturaId: resultado.id })
    const conta = await prisma.conta.findUnique({ where: { id: transacao.contaId }, select: { nome: true } })
    return NextResponse.json({
      ok: true,
      status: "CONFIRMADA",
      mensagem: `Lançado: ${formatarMoeda(transacao.valorCentavos)}${
        resultado.leitura.estabelecimento ? ` em ${transacao.descricao}` : ""
      }${conta ? `, ${conta.nome}` : ""}.`,
      valorCentavos: transacao.valorCentavos,
      estabelecimento: resultado.leitura.estabelecimento,
    })
  }

  return NextResponse.json({
    ok: true,
    status: resultado.status,
    mensagem:
      confirmado && resultado.status === "PENDENTE"
        ? `${resultado.resposta} Não sei em qual conta entra: escolha no Tino.`
        : resultado.resposta,
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
