/**
 * Campos de entrada (dinheiro, taxa, dia, data), sem nada de servidor.
 *
 * Separado de `validar.ts` para poder ser testado sozinho: `validar.ts` puxa a
 * sessão e o banco, que só existem dentro do Next.
 */

import { z } from "zod"

/** Maior valor que cabe num `Int` do Postgres. */
export const INT_MAX = 2_147_483_647

/**
 * Número que veio do cliente, sem inventar valor.
 *
 * `z.coerce.number()` fazia `null` e `""` virarem 0, e `true` virar 1: um valor
 * ou uma taxa que a pessoa não preencheu passava como zero de verdade (regra 3,
 * auditoria de 10/11/2026). Aqui só número ou texto numérico vira número;
 * vazio vira "não veio" (o obrigatório recusa, o opcional fica ausente), e
 * `null` continua `null` para quem aceita `.nullish()`.
 */
function numeroDoCliente(valor: unknown): unknown {
  if (typeof valor === "number") return valor
  if (typeof valor === "string") {
    const texto = valor.trim()
    if (!texto) return undefined
    return /^-?\d+(\.\d+)?$/.test(texto) ? Number(texto) : valor
  }
  return valor
}

/** Data do cliente: vazio não vira 1º de janeiro de 1970. */
function dataDoCliente(valor: unknown): unknown {
  if (valor instanceof Date) return valor
  if (typeof valor === "string") return valor.trim() ? new Date(valor) : undefined
  if (typeof valor === "number") return new Date(valor)
  return valor
}

export const campo = {
  /** ID gerado pelo Prisma (cuid). Não aceita qualquer texto: limita o que vai para a consulta. */
  id: () => z.string().trim().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/, "identificador inválido"),
  texto: (maximo = 200) => z.string().trim().max(maximo),
  textoObrigatorio: (maximo = 200) => z.string().trim().min(1).max(maximo),
  /** Dinheiro em centavos: inteiro, não negativo, dentro de `Int`. */
  centavos: () => z.preprocess(numeroDoCliente, z.number().int().min(0).max(INT_MAX)),
  /** Taxa em pontos-base: 0 a 100.000 (1.000% a.m. já é absurdo; acima disso é erro de digitação). */
  bps: () => z.preprocess(numeroDoCliente, z.number().int().min(0).max(100_000)),
  dia: () => z.preprocess(numeroDoCliente, z.number().int().min(1).max(31)),
  inteiro: (min = 0, max = INT_MAX) => z.preprocess(numeroDoCliente, z.number().int().min(min).max(max)),
  data: () => z.preprocess(dataDoCliente, z.date().refine((d) => !Number.isNaN(d.getTime()), "data inválida")),
  competencia: () => z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "use AAAA-MM"),
  email: () => z.string().trim().toLowerCase().max(254).email(),
}

