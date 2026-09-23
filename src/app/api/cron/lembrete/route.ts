import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { empurrar, pushConfigurado } from "@/lib/push"
import { segredoConfere } from "@/lib/segredo"
import { expurgarRegistrosVencidos } from "@/lib/registro-acesso"

export const dynamic = "force-dynamic"

/**
 * O lembrete diário que repõe o atalho de lançar na barra.
 *
 * Agendamento: `vercel.json` dispara `0 23 * * *` — 23h UTC, que é 20h em São
 * Paulo, a hora padrão do lembrete. O plano gratuito da Vercel só aceita um
 * disparo por dia; a coluna `hora` da inscrição já existe e passa a valer
 * sozinha no dia em que este agendamento virar de hora em hora (`0 * * * *`).
 *
 * Acorda só quem marcou aquela hora. O corte é feito no
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
  if (!segredo || !segredoConfere(autorizacao, `Bearer ${segredo}`)) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 })
  }

  // Faxina diária que não depende do push: registro de acesso com mais de 6
  // meses (Marco Civil) e contador de tentativa vencido há mais de um dia.
  await expurgarRegistrosVencidos()
  await prisma.limiteAcesso.deleteMany({
    where: { janelaInicio: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
  })

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
