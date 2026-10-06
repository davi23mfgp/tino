/**
 * O que o editor de orçamento manda, validado igual na criação e na edição.
 * Fica fora das rotas porque o Next só aceita os métodos HTTP exportados de
 * um arquivo de rota.
 */

import { diaNoFuso } from "@/lib/loja/contas"
import { campo, z } from "@/lib/validar"

export const ESQUEMA_ITENS = z
  .array(
    z.object({
      produtoId: campo.id().optional(),
      servicoId: campo.id().optional(),
      descricao: campo.textoObrigatorio(120),
      quantidade: campo.inteiro(1, 100_000),
      precoUnitarioCentavos: campo.centavos(),
    }),
  )
  .min(1)
  .max(200)

export const ESQUEMA_CONDICOES = {
  descontoCentavos: campo.centavos().optional(),
  entradaCentavos: campo.centavos().nullable().optional(),
  parcelas: campo.inteiro(1, 24).optional(),
  validadeDias: campo.inteiro(1, 90).optional(),
  observacao: campo.texto(500).optional(),
}

/** Último dia de validade: hoje no fuso do lar mais N dias, à meia-noite UTC. */
export function validadeAPartirDeHoje(dias: number, fuso?: string, agora = new Date()) {
  const hoje = Date.parse(`${diaNoFuso(agora, fuso)}T00:00:00Z`)
  return new Date(hoje + dias * 86_400_000)
}
