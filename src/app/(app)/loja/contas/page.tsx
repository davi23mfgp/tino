import { prepararDados } from "@/lib/dados-iniciais"
import { Semente } from "@/components/semente"
import { ContasDaLoja } from "./tela"

/** Contas a pagar da loja chega com os dados da primeira pintura (auditoria, achado 31; ver `lib/dados-iniciais.ts`). */
export default async function Pagina() {
  return (
    <Semente dados={await prepararDados(["/api/loja/contas"])}>
      <ContasDaLoja />
    </Semente>
  )
}
