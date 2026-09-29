import { prisma } from "@/lib/prisma"
import { comSessao, corpo, ErroDeUso, ok } from "@/lib/api"
import { caixaAberto, lojaDoLar, regrasDeRecebimento } from "@/lib/loja/dados"
import { resumoDoCaixa } from "@/lib/loja/venda"
import type { FormaPagamento } from "@/lib/loja/venda"
import { aCairPorDia, resumirLoja } from "@/lib/loja/resumo"

/**
 * Estado da loja: o que a tela de balcão precisa para abrir.
 *
 * Vem tudo junto de propósito. Três chamadas separadas fariam a tela montar em
 * pedaços, e balcão de loja não tem paciência para tela que pisca.
 */
export const GET = comSessao(async (sessao) => {
  const loja = await lojaDoLar(sessao.larId)

  const [produtos, regras, caixa, ultimasVendas] = await Promise.all([
    prisma.produtoLoja.findMany({
      where: { lojaId: loja.id, ativo: true },
      orderBy: { nome: "asc" },
      take: 200,
    }),
    regrasDeRecebimento(loja.id),
    caixaAberto(loja.id),
    prisma.vendaLoja.findMany({
      where: { lojaId: loja.id, cancelada: false },
      orderBy: { criadoEm: "desc" },
      take: 20,
      include: { pagamentos: true, itens: true, cliente: true, notaFiscal: { select: { status: true } } },
    }),
  ])

  // Trinta dias é a janela do aluguel e do fornecedor: é nesse prazo que o
  // dono precisa saber se o dinheiro chega.
  const desde = new Date(Date.now() - 30 * 86_400_000)
  const vendasDoMes = await prisma.vendaLoja.findMany({
    where: { lojaId: loja.id, criadoEm: { gte: desde } },
    include: { pagamentos: true },
  })

  const vendasDoCaixa = caixa
    ? await prisma.vendaLoja.findMany({
        where: { caixaId: caixa.id, cancelada: false },
        include: { pagamentos: true },
      })
    : []

  return ok({
    loja,
    produtos,
    regras,
    caixa: caixa
      ? {
          ...caixa,
          resumo: resumoDoCaixa({
            aberturaCentavos: caixa.aberturaCentavos,
            vendas: vendasDoCaixa.map((venda) => ({
              formas: venda.pagamentos.map((pagamento) => ({
                forma: pagamento.forma as FormaPagamento,
                valorCentavos: pagamento.valorCentavos,
              })),
            })),
            sangriasCentavos: caixa.sangrias.map((sangria) => sangria.valorCentavos),
          }),
        }
      : null,
    ultimasVendas,
    resumo: resumirLoja(vendasDoMes),
    aCair: aCairPorDia(vendasDoMes, 30),
  })
})

/**
 * Renomeia a loja, grava a taxa e o prazo de cada forma de pagamento, e os
 * dados fiscais usados na emissão de nota (CNPJ, inscrição estadual).
 *
 * `certificadoConfiguradoEm` não entra aqui: quem confirma que o certificado
 * está de pé é o provedor de emissão, não um campo que o dono preenche à mão.
 */
export const PUT = comSessao(async (sessao, requisicao) => {
  const dados = await corpo<{
    nome?: string
    endereco?: string
    cnpj?: string
    inscricaoEstadual?: string
    regras?: { forma: FormaPagamento; taxaBps: number; prazoDias: number }[]
  }>(requisicao)

  const loja = await lojaDoLar(sessao.larId)

  const camposSimples = ["nome", "endereco", "cnpj", "inscricaoEstadual"] as const
  if (camposSimples.some((campo) => dados[campo] !== undefined)) {
    await prisma.loja.update({
      where: { id: loja.id },
      data: {
        ...(dados.nome !== undefined ? { nome: dados.nome } : {}),
        ...(dados.endereco !== undefined ? { endereco: dados.endereco } : {}),
        ...(dados.cnpj !== undefined ? { cnpj: dados.cnpj.replace(/\D/g, "") || null } : {}),
        ...(dados.inscricaoEstadual !== undefined ? { inscricaoEstadual: dados.inscricaoEstadual || null } : {}),
      },
    })
  }

  // Taxa fora de 0–99,99% ou prazo quebrado viraria líquido negativo ou data
  // de recebimento impossível em toda venda seguinte.
  const FORMAS = new Set(["DINHEIRO", "PIX", "DEBITO", "CREDITO_VISTA", "CREDITO_PARCELADO", "FIADO"])
  for (const regra of dados.regras ?? []) {
    if (!FORMAS.has(regra.forma)) throw new ErroDeUso("Forma de pagamento desconhecida.")
    if (!Number.isInteger(regra.taxaBps) || regra.taxaBps < 0 || regra.taxaBps >= 10_000) throw new ErroDeUso("Taxa precisa estar entre 0% e 99,99%.")
    if (!Number.isInteger(regra.prazoDias) || regra.prazoDias < 0 || regra.prazoDias > 365) throw new ErroDeUso("Prazo precisa estar entre 0 e 365 dias.")
  }

  for (const regra of dados.regras ?? []) {
    await prisma.formaRecebimento.upsert({
      where: { lojaId_forma: { lojaId: loja.id, forma: regra.forma } },
      update: { taxaBps: regra.taxaBps, prazoDias: regra.prazoDias },
      create: { lojaId: loja.id, forma: regra.forma, taxaBps: regra.taxaBps, prazoDias: regra.prazoDias },
    })
  }

  return ok({ atualizado: true })
})
