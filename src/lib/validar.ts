/**
 * Validação de entrada.
 *
 * Regra da casa: nada que vem do cliente é confiável — nem o tipo, nem o
 * tamanho, nem o ID. O TypeScript de `corpo<T>()` só promete o formato para o
 * compilador; em tempo de execução chega o que o atacante quiser mandar.
 *
 * Três camadas:
 * 1. `validar(esquema, dados)` — formato e limites (zod). Falha vira 400 com o
 *    nome do campo, nunca com detalhe interno.
 * 2. `doLar(...)` — o ID pertence ao lar da sessão? Sem isso, um ID de outro lar
 *    colado no corpo grava dado na conta de outra pessoa.
 * 3. `regexSegura(...)` — regra com expressão regular escrita pelo usuário roda
 *    no servidor; um padrão catastrófico trava o processo para todo mundo.
 */

import { z } from "zod"

import { ErroDeUso } from "@/lib/api"
import { prisma } from "@/lib/prisma"

export { z }

export { campo, INT_MAX } from "@/lib/campos"

/**
 * Valida e devolve o dado já tipado e limpo (trim, coerção).
 *
 * A mensagem cita só o campo e o motivo curto — o suficiente para a pessoa
 * corrigir o formulário, e nada sobre como o servidor funciona por dentro.
 */
export function validar<T extends z.ZodType>(esquema: T, dados: unknown): z.infer<T> {
  const resultado = esquema.safeParse(dados)
  if (resultado.success) return resultado.data
  const primeiro = resultado.error.issues[0]
  const caminho = primeiro?.path.join(".") || "dados"
  throw new ErroDeUso(`Campo inválido: ${caminho}.`)
}

type ModeloDoLar = "conta" | "categoria" | "membro" | "meta"

/**
 * Garante que cada ID informado pertence ao lar da sessão.
 *
 * Aceita `null`/`undefined` (campo opcional não informado). Qualquer ID que não
 * seja do lar responde igual a ID inexistente, para não confirmar que o
 * registro existe em outra conta.
 */
export async function doLar(larId: string, referencias: Partial<Record<ModeloDoLar, string | null | undefined>>) {
  const checagens: Promise<unknown>[] = []
  const falhou = (rotulo: string) => {
    throw new ErroDeUso(`${rotulo} inválida.`)
  }
  const { conta, categoria, membro, meta } = referencias
  if (conta)
    checagens.push(
      prisma.conta.findFirst({ where: { id: conta, larId }, select: { id: true } }).then((r) => r ?? falhou("Conta")),
    )
  if (categoria)
    checagens.push(
      prisma.categoria
        .findFirst({ where: { id: categoria, larId }, select: { id: true } })
        .then((r) => r ?? falhou("Categoria")),
    )
  if (membro)
    checagens.push(
      prisma.membro.findFirst({ where: { id: membro, larId }, select: { id: true } }).then((r) => r ?? falhou("Pessoa")),
    )
  if (meta)
    checagens.push(
      prisma.meta.findFirst({ where: { id: meta, larId }, select: { id: true } }).then((r) => r ?? falhou("Meta")),
    )
  await Promise.all(checagens)
}

export { regexSegura } from "@/lib/regex-segura"
