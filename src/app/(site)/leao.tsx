/**
 * O leão da vitrine.
 *
 * Mesma arte da marca de dentro do app (`/mascote/tino-leao-traco.png`),
 * aplicada como máscara: o desenho é tinta preta e sumiria sobre o fundo
 * escuro da página. Como máscara, a cor vem do `currentColor` de quem o usa,
 * então o mesmo arquivo serve ao cabeçalho, ao rodapé e ao mascote grande.
 *
 * São dois arquivos da mesma arte, escolhidos pelo tamanho: o traço original
 * some quando reduzido a 38px — a linha de 1px vira um cinza de 20% que o olho
 * lê como sujeira —, então a marca pequena usa uma versão com o traço
 * engrossado antes da redução. Acima de 64px o desenho original tem espaço
 * para se ler inteiro.
 *
 * Não há fallback como havia no porquinho: aqui o arquivo é servido de
 * `public/` pelo mesmo domínio da página, e não existe o caso "o render 3D
 * ainda não chegou" que justificava o desenho vetorial de reserva.
 */

const ARTE_MIUDA = "/mascote/tino-leao-marca.png"
const ARTE_GRANDE = "/mascote/tino-leao-traco.png"
export function Leao({
  tamanho,
  className,
  flutua = false,
}: {
  /** Altura do desenho em pixels; a largura acompanha a proporção da arte. */
  tamanho: number
  className?: string
  /** Liga a flutuação lenta. Respeita `prefers-reduced-motion` pelo CSS. */
  flutua?: boolean
}) {
  const classe = ["marca-leao", flutua ? "float-slow" : "", className].filter(Boolean).join(" ")
  const arte = tamanho <= 64 ? ARTE_MIUDA : ARTE_GRANDE
  return (
    <span
      role="img"
      aria-label="Tino, o leão do app: um leão de óculos redondos, desenhado a traço"
      className={classe}
      style={{
        width: Math.round(tamanho * 0.886),
        height: tamanho,
        maskImage: `url(${arte})`,
        WebkitMaskImage: `url(${arte})`,
      }}
    />
  )
}
