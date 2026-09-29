/** Marca um chamado como resolvido (ou o reabre) e grava a resposta. */

import { NextResponse } from "next/server"

import { comAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { registrarAcaoDoAdmin } from "@/lib/erros"

type Contexto = { params: Promise<{ id: string }> }

export const PATCH = comAdmin<Contexto>(async (sessao, requisicao, contexto) => {
  const { id } = await contexto.params
  const dados = (await requisicao.json()) as { status?: "ABERTO" | "RESOLVIDO"; resposta?: string }

  const status = dados.status === "ABERTO" ? "ABERTO" : "RESOLVIDO"
  const antes = await prisma.chamado.findUnique({ where: { id }, select: { resposta: true, usuario: { select: { larId: true } } } })
  if (!antes) return NextResponse.json({ erro: "Não encontrado." }, { status: 404 })

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

  // Resposta nova ou mudada vira aviso dentro do app: sem isso a pessoa só
  // descobriria que foi respondida se voltasse à tela de suporte por acaso.
  const resposta = chamado.resposta?.trim()
  if (resposta && resposta !== antes.resposta?.trim()) {
    await prisma.alerta.create({
      data: {
        larId: antes.usuario.larId,
        tipo: "SUPORTE",
        titulo: "O suporte respondeu",
        texto: resposta.length > 160 ? `${resposta.slice(0, 157)}…` : resposta,
        acaoRota: "/configuracoes#meus-chamados",
        chave: `suporte:${chamado.id}:${Date.now()}`,
      },
    })
  }
  await registrarAcaoDoAdmin(sessao.usuarioId, resposta && resposta !== antes.resposta?.trim() ? "respondeu chamado" : `marcou chamado como ${status.toLowerCase()}`, chamado.usuarioId, chamado.id)

  return NextResponse.json(chamado)
})
