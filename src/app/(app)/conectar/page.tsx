import { sessaoDaPagina } from "@/lib/pagina"
import { estadoOpenFinance } from "@/lib/open-finance/provedor"

import { TelaConectar } from "./tela-conectar"

export const dynamic = "force-dynamic"

export const metadata = { title: "Conectar banco · Tino" }

/**
 * Conectar banco (Open Finance).
 *
 * O estado vem do servidor para a primeira pintura já sair certa: quem tem
 * banco ligado nunca vê o convite piscar antes da lista de contas.
 */
export default async function ConectarPagina() {
  const sessao = await sessaoDaPagina()
  const estado = await estadoOpenFinance(sessao.larId)

  return <TelaConectar inicial={estado} />
}
