import { prepararDados } from "@/lib/dados-iniciais"
import { Semente } from "@/components/semente"
import { Capturas } from "./tela"

/** Anotar (a fila de conferência) chega com os dados da primeira pintura (auditoria, achado 31; ver `lib/dados-iniciais.ts`). */
export default async function Pagina() {
  return (
    <Semente dados={await prepararDados(["/api/capturas", "/api/contas", "/api/categorias"])}>
      <Capturas />
    </Semente>
  )
}
