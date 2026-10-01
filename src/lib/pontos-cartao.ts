import { z } from "zod"

export const configuracaoPontos = z.object({
  programa: z.string().trim().min(1).max(80),
  unidade: z.enum(["pontos", "milhas"]),
  moeda: z.enum(["real", "dolar"]),
  taxaMilesimos: z.number().int().min(0).max(1000000),
  saldoAtual: z.number().int().min(0).max(2147483647).nullable(),
  cambioMilesimos: z.number().int().min(1).max(1000000).nullable(),
}).strict()
export type ConfiguracaoPontos = z.infer<typeof configuracaoPontos>

/** Créditos reduzem a base; parcelas previstas ficam separadas das compras. */
export function calcularPontos(gastosCentavos: number, creditosCentavos: number, regra: ConfiguracaoPontos, cambio: number | null): number | null {
  if (regra.moeda === "dolar" && (!cambio || !Number.isFinite(cambio) || cambio <= 0)) return null
  const base = Math.max(0, gastosCentavos - creditosCentavos) / 100
  return Math.floor(base / (regra.moeda === "dolar" ? cambio! : 1) * regra.taxaMilesimos / 1000)
}
