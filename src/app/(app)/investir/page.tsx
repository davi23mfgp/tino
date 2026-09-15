import { CarteiraInvestimentos } from "@/components/carteira-investimentos"

export const dynamic = "force-dynamic"

/**
 * Investimentos.
 *
 * A tela era três coisas dentro de uma: a carteira, a simulação de "e se eu
 * guardar um pouco por mês" e a divisão sugerida da renda. O Davi separou em
 * 15/09/2026, e ele tem razão — as três respondem perguntas diferentes, em
 * momentos diferentes:
 *
 * - **Aqui:** o que eu tenho, em que estou, e o quanto de cada coisa.
 * - **`/simulador`:** o que muda se eu guardar X por mês (é simulação, e o
 *   simulador é onde se simula).
 * - **`/orcamento`:** para onde vai cada parte da renda (é decisão de
 *   orçamento, não de carteira).
 *
 * Misturar as três fazia a carteira — que é o assunto da tela — dividir espaço
 * com duas calculadoras.
 */
export default function Investir() {
  return <CarteiraInvestimentos />
}
