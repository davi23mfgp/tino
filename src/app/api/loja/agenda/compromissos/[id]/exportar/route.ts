import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { comSessao, ErroDeUso } from "@/lib/api"
import { lojaDoLar } from "@/lib/loja/dados"
import { diaNoFuso } from "@/lib/loja/contas"
import { arquivoIcs, linkGoogleAgenda } from "@/lib/loja/pedido-agenda"

export const dynamic = "force-dynamic"

/**
 * Leva o compromisso para a agenda da pessoa (item 3.2): `?formato=google`
 * abre o Google Agenda com o evento pronto; `?formato=ics` baixa o arquivo
 * que a agenda do iPhone e o Outlook abrem. Sem permissão do Google: a
 * integração que escreve sozinha espera a verificação do app.
 */
export const GET = comSessao<{ params: Promise<{ id: string }> }>(async (sessao, requisicao, contexto) => {
  const { id } = await contexto.params
  const loja = await lojaDoLar(sessao.larId)
  const compromisso = await prisma.compromissoLoja.findFirst({
    where: { id, lojaId: loja.id },
    select: { id: true, titulo: true, detalhe: true, inicioEm: true, diaInteiro: true, criadoEm: true, cliente: { select: { nome: true, telefone: true } } },
  })
  if (!compromisso) throw new ErroDeUso("Compromisso não encontrado.", 404)
  const lar = await prisma.lar.findUnique({ where: { id: sessao.larId }, select: { fusoHorario: true } })
  const detalhe = [compromisso.detalhe, compromisso.cliente ? `Cliente: ${compromisso.cliente.nome}${compromisso.cliente.telefone ? ` (${compromisso.cliente.telefone})` : ""}` : null, `Marcado no Tino, ${loja.nome}`].filter(Boolean).join("\n")
  const formato = new URL(requisicao.url).searchParams.get("formato")
  if (formato === "ics") {
    return new NextResponse(arquivoIcs({ id: compromisso.id, titulo: compromisso.titulo, inicio: compromisso.inicioEm, detalhe, local: loja.endereco ?? undefined, criadoEm: compromisso.criadoEm }), {
      headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `attachment; filename="compromisso-${compromisso.id}.ics"` },
    })
  }
  const link = linkGoogleAgenda({
    titulo: compromisso.titulo, inicio: compromisso.inicioEm, detalhe, local: loja.endereco ?? undefined,
    diaInteiro: compromisso.diaInteiro ? diaNoFuso(compromisso.inicioEm, lar?.fusoHorario ?? undefined) : null,
  })
  return NextResponse.redirect(link, 302)
})
