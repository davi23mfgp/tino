import type { Metadata } from "next"
import Cartoes from "../cartoes/page"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "Bancos e contas · Tino" }

/**
 * Bancos e contas: cadastro, um bloco por banco com a conta e o cartão dele.
 * Mora nos Ajustes (Davi, 19/10): no dia a dia, Cartões abre direto na fatura.
 */
export default function Bancos() {
  return Cartoes({ searchParams: Promise.resolve({ bancos: "1" }) })
}
