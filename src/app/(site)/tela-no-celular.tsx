import Image from "next/image"

/** Capturas do app rodando, exclusivamente com a conta de demonstracao.
 * Atualizar depois de alterar o sistema. Nunca usar dados de clientes reais.
 */
export type QualTela = "inicio" | "movimento" | "cartoes"
const TELAS = {
  inicio: {imagem:"/landing/tino-painel.png",alt:"Início do Tino: saldo das contas, entradas, saídas e próximas contas. Dados de demonstração."},
  movimento: {imagem:"/landing/tino-transacoes.png",alt:"Extrato do Tino: pesquisa, resumo e lista de lançamentos. Dados de demonstração."},
  cartoes: {imagem:"/landing/tino-cartoes.png",alt:"Cartões do Tino: faturas e limites. Dados de demonstração."},
}
export function TelaNoCelular({tela="inicio"}:{tela?:QualTela}) {
  const {imagem,alt}=TELAS[tela]
  return <div className="celular actual-device">
    <div className="actual-device-screen"><Image src={imagem} width={390} height={844} alt={alt} sizes="(max-width:700px) 280px, 310px" /></div>
  </div>
}
