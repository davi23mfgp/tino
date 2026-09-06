import { sessaoDeAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { formatarMoeda } from "@/lib/dinheiro"
import { ROTULO_PROVEDOR, ROTULO_STATUS } from "@/lib/pagamento"
import { Cartao, Vazio } from "@/components/ui/painel"

/**
 * Lista de contas com a situação de cobrança de cada uma.
 *
 * A busca é por e-mail ou nome porque é o que o cliente informa quando escreve
 * pedindo ajuda. Ela vive na URL, e não em estado de componente: assim o link
 * de uma busca pode ser colado numa conversa com o próprio cliente.
 */

export const dynamic = "force-dynamic"

const POR_PAGINA = 50

export default async function ContasAdmin({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await sessaoDeAdmin()
  const { q } = await searchParams
  const busca = (q ?? "").trim()

  const usuarios = await prisma.usuario.findMany({
    where: busca
      ? {
          OR: [
            { email: { contains: busca, mode: "insensitive" } },
            { nome: { contains: busca, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { criadoEm: "desc" },
    take: POR_PAGINA,
    select: {
      id: true,
      nome: true,
      email: true,
      admin: true,
      criadoEm: true,
      ultimoLogin: true,
      assinatura: {
        select: { status: true, provedor: true, planoId: true, ciclo: true, valorCentavos: true, proximaCobrancaEm: true },
      },
      lar: { select: { nome: true, meiPerfil: { select: { id: true } } } },
    },
  })

  return (
    <div className="space-y-4">
      <Cartao titulo="Contas">
        <form method="get" className="mb-4 flex gap-2">
          <input
            name="q"
            defaultValue={busca}
            placeholder="e-mail ou nome"
            className="flex-1 rounded-[var(--raio-campo)] border border-pauta bg-background px-4 py-2.5 text-sm"
          />
          <button className="rounded-[var(--raio-pilula)] bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground">
            Buscar
          </button>
        </form>

        {usuarios.length === 0 ? (
          <Vazio titulo="Nenhuma conta encontrada" texto={busca ? `Nada bate com "${busca}".` : undefined} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-[13px]">
              <thead>
                <tr className="border-b border-pauta text-left text-[11px] uppercase tracking-widest text-muted-fg">
                  <th className="py-2 pr-3 font-normal">Conta</th>
                  <th className="py-2 pr-3 font-normal">Perfil</th>
                  <th className="py-2 pr-3 font-normal">Assinatura</th>
                  <th className="py-2 pr-3 font-normal">Provedor</th>
                  <th className="py-2 pr-3 text-right font-normal">Valor</th>
                  <th className="py-2 text-right font-normal">Próxima cobrança</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pauta">
                {usuarios.map((usuario) => (
                  <tr key={usuario.id}>
                    <td className="py-2.5 pr-3">
                      <p>
                        {usuario.nome}
                        {usuario.admin && (
                          <span className="ml-2 rounded-full border border-acao/40 px-2 py-0.5 text-[10px] uppercase tracking-wide text-acao">
                            admin
                          </span>
                        )}
                      </p>
                      <p className="text-[12px] text-muted-fg">{usuario.email}</p>
                    </td>
                    <td className="py-2.5 pr-3 text-muted-fg">
                      {usuario.lar.meiPerfil ? "MEI com loja" : "Pessoal"}
                    </td>
                    <td className="py-2.5 pr-3">
                      {usuario.assinatura ? (
                        <span
                          className={
                            usuario.assinatura.status === "ATIVA"
                              ? "text-positivo"
                              : usuario.assinatura.status === "INADIMPLENTE"
                                ? "text-negativo"
                                : "text-muted-fg"
                          }
                        >
                          {ROTULO_STATUS[usuario.assinatura.status]}
                        </span>
                      ) : (
                        <span className="text-muted-fg">sem assinatura</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-3 text-muted-fg">
                      {usuario.assinatura ? ROTULO_PROVEDOR[usuario.assinatura.provedor] : "—"}
                    </td>
                    <td className="numero py-2.5 pr-3 text-right">
                      {usuario.assinatura ? formatarMoeda(usuario.assinatura.valorCentavos) : "—"}
                    </td>
                    <td className="py-2.5 text-right text-muted-fg">
                      {usuario.assinatura?.proximaCobrancaEm
                        ? usuario.assinatura.proximaCobrancaEm.toLocaleDateString("pt-BR")
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-4 text-[12px] text-muted-fg">
          Mostrando até {POR_PAGINA} contas, das mais recentes para as mais antigas.
        </p>
      </Cartao>
    </div>
  )
}
