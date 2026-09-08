import Link from "next/link"

import { sessaoDeAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { FilaDeChamados, type ChamadoNaFila } from "@/app/admin/suporte/fila"

/**
 * Fila de chamados.
 *
 * Abertos primeiro, do mais antigo para o mais novo: quem esperou mais é
 * atendido antes. Ordenar por "mais recente" faria os chamados difíceis
 * afundarem para sempre — o defeito clássico de fila de suporte.
 */

export const dynamic = "force-dynamic"

export default async function SuporteAdmin({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await sessaoDeAdmin()
  const { status } = await searchParams
  const mostrarResolvidos = status === "resolvido"

  const chamados = await prisma.chamado.findMany({
    where: { status: mostrarResolvidos ? "RESOLVIDO" : "ABERTO" },
    orderBy: { criadoEm: mostrarResolvidos ? "desc" : "asc" },
    take: 100,
    include: { usuario: { select: { nome: true, email: true } } },
  })

  const paraTela: ChamadoNaFila[] = chamados.map((chamado) => ({
    id: chamado.id,
    tipo: chamado.tipo,
    status: chamado.status,
    mensagem: chamado.mensagem,
    rota: chamado.rota,
    resposta: chamado.resposta,
    criadoEm: chamado.criadoEm.toISOString(),
    usuario: chamado.usuario,
  }))

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Link
          href="/admin/suporte"
          className={`rounded-full border px-4 py-1.5 text-[13px] ${mostrarResolvidos ? "border-pauta text-muted-fg" : "border-acao/40 bg-acao/10 text-acao"}`}
        >
          Abertos
        </Link>
        <Link
          href="/admin/suporte?status=resolvido"
          className={`rounded-full border px-4 py-1.5 text-[13px] ${mostrarResolvidos ? "border-acao/40 bg-acao/10 text-acao" : "border-pauta text-muted-fg"}`}
        >
          Resolvidos
        </Link>
      </div>

      <FilaDeChamados chamados={paraTela} />
    </div>
  )
}
