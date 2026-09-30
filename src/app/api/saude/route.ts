import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { segredoConfere } from "@/lib/segredo"

export const dynamic = "force-dynamic"

/** O monitor externo detecta também queda do app: um cron dentro dele não consegue. */
export async function GET(requisicao: Request) {
  const segredo = process.env.MONITORAMENTO_SEGREDO
  const cabecalhos = { "Cache-Control": "no-store" }
  if (!segredo || !segredoConfere(requisicao.headers.get("authorization"), `Bearer ${segredo}`)) {
    return NextResponse.json({ estado: "nao-autorizado" }, { status: 401, headers: cabecalhos })
  }
  try {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SET LOCAL statement_timeout = '5000ms'`
      await tx.$queryRaw`SELECT 1`
    }, { timeout: 7000, maxWait: 2000 })
    return NextResponse.json({ estado: "ok" }, { headers: cabecalhos })
  } catch {
    return NextResponse.json({ estado: "indisponivel" }, { status: 503, headers: cabecalhos })
  }
}
