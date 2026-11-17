import type { EtapaFunil } from "@prisma/client"

import { sessaoDeAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { formatarPercentual } from "@/lib/dinheiro"
import { montarFunil } from "@/lib/funil"
import { Cartao } from "@/components/ui/painel"

/**
 * O funil dos últimos 30 dias, um por produto (achado 14).
 *
 * Mostra quantos passaram por cada etapa e quanto da etapa anterior chegou
 * ali. A passagem é a referência: 2% de quem visitou criando conta não diz
 * nada sozinho, mas a etapa onde a passagem despenca diz onde mexer.
 */

export const dynamic = "force-dynamic"

const JANELA_DIAS = 30

export default async function FunilAdmin() {
  await sessaoDeAdmin()
  const desde = new Date(Date.now() - JANELA_DIAS * 86_400_000)

  const grupos = await prisma.eventoFunil.groupBy({ by: ["produto", "etapa"], where: { criadoEm: { gte: desde } }, _count: { _all: true } })
  const contagem = (produto: string | null) =>
    Object.fromEntries(grupos.filter((linha) => linha.produto === produto).map((linha) => [linha.etapa, linha._count._all])) as Partial<Record<EtapaFunil, number>>

  // A assinatura e o roteiro não sabem o produto; entram num quadro próprio.
  const quadros = [
    { titulo: "Tino pessoal", funil: montarFunil(contagem("pessoal")) },
    { titulo: "Tino MEI", funil: montarFunil(contagem("mei")) },
    { titulo: "Sem produto (roteiro e pagamento)", funil: montarFunil(contagem(null)) },
  ]

  return (
    <div className="space-y-4">
      <p className="text-[calc(13px*var(--escala-letra))] text-muted-fg">
        Últimos {JANELA_DIAS} dias. Medição própria, sem cookie e sem ferramenta de terceiros. Visita conta uma vez por aba aberta.
      </p>
      {quadros.map((quadro) => (
        <Cartao key={quadro.titulo} titulo={quadro.titulo} estatico>
          <table className="w-full text-[calc(14px*var(--escala-letra))]">
            <thead>
              <tr className="text-left text-muted-fg">
                <th className="py-2 font-medium">Etapa</th>
                <th className="py-2 text-right font-medium">Pessoas</th>
                <th className="py-2 text-right font-medium">Da etapa anterior</th>
              </tr>
            </thead>
            <tbody>
              {quadro.funil.map((linha) => (
                <tr key={linha.etapa} className="border-t border-pauta">
                  <td className="py-2">{linha.nome}</td>
                  <td className="numero py-2 text-right">{linha.total}</td>
                  <td className="numero py-2 text-right text-muted-fg">{linha.daAnteriorBps === null ? "sem base" : formatarPercentual(linha.daAnteriorBps)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Cartao>
      ))}
    </div>
  )
}
