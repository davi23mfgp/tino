import { sessaoDeAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { formatarMoeda } from "@/lib/dinheiro"
import { ROTULO_PROVEDOR } from "@/lib/pagamento"
import { Cartao, Metrica, Vazio } from "@/components/ui/painel"

/**
 * Histórico de cobrança dos dois gateways, na mesma tabela.
 *
 * Duas telas — uma por provedor — obrigariam a somar de cabeça para responder
 * "quanto entrou este mês". A coluna do provedor resolve isso sem separar a
 * leitura.
 *
 * As falhas vêm primeiro, em bloco próprio: é a única parte desta tela que
 * pede ação, e ela some no meio de cem linhas de cobrança bem-sucedida.
 */

export const dynamic = "force-dynamic"

const ROTULO_COBRANCA = {
  PENDENTE: "aguardando",
  PAGA: "paga",
  FALHOU: "recusada",
  ESTORNADA: "estornada",
} as const

export default async function PagamentosAdmin() {
  await sessaoDeAdmin()

  const inicioDoMes = new Date()
  inicioDoMes.setUTCDate(1)
  inicioDoMes.setUTCHours(0, 0, 0, 0)

  const [cobrancas, falhas, recebidoNoMes] = await Promise.all([
    prisma.cobranca.findMany({
      orderBy: { criadoEm: "desc" },
      take: 100,
      include: { assinatura: { select: { planoId: true, usuario: { select: { nome: true, email: true } } } } },
    }),
    prisma.cobranca.findMany({
      where: { status: "FALHOU" },
      orderBy: { criadoEm: "desc" },
      take: 20,
      include: { assinatura: { select: { usuario: { select: { nome: true, email: true } } } } },
    }),
    prisma.cobranca.aggregate({
      where: { status: "PAGA", pagaEm: { gte: inicioDoMes } },
      _sum: { valorCentavos: true },
    }),
  ])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Metrica
          rotulo="Recebido no mês"
          valor={formatarMoeda(recebidoNoMes._sum.valorCentavos ?? 0)}
          detalhe="Soma das cobranças pagas desde o dia 1"
          tom={(recebidoNoMes._sum.valorCentavos ?? 0) > 0 ? "positivo" : "neutro"}
        />
        <Metrica
          rotulo="Recusas em aberto"
          valor={String(falhas.length)}
          detalhe="Cada uma é um cliente que pode cancelar sozinho"
          tom={falhas.length > 0 ? "negativo" : "neutro"}
        />
        <Metrica rotulo="Cobranças registradas" valor={String(cobrancas.length)} detalhe="Últimas 100, dos dois gateways" />
      </div>

      {falhas.length > 0 && (
        <Cartao titulo="Pagamentos recusados">
          <div className="divide-y divide-pauta">
            {falhas.map((falha) => (
              <div key={falha.id} className="flex flex-wrap items-start justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-[13px]">{falha.assinatura.usuario.nome}</p>
                  <p className="text-[12px] text-muted-fg">
                    {falha.assinatura.usuario.email} · {ROTULO_PROVEDOR[falha.provedor]} ·{" "}
                    {falha.criadoEm.toLocaleDateString("pt-BR")}
                  </p>
                  <p className="mt-0.5 text-[12px] text-negativo">
                    {falha.motivoFalha ?? "O provedor não informou o motivo."}
                  </p>
                </div>
                <span className="numero text-[13px] text-negativo">{formatarMoeda(falha.valorCentavos)}</span>
              </div>
            ))}
          </div>
        </Cartao>
      )}

      <Cartao titulo="Todas as cobranças">
        {cobrancas.length === 0 ? (
          <Vazio
            titulo="Nenhuma cobrança ainda"
            texto="As linhas aparecem quando o webhook do provedor confirmar o primeiro pagamento."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-[13px]">
              <thead>
                <tr className="border-b border-pauta text-left text-[11px] uppercase tracking-widest text-muted-fg">
                  <th className="py-2 pr-3 font-normal">Data</th>
                  <th className="py-2 pr-3 font-normal">Cliente</th>
                  <th className="py-2 pr-3 font-normal">Plano</th>
                  <th className="py-2 pr-3 font-normal">Gateway</th>
                  <th className="py-2 pr-3 font-normal">Situação</th>
                  <th className="py-2 text-right font-normal">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pauta">
                {cobrancas.map((cobranca) => (
                  <tr key={cobranca.id}>
                    <td className="py-2.5 pr-3 text-muted-fg">{cobranca.criadoEm.toLocaleDateString("pt-BR")}</td>
                    <td className="py-2.5 pr-3">
                      <p>{cobranca.assinatura.usuario.nome}</p>
                      <p className="text-[12px] text-muted-fg">{cobranca.assinatura.usuario.email}</p>
                    </td>
                    <td className="py-2.5 pr-3 text-muted-fg">{cobranca.assinatura.planoId}</td>
                    <td className="py-2.5 pr-3 text-muted-fg">{ROTULO_PROVEDOR[cobranca.provedor]}</td>
                    <td
                      className={`py-2.5 pr-3 ${cobranca.status === "PAGA" ? "text-positivo" : cobranca.status === "FALHOU" ? "text-negativo" : "text-muted-fg"}`}
                    >
                      {ROTULO_COBRANCA[cobranca.status]}
                    </td>
                    <td className="numero py-2.5 text-right">{formatarMoeda(cobranca.valorCentavos)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Cartao>
    </div>
  )
}
