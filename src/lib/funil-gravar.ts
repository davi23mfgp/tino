import type { EtapaFunil, Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"

/**
 * Grava uma etapa do funil. Nunca lança: medir não pode derrubar o cadastro
 * nem o pagamento. Com usuário, a etapa vale uma vez por pessoa (único no
 * banco), então repetir a chamada não infla o número.
 */
export async function gravarEtapa(etapa: EtapaFunil, dados: { produto?: string | null; usuarioId?: string | null } = {}, banco: Prisma.TransactionClient = prisma) {
  try {
    if (dados.usuarioId) {
      await banco.eventoFunil.upsert({
        where: { etapa_usuarioId: { etapa, usuarioId: dados.usuarioId } },
        create: { etapa, produto: dados.produto ?? null, usuarioId: dados.usuarioId },
        update: {},
      })
    } else {
      await banco.eventoFunil.create({ data: { etapa, produto: dados.produto ?? null } })
    }
  } catch (excecao) {
    console.error("[tino] funil não gravou", etapa, excecao instanceof Error ? excecao.name : "Erro")
  }
}
