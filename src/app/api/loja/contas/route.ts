import { prisma } from "@/lib/prisma"
import { diaDoVencimento, diaNoFuso, resumoDasContas, situacaoDaConta } from "@/lib/loja/contas"
import { comSessao, corpo, exigir, ok, ErroDeUso } from "@/lib/api"
import { campo, validar, z } from "@/lib/validar"
import { lojaDoLar } from "@/lib/loja/dados"

export const dynamic = "force-dynamic"

/**
 * Contas que a loja paga para existir.
 *
 * Separadas das despesas pessoais de propósito: misturar o aluguel do box com o
 * aluguel de casa é o que faz o MEI achar que lucrou quando só girou dinheiro.
 */
export const GET = comSessao(async (sessao) => {
  const loja = await lojaDoLar(sessao.larId)

  const contas = await prisma.contaDaLoja.findMany({
    where: { lojaId: loja.id },
    orderBy: [{ paga: "asc" }, { vencimento: "asc" }],
    take: 200,
  })

  // Por dia, no fuso do lar: comparar com o instante fazia a conta do dia
  // aparecer como vencida (ver lib/loja/contas.ts).
  const lar = await prisma.lar.findUnique({ where: { id: sessao.larId }, select: { fusoHorario: true } })
  const fuso = lar?.fusoHorario ?? "America/Sao_Paulo"
  const hoje = diaNoFuso(new Date(), fuso)

  return ok({
    hoje,
    // `dia` e `pagaNoDia` já vão como texto de dia: o navegador não sabe o fuso
    // do lar, e converter o instante lá recria o erro do "vencida às 21h".
    contas: contas.map((conta) => ({
      ...conta,
      dia: diaDoVencimento(conta.vencimento),
      pagaNoDia: conta.pagaEm ? diaNoFuso(conta.pagaEm, fuso) : null,
      situacao: situacaoDaConta(conta, hoje),
    })),
    resumo: resumoDasContas(contas, hoje, fuso),
  })
})

export const POST = comSessao(async (sessao, requisicao) => {
  const dados = await corpo<{
    descricao: string
    categoria?: string
    valorCentavos: number
    vencimento: string
    mensal?: boolean
  }>(requisicao)

  const loja = await lojaDoLar(sessao.larId)

  // Valor e data entravam crus: "10.5", texto ou data inválida viravam erro 500
  // (auditoria, Lote 5).
  const valor = campo.centavos().safeParse(dados.valorCentavos)
  if (!valor.success || valor.data <= 0) throw new ErroDeUso("Informe o valor da conta.")
  if (Number.isNaN(new Date(dados.vencimento).getTime())) throw new ErroDeUso("Informe o vencimento.")

  const conta = await prisma.contaDaLoja.create({
    data: {
      lojaId: loja.id,
      descricao: exigir(dados.descricao, "Informe do que é a conta").trim(),
      categoria: (dados.categoria ?? "OUTRO") as never,
      valorCentavos: valor.data,
      vencimento: new Date(dados.vencimento),
      mensal: dados.mensal ?? false,
    },
  })

  return ok({ conta }, 201)
})

/**
 * Dá baixa.
 *
 * Conta marcada como mensal cria a do mês seguinte na hora do pagamento, e não
 * antes: gerar doze de uma vez encheria a lista de coisa que ainda não é
 * problema, e mudar o valor do aluguel obrigaria a corrigir onze linhas.
 */
export const PATCH = comSessao(async (sessao, requisicao) => {
  // Sem o id, o Prisma tirava o campo do filtro e dava baixa na primeira conta
  // da loja (reproduzido na auditoria, Lote 5, com um corpo vazio).
  const dados = validar(z.object({ id: campo.id() }), await corpo(requisicao))

  const loja = await lojaDoLar(sessao.larId)
  const conta = await prisma.contaDaLoja.findFirst({ where: { id: dados.id, lojaId: loja.id } })
  if (!conta) throw new ErroDeUso("Conta não encontrada.", 404)
  if (conta.paga) throw new ErroDeUso("Essa conta já estava paga.")

  // A baixa e a conta do mês seguinte valem juntas, e só para quem marcou
  // primeiro: dois toques em "Paguei" criavam duas contas no mês seguinte.
  await prisma.$transaction(async (tx) => {
  const { count } = await tx.contaDaLoja.updateMany({
    where: { id: conta.id, paga: false },
    data: { paga: true, pagaEm: new Date() },
  })
  if (count === 0) throw new ErroDeUso("Essa conta já estava paga.")

  if (conta.mensal) {
    const proximo = new Date(conta.vencimento)
    // Prende o dia ao último do mês de destino: vencimento dia 31 não pode
    // escorregar para março quando o mês seguinte é fevereiro.
    const dia = proximo.getUTCDate()
    const mesAlvo = proximo.getUTCMonth() + 1
    const ultimoDia = new Date(Date.UTC(proximo.getUTCFullYear(), mesAlvo + 1, 0)).getUTCDate()

    await tx.contaDaLoja.create({
      data: {
        lojaId: loja.id,
        descricao: conta.descricao,
        categoria: conta.categoria,
        valorCentavos: conta.valorCentavos,
        vencimento: new Date(Date.UTC(proximo.getUTCFullYear(), mesAlvo, Math.min(dia, ultimoDia))),
        mensal: true,
      },
    })
  }
  })

  return ok({ paga: true })
})

export const DELETE = comSessao(async (sessao, requisicao) => {
  const id = new URL(requisicao.url).searchParams.get("id")
  if (!id) throw new ErroDeUso("Informe qual conta apagar.")

  const loja = await lojaDoLar(sessao.larId)
  await prisma.contaDaLoja.deleteMany({ where: { id, lojaId: loja.id } })

  return ok({ apagada: true })
})
