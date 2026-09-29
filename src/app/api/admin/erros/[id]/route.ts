import { NextResponse } from "next/server"

import { comAdmin } from "@/lib/admin"
import { registrarAcaoDoAdmin } from "@/lib/erros"
import { prisma } from "@/lib/prisma"

type Contexto = { params: Promise<{ id: string }> }

/** Marca um erro como resolvido ou o reabre. Se ele voltar a acontecer, reabre sozinho. */
export const PATCH = comAdmin<Contexto>(async (sessao, requisicao, contexto) => {
  const { id } = await contexto.params
  const dados = (await requisicao.json()) as { status?: string }
  const status = dados.status === "NOVO" ? "NOVO" : "RESOLVIDO"
  const erro = await prisma.erroRegistrado.update({ where: { id }, data: { status } })
  await registrarAcaoDoAdmin(sessao.usuarioId, status === "RESOLVIDO" ? "marcou erro como resolvido" : "reabriu erro", null, erro.mensagem.slice(0, 120))
  return NextResponse.json({ id: erro.id, status: erro.status })
})
