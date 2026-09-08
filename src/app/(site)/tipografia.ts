import { Manrope, Space_Grotesk } from "next/font/google"

/**
 * A tipografia da vitrine — e SÓ da vitrine.
 *
 * O app usa a pilha do sistema (`--font-ios` em `globals.css`), decisão da
 * skin acromática que continua valendo lá dentro. Aqui fora é outra
 * conversa: a página que vende é a única que precisa ter voz própria antes
 * de a pessoa ver um número sequer.
 *
 * `Space Grotesk` nos títulos e `Manrope` no texto, os dois pedidos no brief.
 * Carregados por `next/font` e não por `<link>` na cabeça da rota: é o
 * equivalente no Next, e melhor — a fonte é servida do nosso próprio domínio
 * com `font-display: swap` e o CSS entra no primeiro HTML, sem a requisição
 * extra ao Google e sem o salto de fonte que o `<link>` deixa acontecer. O
 * que o brief proíbe de verdade — `@import` de URL dentro do CSS — continua
 * proibido, e não existe em lugar nenhum aqui.
 */

export const fonteDisplay = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--fonte-display",
  display: "swap",
})

export const fonteCorpo = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--fonte-corpo",
  display: "swap",
})
