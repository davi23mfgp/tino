import { prisma } from "@/lib/prisma"
import { comSessao, ok } from "@/lib/api"
import { lojaDoLar } from "@/lib/loja/dados"
import { resumirLoja } from "@/lib/loja/resumo"
import { custoMedioCentavos } from "@/lib/loja/estoque"
import type { Movimento, TipoMovimento } from "@/lib/loja/estoque"
import { indicadoresDaLoja, vendasAcumuladas } from "@/lib/loja/demonstrativo"
import { diaNoFuso, somarDias } from "@/lib/loja/contas"

/**
 * Finanças da loja: o período escolhido e o anterior, do mesmo tamanho.
 *
 * Nunca lê `Conta` nem `Transacao` — a separação do pessoal vem de nascença,
 * não de um filtro (ver comentário em `src/lib/loja/demonstrativo.ts`).
 *
 * O corte é por DIA no fuso do lar, não por instante: "últimos 30 dias" às
 * 22h de Brasília não pode perder a manhã do primeiro dia nem ganhar o dia
 * seguinte em UTC.
 */
const JANELAS = new Set([30, 90, 365])

export const GET = comSessao(async (sessao, requisicao) => {
  const loja = await lojaDoLar(sessao.larId)
  const pedido = Number(new URL(requisicao.url).searchParams.get("dias") ?? 30)
  const dias = JANELAS.has(pedido) ? pedido : 30

  const lar = await prisma.lar.findUnique({ where: { id: sessao.larId }, select: { fusoHorario: true } })
  const fuso = lar?.fusoHorario ?? "America/Sao_Paulo"
  const agora = new Date()
  const hoje = diaNoFuso(agora, fuso)
  const de = somarDias(hoje, -(dias - 1))
  const deAnterior = somarDias(de, -dias)
  const ateAnterior = somarDias(de, -1)
  // Folga de dois dias no corte do banco; o recorte exato é feito por dia abaixo.
  const desde = new Date(Date.parse(`${deAnterior}T00:00:00Z`) - 2 * 86_400_000)

  const [vendas, produtos, saidas, contas] = await Promise.all([
    prisma.vendaLoja.findMany({
      where: { lojaId: loja.id, cancelada: false, criadoEm: { gte: desde } },
      include: { pagamentos: true },
    }),
    prisma.produtoLoja.findMany({
      where: { lojaId: loja.id },
      include: { movimentos: { orderBy: { criadoEm: "asc" } } },
    }),
    prisma.movimentoEstoque.findMany({
      where: { tipo: "SAIDA", criadoEm: { gte: desde }, produto: { lojaId: loja.id } },
      select: { produtoId: true, quantidade: true, criadoEm: true },
    }),
    prisma.contaDaLoja.findMany({
      where: { lojaId: loja.id, paga: true, pagaEm: { gte: desde } },
      select: { descricao: true, categoria: true, valorCentavos: true, pagaEm: true },
    }),
  ])

  // Custo da saída não vem gravado nela (fica zero, ver schema.prisma) — usa o
  // custo médio atual do produto, mesma referência que a Prateleira mostra na
  // margem. Não é o custo exato do dia da venda, é o mesmo compromisso que o
  // resto do app já faz.
  const custoMedioPorProduto = new Map(
    produtos.map((produto) => {
      const movimentos: Movimento[] = produto.movimentos.map((linha) => ({
        tipo: linha.tipo as TipoMovimento,
        quantidade: linha.quantidade,
        custoUnitarioCentavos: linha.custoUnitarioCentavos,
        criadoEm: linha.criadoEm,
      }))
      return [produto.id, custoMedioCentavos(movimentos)]
    }),
  )

  const noDia = (data: Date) => diaNoFuso(data, fuso)
  const entre = (inicio: string, fim: string) => (data: Date) => {
    const dia = noDia(data)
    return dia >= inicio && dia <= fim
  }

  function periodo(inicio: string, fim: string) {
    const dentro = entre(inicio, fim)
    const vendasDoPeriodo = vendas.filter((venda) => dentro(venda.criadoEm))
    return {
      vendasDoPeriodo,
      indicadores: indicadoresDaLoja({
        vendas: vendasDoPeriodo,
        saidasDeEstoque: saidas
          .filter((saida) => dentro(saida.criadoEm))
          .map((saida) => ({ quantidade: saida.quantidade, custoUnitarioCentavos: custoMedioPorProduto.get(saida.produtoId) ?? null })),
        contasPagas: contas.filter((conta) => conta.pagaEm && dentro(conta.pagaEm)),
      }),
    }
  }

  const atual = periodo(de, hoje)
  const anterior = periodo(deAnterior, ateAnterior)
  const resumo = resumirLoja(atual.vendasDoPeriodo, agora)
  const diasDoPeriodo = Array.from({ length: dias }, (_, indice) => somarDias(de, indice))

  return ok({
    dias,
    hoje,
    de,
    deAnterior,
    ateAnterior,
    atual: { ...atual.indicadores, aReceberCentavos: resumo.aReceberCentavos, fiadoCentavos: resumo.fiadoCentavos },
    anterior: anterior.indicadores,
    serie: vendasAcumuladas(
      atual.vendasDoPeriodo.map((venda) => ({ dia: noDia(venda.criadoEm), totalCentavos: venda.totalCentavos })),
      diasDoPeriodo,
    ),
  })
})
