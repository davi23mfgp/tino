import { prisma } from "@/lib/prisma"
import { comSessao, corpo, ok, ErroDeUso } from "@/lib/api"
import { CLASSES } from "@/lib/tino/investir"
import { BandeiraCartao, TipoConta } from "@prisma/client"
import { campo, doLar, validar, z } from "@/lib/validar"

type Contexto = { params: Promise<{ id: string }> }

const CLASSES_VALIDAS = new Set<string>(CLASSES.map((linha) => linha.classe))

export const PATCH = comSessao<Contexto>(async (sessao, requisicao, contexto) => {
  const { id } = await contexto.params
  const dados = validar(
    z
      .object({
        nome: campo.textoObrigatorio(80),
        instituicao: campo.texto(80).nullable(),
        tipo: z.enum(TipoConta),
        // Saldo inicial pode ser negativo (conta que já começou no vermelho).
        saldoInicialCentavos: z.coerce.number().int().min(-2_147_483_647).max(2_147_483_647),
        limiteCentavos: campo.centavos().nullable(),
        diaFechamento: campo.dia().nullable(),
        diaVencimento: campo.dia().nullable(),
        membroId: campo.id().nullable(),
        cor: campo.texto(30),
        arquivada: z.boolean(),
        classeDeAtivo: z.string().max(30).nullable(),
        bandeira: z.enum(BandeiraCartao).nullable(),
      })
      .partial()
      .strict(),
    await corpo(requisicao),
  )

  const conta = await prisma.conta.findFirst({ where: { id, larId: sessao.larId } })
  if (!conta) throw new ErroDeUso("Conta não encontrada.", 404)

  const permitidos = [
    "nome",
    "instituicao",
    "tipo",
    "saldoInicialCentavos",
    "limiteCentavos",
    "diaFechamento",
    "diaVencimento",
    "membroId",
    "cor",
    "arquivada",
    "classeDeAtivo",
    "bandeira",
  ] as const

  // Classe de ativo é a carteira do ARCA: aceitar um texto qualquer aqui faria
  // a conta sumir de todas as letras sem erro nenhum.
  if ("classeDeAtivo" in dados && dados.classeDeAtivo !== null) {
    if (!CLASSES_VALIDAS.has(String(dados.classeDeAtivo))) throw new ErroDeUso("Classe de ativo inválida.")
    if (conta.tipo !== "INVESTIMENTO") throw new ErroDeUso("Só conta de investimento tem classe de ativo.")
  }

  await doLar(sessao.larId, { membro: dados.membroId })

  const atualizacao = Object.fromEntries(
    permitidos.filter((nome) => nome in dados).map((nome) => [nome, dados[nome]]),
  )

  return ok(await prisma.conta.update({ where: { id }, data: atualizacao }))
})

export const DELETE = comSessao<Contexto>(async (sessao, _requisicao, contexto) => {
  const { id } = await contexto.params

  const conta = await prisma.conta.findFirst({
    where: { id, larId: sessao.larId },
    include: { _count: { select: { transacoes: true } } },
  })
  if (!conta) throw new ErroDeUso("Conta não encontrada.", 404)

  // Apagar uma conta com histórico levaria o extrato junto e mudaria totais de
  // meses já fechados. Conta com lançamento só pode ser arquivada.
  if (conta._count.transacoes > 0) {
    await prisma.conta.update({ where: { id }, data: { arquivada: true } })
    return ok({ arquivada: true, motivo: "A conta tem lançamentos e foi arquivada em vez de excluída." })
  }

  await prisma.conta.delete({ where: { id } })
  return ok({ removida: true })
})
