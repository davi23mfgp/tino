import { Archivo, Schibsted_Grotesk } from "next/font/google"

/**
 * A tipografia da vitrine — e SÓ da vitrine.
 *
 * O app usa a pilha do sistema (`--font-ios` em `globals.css`), decisão da
 * skin acromática que continua valendo lá dentro. Aqui fora é outra
 * conversa: a página que vende é a única que precisa ter voz própria antes
 * de a pessoa ver um número sequer.
 *
 * `Archivo` no eixo LARGO (`wdth` 112) é a escolha que carrega a
 * personalidade. A referência que o Davi mandou (lp.pierre.finance) usa
 * Geist, a fonte padrão da Vercel — copiar ela seria entregar a mesma cara
 * que metade das landings de tecnologia tem. Largo com tracking apertado é o
 * oposto do grotesco neutro e estreito: ocupa a linha inteira com poucas
 * palavras, que é exatamente o que um título de três palavras precisa.
 *
 * `Schibsted Grotesk` no corpo: humanista, um grau mais quente que o Inter,
 * sem chamar atenção para si.
 */

export const fonteDisplay = Archivo({
  subsets: ["latin"],
  // Sem `weight`: com o eixo `wdth` declarado, a fonte vem variável e os dois
  // eixos (peso e largura) passam a ser ajustáveis por CSS
  // (`font-variation-settings`). Declarar pesos fixos aqui é o que o Next
  // recusa — e perderia justamente a largura, que é a escolha do projeto.
  axes: ["wdth"],
  variable: "--fonte-display",
  display: "swap",
})

export const fonteCorpo = Schibsted_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--fonte-corpo",
  display: "swap",
})
