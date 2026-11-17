import type { EtapaFunil } from "@prisma/client"

import { comPublica, corpo, ok, ErroDeUso } from "@/lib/api"
import { ETAPAS_ANONIMAS, produtoValido } from "@/lib/funil"
import { gravarEtapa } from "@/lib/funil-gravar"
import { REGRAS, consumirLimite, ipDaRequisicao } from "@/lib/limite"

/**
 * Etapas anônimas do funil: visita, clique em começar e cadastro aberto.
 * Pública porque quem ainda não tem conta é justamente quem se quer medir.
 * Aceita só as três etapas anônimas: criar conta e pagar o servidor grava
 * sozinho, senão qualquer um inflaria a conversão com uma chamada.
 */
export const POST = comPublica(async (requisicao) => {
  await consumirLimite(`funil:${ipDaRequisicao(requisicao)}`, REGRAS.funil)
  const dados = await corpo<{ etapa?: unknown; produto?: unknown }>(requisicao)
  if (!ETAPAS_ANONIMAS.includes(dados.etapa as EtapaFunil)) throw new ErroDeUso("Etapa desconhecida.")
  await gravarEtapa(dados.etapa as EtapaFunil, { produto: produtoValido(dados.produto) })
  return ok({ gravado: true })
})
