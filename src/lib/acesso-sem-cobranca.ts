import type { EstadoDoAcesso } from "@/lib/acesso-assinatura"

/**
 * Enquanto não existe como pagar, não existe bloqueio por falta de pagamento.
 *
 * Davi, 18/10/2026: "libere as contas após os 14 dias, só deixe válido quando
 * estiver ativo os pagamentos". Barrar quem não tem por onde pagar não cobra
 * ninguém, só afasta cliente. O corte volta sozinho quando a chave do Mercado
 * Pago ou da Stripe entra no ambiente.
 *
 * Fica em arquivo à parte, sem banco, para o teste poder provar a regra.
 */
export function liberarSeNaoHaCobranca(estado: EstadoDoAcesso, cobrancaLigada: boolean): EstadoDoAcesso {
  if (estado.liberado || cobrancaLigada) return estado
  return { liberado: true, status: estado.status, testeAteEm: estado.testeAteEm }
}
