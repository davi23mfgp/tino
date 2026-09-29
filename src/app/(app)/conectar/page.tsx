import { redirect } from "next/navigation"

/**
 * Entrada automática saiu (Davi, 28/09/2026: "não vamos ter Open Finance").
 *
 * A tela, desde 15/09, só listava os caminhos que já moram em Anotar e
 * Importar. O endereço continua existindo porque pode estar salvo em algum
 * atalho ou favorito; quem chega por ele cai em Anotar, onde ficam os jeitos
 * de o gasto entrar sem digitar. O código do provedor de Open Finance
 * (`src/lib/open-finance/`) fica no repositório, desligado.
 */
export default function EntradaAutomatica() {
  redirect("/capturas")
}
