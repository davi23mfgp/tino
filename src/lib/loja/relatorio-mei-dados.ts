import { prisma } from "@/lib/prisma"
import { diaNoFuso } from "@/lib/loja/contas"
import { montarRelatorio, pendenciaDaNota, prazoDoRelatorio, statusDaNota, type Pendencia, type StatusDaNota } from "@/lib/loja/relatorio-mei"

/**
 * Tudo que a tela "Fechar o mês" e a planilha precisam de um mês: as vendas do
 * Balcão de todos os negócios do lar (o MEI tem um CNPJ só, como em `anoDoMei`),
 * o status da nota de cada uma, as notas emitidas, o DAS e o relatório pronto.
 */
export interface VendaDoRelatorio {
  id: string
  numero: number
  dia: string
  cliente: string | null
  totalCentavos: number
  status: StatusDaNota
  /** Número da nota emitida pelo Tino, quando existe. */
  notaNumero: number | null
  notaEmitida: boolean
  /** A nota que o dono anexou (cópia de fora do Tino), sem o conteúdo: o arquivo só sai pela rota de download. */
  anexo: { nome: string; tamanhoBytes: number } | null
  pendencia: Pendencia
}

export async function dadosDoRelatorio(larId: string, competencia: string) {
  const [perfil, lar, lojas] = await Promise.all([
    prisma.meiPerfil.findUnique({ where: { larId } }),
    prisma.lar.findUnique({ where: { id: larId }, select: { fusoHorario: true } }),
    prisma.loja.findMany({ where: { larId }, select: { id: true } }),
  ])
  if (!perfil) return null
  const fuso = lar?.fusoHorario ?? "America/Sao_Paulo"
  const [ano, mes] = competencia.split("-").map(Number)
  // Uma folga de um dia para cada lado: o corte do mês é no fuso da pessoa, não em UTC.
  const de = new Date(Date.UTC(ano, mes - 1, 1) - 86_400_000)
  const ate = new Date(Date.UTC(ano, mes, 1) + 86_400_000)

  const [brutas, lancamento] = await Promise.all([
    lojas.length
      ? prisma.vendaLoja.findMany({
          where: { lojaId: { in: lojas.map((loja) => loja.id) }, cancelada: false, criadoEm: { gte: de, lt: ate } },
          orderBy: { criadoEm: "asc" },
          include: { itens: { select: { totalCentavos: true, servicoId: true } }, notaFiscal: { select: { status: true, numero: true } }, notaAnexada: { select: { nome: true, tamanhoBytes: true } }, cliente: { select: { nome: true } } },
        })
      : Promise.resolve([]),
    prisma.meiCompetencia.findUnique({ where: { larId_competencia: { larId, competencia } } }),
  ])

  const vendas: VendaDoRelatorio[] = brutas
    .filter((venda) => diaNoFuso(venda.criadoEm, fuso).slice(0, 7) === competencia)
    .map((venda) => {
      const notaEmitida = venda.notaFiscal?.status === "EMITIDA"
      return {
        id: venda.id,
        numero: venda.numero,
        dia: diaNoFuso(venda.criadoEm, fuso),
        cliente: venda.cliente?.nome ?? null,
        totalCentavos: venda.totalCentavos,
        status: statusDaNota({ comNota: venda.comNota, notaEmitida }),
        notaNumero: notaEmitida ? (venda.notaFiscal?.numero ?? null) : null,
        notaEmitida,
        anexo: venda.notaAnexada,
        pendencia: pendenciaDaNota({ status: statusDaNota({ comNota: venda.comNota, notaEmitida }), notaEmitida, temAnexo: venda.notaAnexada !== null }),
      }
    })

  const lancado = lancamento ? { comercioCentavos: lancamento.receitaComercioCentavos, servicosCentavos: lancamento.receitaServicosCentavos } : null
  const relatorio = montarRelatorio(
    brutas
      .filter((venda) => diaNoFuso(venda.criadoEm, fuso).slice(0, 7) === competencia)
      .map((venda) => ({ totalCentavos: venda.totalCentavos, comNota: venda.comNota, notaEmitida: venda.notaFiscal?.status === "EMITIDA", itens: venda.itens.map((item) => ({ totalCentavos: item.totalCentavos, ehServico: item.servicoId !== null })) })),
    lancado,
  )
  const usouLancamento = lancado !== null && lancado.comercioCentavos + lancado.servicosCentavos > 0

  return {
    competencia,
    prazo: prazoDoRelatorio(competencia),
    empresa: { razaoSocial: perfil.razaoSocial, cnpj: perfil.cnpj },
    relatorio,
    /** Quando o mês foi lançado à parte, o relatório vale o lançamento e as vendas abaixo não somam. */
    usouLancamento,
    vendas,
    /** As duas pendências juntas: é o número do "pendentes de nota". */
    pendentes: vendas.filter((venda) => venda.pendencia !== null).length,
    aMarcar: vendas.filter((venda) => venda.pendencia === "marcar").length,
    aAnexar: vendas.filter((venda) => venda.pendencia === "anexar").length,
    notasEmitidas: vendas.filter((venda) => venda.notaEmitida).length,
    das: { registrado: Boolean(lancamento), pago: lancamento?.dasPago ?? false },
  }
}
