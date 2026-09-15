import { SemOpenFinance } from "@/components/sem-open-finance"

export const dynamic = "force-dynamic"

export const metadata = { title: "Entrada automática · Tino" }

/**
 * Como o gasto entra sozinho.
 *
 * Esta página era o convite do Open Finance. Em 15/09/2026 o Davi tirou o Open
 * Finance de cena por custo — o agregador é cobrado por conta conectada, e não
 * há assinante suficiente para pagar isso ainda. O código do provedor continua
 * no repositório (`src/lib/open-finance/`), desligado: quando houver dinheiro,
 * é só voltar a apontar esta rota para `TelaConectar`.
 *
 * Enquanto isso, a página mostra os caminhos que existem e custam zero.
 */
export default function EntradaAutomatica() {
  return <SemOpenFinance />
}
