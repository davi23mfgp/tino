import { competenciaAtual } from "@/lib/datas"
import { prepararDados } from "@/lib/dados-iniciais"
import { Semente } from "@/components/semente"
import { enderecoInicial } from "@/lib/extrato-endereco"
import { Extrato } from "./extrato"

/**
 * O Extrato chega pronto (auditoria, achado 31): o servidor busca a primeira
 * página, as contas, as categorias e os pontos dos dias, e a tela pinta com
 * eles. Antes, a pessoa via "Carregando…" enquanto o navegador pedia tudo.
 */
export default async function Transacoes() {
  const competencia = competenciaAtual()
  const dados = await prepararDados([
    enderecoInicial(competencia),
    "/api/contas",
    "/api/categorias",
    `/api/transacoes/dias?competencia=${competencia}`,
  ])
  return (
    <Semente dados={dados}>
      <Extrato competenciaInicial={competencia} />
    </Semente>
  )
}
