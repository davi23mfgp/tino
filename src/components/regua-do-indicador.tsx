import { cn } from "@/lib/utils"

/**
 * Onde o indicador caiu dentro da própria referência.
 *
 * Duas zonas pintadas — a boa e a de atenção — e um traço na posição do valor.
 * É a informação que a palavra da faixa esconde: a distância até a próxima
 * zona, que é o que diz se vale a pena agir agora.
 */
export function ReguaDoIndicador({
  numero,
  escala,
  cor,
}: {
  numero: number
  escala: { bom: number; atencao: number; maximo: number; menorMelhor: boolean }
  cor: string
}) {
  const posicao = (valor: number) => Math.max(0, Math.min(100, (valor / escala.maximo) * 100))
  const marca = posicao(numero)
  // Menor-melhor: a zona boa começa na esquerda e vai até `bom`. Maior-melhor:
  // ela começa em `bom` e vai até o fim da régua.
  const zonaBoa = escala.menorMelhor
    ? { left: 0, width: posicao(escala.bom) }
    : { left: posicao(escala.bom), width: 100 - posicao(escala.bom) }
  const zonaAtencao = escala.menorMelhor
    ? { left: posicao(escala.bom), width: posicao(escala.atencao) - posicao(escala.bom) }
    : { left: posicao(escala.atencao), width: posicao(escala.bom) - posicao(escala.atencao) }

  return (
    <div className="relative mt-2.5 h-1.5 rounded-full bg-papel-3" aria-hidden>
      <span className="absolute inset-y-0 rounded-full bg-positivo/35" style={{ left: `${zonaBoa.left}%`, width: `${zonaBoa.width}%` }} />
      <span className="absolute inset-y-0 bg-atencao/30" style={{ left: `${zonaAtencao.left}%`, width: `${Math.max(0, zonaAtencao.width)}%` }} />
      <span className={cn("absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-[color:var(--papel-1)]", cor.replace("text-", "bg-"))} style={{ left: `${marca}%` }} />
    </div>
  )
}
