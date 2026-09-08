/**
 * Parâmetros globais do produto.
 *
 * Números que mudam por decisão de negócio ou por lei — preço de plano, teto de
 * juros do cheque especial, dias de teste — viviam em constante no código.
 * Mudar qualquer um exigia commit, build e deploy, e no intervalo o valor da
 * propaganda divergia do valor cobrado.
 *
 * O padrão continua no código: é ele que roda quando o banco não responde e é
 * ele que documenta qual era o número original. O banco só guarda o que foi
 * mudado, com quem mudou.
 */

import type { CicloCobranca } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { PLANOS, type Plano } from "@/lib/planos"

export type UnidadeParametro = "centavos" | "bps" | "dias"

export interface DefinicaoParametro {
  chave: string
  rotulo: string
  /// Por que este número existe. Sem isso, quem edita daqui a um ano muda o
  /// teto do cheque especial achando que é a taxa média do mercado.
  descricao: string
  unidade: UnidadeParametro
  padrao: number
}

/**
 * Tudo o que o admin pode editar sem deploy.
 *
 * A lista é fechada de propósito: parâmetro de texto livre viraria um
 * armazenamento de qualquer coisa, e ninguém saberia mais o que o app lê.
 */
export const PARAMETROS: DefinicaoParametro[] = [
  {
    chave: "juros.chequeEspecialBps",
    rotulo: "Teto do cheque especial",
    descricao:
      "Juros ao mês usado quando o usuário não informa a taxa do contrato dele. É o teto legal de 8% a.m. — se o Banco Central mudar, muda aqui.",
    unidade: "bps",
    padrao: 800,
  },
  {
    chave: "juros.rotativoBps",
    rotulo: "Juros do rotativo do cartão",
    descricao: "Taxa usada no plano de pagamento quando a fatura não é paga inteira e o usuário não informou a dele.",
    unidade: "bps",
    padrao: 1400,
  },
  {
    chave: "assinatura.diasDeTeste",
    rotulo: "Dias de teste",
    descricao: "Quanto tempo a conta nova usa o app antes de precisar pagar. A landing mostra este número.",
    unidade: "dias",
    padrao: 14,
  },
  ...PLANOS.flatMap((linha): DefinicaoParametro[] => [
    {
      chave: `plano.${linha.codigo}.mensalCentavos`,
      rotulo: `Preço mensal — ${linha.nome}`,
      descricao: "Cobrado todo mês. Quem já assinou continua no valor que contratou.",
      unidade: "centavos",
      padrao: linha.mensalCentavos,
    },
    {
      chave: `plano.${linha.codigo}.anualCentavos`,
      rotulo: `Preço anual — ${linha.nome}`,
      descricao: "Cobrado de uma vez, por doze meses.",
      unidade: "centavos",
      padrao: linha.anualCentavos,
    },
  ]),
]

const PADROES: Record<string, number> = Object.fromEntries(
  PARAMETROS.map((definicao) => [definicao.chave, definicao.padrao]),
)

/**
 * Os valores em vigor, com o padrão preenchendo o que nunca foi editado.
 *
 * Falha de banco devolve os padrões em vez de derrubar a tela: um parâmetro
 * indisponível não pode tirar do ar a página que vende o produto.
 */
export async function valoresVigentes(): Promise<Record<string, number>> {
  try {
    const gravados = await prisma.parametroSistema.findMany()
    const valores = { ...PADROES }

    for (const linha of gravados) {
      const numero = Number(linha.valor)
      // Valor ilegível no banco é ignorado em favor do padrão. Um NaN vazando
      // daqui viraria "R$ NaN" na página de preço.
      if (Number.isFinite(numero) && linha.chave in valores) valores[linha.chave] = numero
    }

    return valores
  } catch {
    return { ...PADROES }
  }
}

/** Um parâmetro só, para quem não precisa da tabela inteira. */
export async function valorVigente(chave: string): Promise<number> {
  const valores = await valoresVigentes()
  return valores[chave] ?? PADROES[chave] ?? 0
}

/** Preço em vigor de um plano, já considerando o que o admin editou. */
export function precoVigenteCentavos(linha: Plano, ciclo: CicloCobranca, valores?: Record<string, number>): number {
  const campo = ciclo === "ANUAL" ? "anualCentavos" : "mensalCentavos"
  const chave = `plano.${linha.codigo}.${campo}`
  if (valores) return valores[chave] ?? linha[campo]
  return linha[campo]
}

export interface PlanoVigente extends Plano {
  /// Verdadeiro quando o preço na tela não é o do arquivo — o admin mudou.
  precoEditado: boolean
}

/**
 * Os planos como o cliente os vê hoje.
 *
 * A landing e a tela de assinatura leem daqui, nunca de `PLANOS` direto: o
 * preço anunciado e o preço cobrado têm de sair da mesma fonte, senão o cliente
 * vê um valor na propaganda e outro na hora de pagar.
 */
export async function planosVigentes(): Promise<PlanoVigente[]> {
  const valores = await valoresVigentes()

  return PLANOS.map((linha) => {
    const mensalCentavos = valores[`plano.${linha.codigo}.mensalCentavos`] ?? linha.mensalCentavos
    const anualCentavos = valores[`plano.${linha.codigo}.anualCentavos`] ?? linha.anualCentavos

    return {
      ...linha,
      mensalCentavos,
      anualCentavos,
      precoEditado: mensalCentavos !== linha.mensalCentavos || anualCentavos !== linha.anualCentavos,
    }
  })
}

export async function diasDeTesteVigentes(): Promise<number> {
  return valorVigente("assinatura.diasDeTeste")
}

/** Grava um parâmetro. Só o admin chega aqui — o guard está na rota. */
export async function gravarParametro(chave: string, valor: number, quem: string) {
  const definicao = PARAMETROS.find((linha) => linha.chave === chave)
  if (!definicao) throw new Error(`Parâmetro desconhecido: ${chave}`)
  if (!Number.isFinite(valor) || !Number.isInteger(valor) || valor < 0) {
    throw new Error("Valor precisa ser um número inteiro não negativo.")
  }

  await prisma.parametroSistema.upsert({
    where: { chave },
    create: { chave, valor: String(valor), descricao: definicao.rotulo, atualizadoPor: quem },
    update: { valor: String(valor), atualizadoPor: quem },
  })
}

/** Devolve o parâmetro ao valor de código, apagando a linha do banco. */
export async function restaurarParametro(chave: string) {
  await prisma.parametroSistema.deleteMany({ where: { chave } })
}
