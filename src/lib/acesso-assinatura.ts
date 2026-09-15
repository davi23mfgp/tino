import type { StatusAssinatura } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { diasDeTesteVigentes } from "@/lib/parametros"

/**
 * Se a conta pode usar o Tino hoje.
 *
 * Até 15/09/2026 o status da assinatura era **mostrado** na tela e nunca
 * conferido: sem assinatura, com assinatura cancelada ou com pagamento em
 * atraso, a pessoa usava o produto inteiro igual. E o "teste de 14 dias" era
 * decorativo — nada criava a assinatura no cadastro, então não havia data para
 * vencer e o teste nunca terminava.
 *
 * As regras, e o porquê de cada uma:
 *
 * - **Teste dentro do prazo, ativa ou pendente:** liberado. `PENDENTE` é
 *   checkout já iniciado esperando o provedor confirmar; cortar o acesso de
 *   quem acabou de pagar seria o pior momento possível.
 * - **Inadimplente:** liberado por mais alguns dias. Cobrança falha por
 *   bobagem — cartão trocado, limite no dia errado — e cortar na hora perde
 *   cliente que ia pagar. O provedor ainda está tentando nesse período.
 * - **Teste vencido ou cancelada:** bloqueado.
 *
 * O bloqueio **nunca** fecha o caminho de ver o que o Tino guarda, exportar e
 * apagar a conta. Isso é direito do titular (LGPD, art. 18) e não pode
 * depender de estar pagando.
 */

/** Quantos dias o pagamento pode estar em atraso antes de barrar. */
const CARENCIA_INADIMPLENTE_DIAS = 7

export interface EstadoDoAcesso {
  liberado: boolean
  status: StatusAssinatura | "SEM_ASSINATURA"
  /** Por que está bloqueado. Vazio quando liberado. */
  motivo?: "TESTE_VENCIDO" | "CANCELADA" | "ATRASO"
  /** Quando o teste termina, para a tela poder avisar antes. */
  testeAteEm?: Date | null
}

export async function estadoDoAcesso(usuarioId: string): Promise<EstadoDoAcesso> {
  const assinatura = await prisma.assinatura.findUnique({ where: { usuarioId } })

  // Conta criada antes de o teste existir no código: trata como teste ainda
  // em andamento em vez de barrar. Barrar quem já usava, por causa de uma
  // linha que nunca foi criada, seria punir o cliente por um defeito nosso.
  if (!assinatura) return { liberado: true, status: "SEM_ASSINATURA" }

  const agora = new Date()

  switch (assinatura.status) {
    case "ATIVA":
    case "PENDENTE":
      return { liberado: true, status: assinatura.status }

    case "TESTE": {
      const fim = assinatura.testeAteEm
      if (!fim || fim > agora) return { liberado: true, status: "TESTE", testeAteEm: fim }
      return { liberado: false, status: "TESTE", motivo: "TESTE_VENCIDO", testeAteEm: fim }
    }

    case "INADIMPLENTE": {
      const desde = assinatura.atualizadoEm
      const limite = new Date(desde.getTime() + CARENCIA_INADIMPLENTE_DIAS * 86_400_000)
      if (limite > agora) return { liberado: true, status: "INADIMPLENTE" }
      return { liberado: false, status: "INADIMPLENTE", motivo: "ATRASO" }
    }

    case "CANCELADA":
      return { liberado: false, status: "CANCELADA", motivo: "CANCELADA" }
  }
}

/**
 * Abre o período de teste no cadastro.
 *
 * A data fica gravada na linha, e não calculada a partir da criação do
 * usuário, porque o prazo é um parâmetro que o Davi muda no painel: quem
 * entrou com 14 dias tem 14, mesmo que amanhã o padrão vire 7.
 */
export async function abrirTeste(usuarioId: string) {
  const dias = await diasDeTesteVigentes()
  const ate = new Date(Date.now() + dias * 86_400_000)

  await prisma.assinatura.upsert({
    where: { usuarioId },
    create: {
      usuarioId,
      // Ainda não há provedor escolhido; ele é definido no checkout. O campo é
      // obrigatório no banco, então nasce no padrão e não significa nada até
      // a pessoa contratar.
      provedor: "MERCADO_PAGO",
      status: "TESTE",
      planoId: "pessoal",
      valorCentavos: 0,
      testeAteEm: ate,
    },
    update: {},
  })

  return ate
}
