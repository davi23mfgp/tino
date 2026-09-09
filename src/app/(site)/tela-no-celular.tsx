import Image from "next/image"
import inicio from "../../../public/landing/tino-painel.png"
import movimento from "../../../public/landing/tino-transacoes.png"
import cartoes from "../../../public/landing/tino-cartoes.png"

/** Capturas do app rodando, exclusivamente com a conta de demonstracao.
 * Atualizar depois de alterar o sistema. Nunca usar dados de clientes reais.
 */
export type QualTela = "inicio" | "movimento" | "cartoes"
const TELAS = {
  inicio: {imagem:inicio,alt:"Início do Tino: saldo das contas, entradas, saídas e próximas contas. Dados de demonstração."},
  movimento: {imagem:movimento,alt:"Extrato do Tino: pesquisa, resumo e lista de lançamentos. Dados de demonstração."},
  cartoes: {imagem:cartoes,alt:"Cartões do Tino: faturas e limites. Dados de demonstração."},
}
export function TelaNoCelular({tela="inicio"}:{tela?:QualTela}) {
  const {imagem,alt}=TELAS[tela]
  return <div className="celular actual-device">
    <div className="actual-device-screen"><Image src={imagem} width={390} height={844} alt={alt} sizes="(max-width:700px) 280px, 310px" /></div>
  </div>
}
