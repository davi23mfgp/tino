import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { empurrar, pushConfigurado } from "@/lib/push"

export const dynamic = "force-dynamic"

/**
 * O lembrete diário que repõe o atalho de lançar na barra.
 *
 * Roda de hora em hora e acorda só quem marcou aquela hora. O corte é feito no
 * fuso do lar, não em UTC: quem escolheu "20h" quer 20h onde mora, e o Tino já
 * guarda `Lar.fusoHorario` justamente para isso.
 *
 * Protegido por `CRON_SECRET`. Sem isso, qualquer pessoa na internet poderia
 * chamar esta rota em laço e transformar o lembrete em spam no celular de
 * todo mundo — que é o jeito mais rápido de a pessoa desligar a notificação e
 * nunca mais voltar.
 */
export async function GET(requisicao: Request) {
  const segredo = process.env.CRON_SECRET
  const autorizacao = requisicao.headers.get("authorization")
  if (!segredo || autorizacao !== `Bearer ${segredo}`) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 })
  }

  if (!pushConfigurado()) {
    return NextResponse.json({ erro: "Push não configurado neste ambiente." }, { status: 503 })
  }

  const agora = new Date()
  const inscricoes = await prisma.inscricaoPush.findMany({
    include: { usuario: { select: { lar: { select: { fusoHorario: true } } } } },
  })

  let enviados = 0
  let pulados = 0

  for (const inscricao of inscricoes) {
    const fuso = inscricao.usuario.lar.fusoHorario || "America/Sao_Paulo"
    const horaLocal = Number(
      new Intl.DateTimeFormat("pt-BR", { timeZone: fuso, hour: "numeric", hour12: false }).format(agora),
    )
    if (horaLocal !== inscricao.hora) {
      pulados += 1
      continue
    }

    // Uma vez por dia. A rota roda de hora em hora e uma reexecução do cron
    // (ou um disparo manual) não pode render duas notificações iguais.
    const dia = new Intl.DateTimeFormat("pt-BR", { timeZone: fuso, dateStyle: "short" })
    if (inscricao.ultimoEnvio && dia.format(inscricao.ultimoEnvio) === dia.format(agora)) {
      pulados += 1
      continue
    }

    try {
      if (await empurrar(inscricao, { tipo: "atalho" })) enviados += 1
    } catch {
      // Falha de um aparelho não derruba a fila dos outros.
      pulados += 1
    }
  }

  return NextResponse.json({ enviados, pulados, total: inscricoes.length })
}
