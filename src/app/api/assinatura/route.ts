/**
 * A assinatura do usuário logado: ler, contratar e cancelar.
 *
 * O status nunca é escrito aqui. Quem muda para ATIVA ou INADIMPLENTE é o
 * webhook do provedor, depois de conferir a assinatura do evento — se a tela
 * pudesse ativar a própria conta, bastaria chamar esta rota para usar de graça.
 */

import { comSessao, corpo, ok, ErroDeUso } from "@/lib/api"
import { prisma } from "@/lib/prisma"
import { plano, type CodigoDoPlano } from "@/lib/planos"
import { diasDeTesteVigentes, planosVigentes } from "@/lib/parametros"
import { gateway, opcoesDeGateway, valorDoPlanoCentavos, GatewayNaoConfigurado } from "@/lib/pagamento"
import type { CicloCobranca, ProvedorPagamento } from "@prisma/client"

export const GET = comSessao(async (sessao) => {
  const [assinatura, planos, diasDeTeste] = await Promise.all([
    prisma.assinatura.findUnique({
      where: { usuarioId: sessao.usuarioId },
      include: { cobrancas: { orderBy: { criadoEm: "desc" }, take: 12 } },
    }),
    planosVigentes(),
    diasDeTesteVigentes(),
  ])

  return ok({
    assinatura,
    planos,
    diasDeTeste,
    gateways: opcoesDeGateway(),
  })
})

/**
 * Inicia a contratação e devolve o endereço do provedor.
 *
 * A linha no banco nasce antes da chamada ao gateway, com status PENDENTE: o id
 * dela é a referência que vai no checkout, e é por ela que o webhook reencontra
 * o cliente mesmo se a resposta do provedor se perder no caminho.
 */
export const POST = comSessao(async (sessao, requisicao) => {
  const dados = await corpo<{ provedor: ProvedorPagamento; planoId: CodigoDoPlano; ciclo: CicloCobranca }>(requisicao)

  const provedor = dados.provedor
  if (provedor !== "MERCADO_PAGO" && provedor !== "STRIPE") throw new ErroDeUso("Escolha um meio de pagamento.")

  const ciclo: CicloCobranca = dados.ciclo === "ANUAL" ? "ANUAL" : "MENSAL"

  let escolhido
  try {
    escolhido = plano(dados.planoId)
  } catch {
    throw new ErroDeUso("Plano desconhecido.")
  }

  const escolha = gateway(provedor)
  if (!escolha.configurado()) {
    throw new ErroDeUso(`${escolha.rotulo} ainda não está configurado. Escolha o outro meio de pagamento.`, 503)
  }

  const valorCentavos = await valorDoPlanoCentavos(escolhido.codigo, ciclo)

  const existente = await prisma.assinatura.findUnique({ where: { usuarioId: sessao.usuarioId } })
  if (existente?.status === "ATIVA") {
    throw new ErroDeUso("Você já tem uma assinatura ativa. Cancele antes de contratar outra.")
  }

  const assinatura = await prisma.assinatura.upsert({
    where: { usuarioId: sessao.usuarioId },
    create: {
      usuarioId: sessao.usuarioId,
      provedor,
      status: "PENDENTE",
      planoId: escolhido.codigo,
      ciclo,
      valorCentavos,
    },
    // Trocar de provedor ou de plano reaproveita a linha, e com ela o histórico
    // de cobrança: uma assinatura por usuário é o que mantém o painel do admin
    // legível.
    update: {
      provedor,
      status: "PENDENTE",
      planoId: escolhido.codigo,
      ciclo,
      valorCentavos,
      idExterno: null,
      motivoFalha: null,
      canceladaEm: null,
    },
  })

  const origem = new URL(requisicao.url).origin

  try {
    const checkout = await escolha.criarCheckout({
      referencia: assinatura.id,
      planoId: escolhido.codigo,
      nomeDoPlano: escolhido.nome,
      ciclo,
      valorCentavos,
      emailDoPagador: sessao.email,
      urlRetorno: `${origem}/assinatura`,
    })

    await prisma.assinatura.update({
      where: { id: assinatura.id },
      data: { idExterno: checkout.idExterno, clienteExterno: checkout.clienteExterno },
    })

    return ok({ url: checkout.url })
  } catch (excecao) {
    if (excecao instanceof GatewayNaoConfigurado) throw new ErroDeUso(excecao.message, 503)
    console.error("[tino] falha ao abrir checkout", excecao)
    throw new ErroDeUso("Não consegui abrir o pagamento agora. Tente de novo em instantes.", 502)
  }
})

/**
 * Cancela no provedor primeiro.
 *
 * Marcar como cancelada aqui e falhar lá deixaria o cliente sem acesso e ainda
 * pagando — o pior dos dois mundos. O status final vem pelo webhook; o que se
 * grava aqui é a data do pedido.
 */
export const DELETE = comSessao(async (sessao) => {
  const assinatura = await prisma.assinatura.findUnique({ where: { usuarioId: sessao.usuarioId } })
  if (!assinatura) throw new ErroDeUso("Você não tem assinatura para cancelar.")

  if (assinatura.idExterno) {
    try {
      await gateway(assinatura.provedor).cancelar(assinatura.idExterno)
    } catch (excecao) {
      if (excecao instanceof GatewayNaoConfigurado) throw new ErroDeUso(excecao.message, 503)
      console.error("[tino] falha ao cancelar no provedor", excecao)
      throw new ErroDeUso("Não consegui cancelar junto ao provedor. Tente de novo ou fale com o suporte.", 502)
    }
  }

  const atualizada = await prisma.assinatura.update({
    where: { id: assinatura.id },
    data: { status: "CANCELADA", canceladaEm: new Date() },
  })

  return ok(atualizada)
})
