/** Marca um chamado como resolvido (ou o reabre) e grava a resposta. */

import { NextResponse } from "next/server"

import { comAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"

type Contexto = { params: Promise<{ id: string }> }

export const PATCH = comAdmin<Contexto>(async (_sessao, requisicao, contexto) => {
  const { id } = await contexto.params
  const dados = (await requisicao.json()) as { status?: "ABERTO" | "RESOLVIDO"; resposta?: string }

  const status = dados.status === "ABERTO" ? "ABERTO" : "RESOLVIDO"

  const chamado = await prisma.chamado.update({
    where: { id },
    data: {
      status,
      // Reabrir limpa a data: um chamado aberto com data de resolução no
      // histórico é a linha que ninguém sabe interpretar depois.
      resolvidoEm: status === "RESOLVIDO" ? new Date() : null,
      ...(dados.resposta !== undefined ? { resposta: dados.resposta.slice(0, 4000) || null } : {}),
    },
  })

  return NextResponse.json(chamado)
})
