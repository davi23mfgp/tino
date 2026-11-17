import { prepararDados } from "@/lib/dados-iniciais"
import { Semente } from "@/components/semente"
import { Balcao } from "./tela"

/** Chega com os dados da primeira pintura (auditoria, achado 31; ver `lib/dados-iniciais.ts`). */
export default async function Pagina() {
  return (
    <Semente dados={await prepararDados(["/api/loja"])}>
      <Balcao />
    </Semente>
  )
}
