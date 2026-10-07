import { prisma } from "@/lib/prisma"
import { avaliarMei, limiteProporcionalMei, situacaoDoDas, vencimentoDoDas } from "@/lib/financeiro"
import { diaNoFuso } from "@/lib/loja/contas"

/**
 * O MEI do ano: limite, faturamento mês a mês e o DAS de cada competência.
 * Saiu da rota `/api/mei` (07/10/2026) para a ajuda tributária usar os
 * mesmos números da tela MEI, em vez de uma segunda conta que poderia
 * discordar dela.
 *
 * Cada venda do Balcão já soma na competência do mês, na mesma transação da venda,
 * então o valor gravado é o faturamento. O total do Balcão vai junto só para a
 * tela dizer de onde veio cada parte (Balcão e o que foi lançado à parte) e
 * para cobrir o mês sem competência nenhuma: vendas feitas antes de o modo
 * MEI ser ligado, que o Balcão não somou.
 */
export async function anoDoMei(larId: string) {
  const perfil = await prisma.meiPerfil.findUnique({ where: { larId: larId } })
  if (!perfil) return null

  const lar = await prisma.lar.findUnique({ where: { id: larId }, select: { fusoHorario: true } })
  const fuso = lar?.fusoHorario ?? "America/Sao_Paulo"
  const hoje = diaNoFuso(new Date(), fuso)
  const agora = hoje.slice(0, 7)
  const ano = Number(agora.slice(0, 4))
  const mesAtual = Number(agora.slice(5, 7))

  // No ano de abertura o limite é proporcional aos meses de atividade: usar o
  // limite cheio faria o app dizer que há folga onde já houve estouro.
  const abriuNesteAno = perfil.dataAbertura !== null && perfil.dataAbertura.getUTCFullYear() === ano
  const mesInicio = abriuNesteAno ? (perfil.dataAbertura as Date).getUTCMonth() + 1 : 1
  const limiteAnualCentavos = abriuNesteAno ? limiteProporcionalMei(perfil.limiteAnualCentavos, mesInicio) : perfil.limiteAnualCentavos

  const [competencias, lojas] = await Promise.all([
    prisma.meiCompetencia.findMany({ where: { larId: larId }, orderBy: { competencia: "asc" } }),
    // Todos os negócios do lar: o MEI tem um CNPJ só, e a capinha vendida no
    // segundo negócio soma no mesmo limite da assistência (passo 38).
    prisma.loja.findMany({ where: { larId: larId }, select: { id: true } }),
  ])

  const balcaoPorMes = new Map<string, number>()
  if (lojas.length) {
    const vendas = await prisma.vendaLoja.findMany({
      where: { lojaId: { in: lojas.map((loja) => loja.id) }, cancelada: false, criadoEm: { gte: new Date(Date.UTC(ano, 0, 1) - 86_400_000) } },
      select: { criadoEm: true, totalCentavos: true },
    })
    for (const venda of vendas) {
      const mes = diaNoFuso(venda.criadoEm, fuso).slice(0, 7)
      if (mes.startsWith(String(ano))) balcaoPorMes.set(mes, (balcaoPorMes.get(mes) ?? 0) + venda.totalCentavos)
    }
  }

  const porCompetencia = new Map(competencias.map((linha) => [linha.competencia, linha]))
  const meses = Array.from({ length: mesAtual - mesInicio + 1 }, (_, indice) => {
    const competencia = `${ano}-${String(mesInicio + indice).padStart(2, "0")}`
    const linha = porCompetencia.get(competencia)
    const lancadoCentavos = linha ? linha.receitaComercioCentavos + linha.receitaServicosCentavos : 0
    const balcaoCentavos = balcaoPorMes.get(competencia) ?? 0
    return {
      competencia,
      lancamento: linha ?? null,
      lancadoCentavos,
      balcaoCentavos,
      faturamentoCentavos: lancadoCentavos > 0 ? lancadoCentavos : balcaoCentavos,
      fonte: lancadoCentavos > 0 ? "lancado" : balcaoCentavos > 0 ? "balcao" : "nenhum",
      das: {
        vencimento: vencimentoDoDas(competencia, perfil.diaVencimentoDas),
        situacao: situacaoDoDas(competencia, linha?.dasPago ?? false, hoje, perfil.diaVencimentoDas),
        // Sem registro nenhum não dá para dizer que ficou sem pagar: o mês
        // só não foi lançado. A tela mostra "sem registro", não "atrasado".
        registrado: Boolean(linha),
        valorCentavos: linha?.dasValorCentavos || perfil.dasMensalCentavos,
      },
    }
  })

  const situacao = avaliarMei({
    faturamentoPorCompetencia: meses.map((mes) => ({ competencia: mes.competencia, valorCentavos: mes.faturamentoCentavos })),
    limiteAnualCentavos,
    mesAtual,
    ano,
    mesInicio,
  })

  return {
    hoje,
    perfil: { ...perfil, limiteAnualEfetivoCentavos: limiteAnualCentavos, limiteProporcional: abriuNesteAno },
    meses,
    situacao,
  }
}
