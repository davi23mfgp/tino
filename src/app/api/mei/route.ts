import { prisma } from "@/lib/prisma"
import { comSessao, corpo, ok, ErroDeUso } from "@/lib/api"
import { avaliarMei, limiteProporcionalMei, situacaoDoDas, vencimentoDoDas } from "@/lib/financeiro"
import { diaNoFuso } from "@/lib/loja/contas"

/**
 * O MEI do ano: limite, faturamento mês a mês e o DAS de cada competência.
 *
 * Cada venda do Balcão já soma na competência do mês, na mesma transação da venda,
 * então o valor gravado é o faturamento. O total do Balcão vai junto só para a
 * tela dizer de onde veio cada parte (Balcão e o que foi lançado à parte) e
 * para cobrir o mês sem competência nenhuma — vendas feitas antes de o modo
 * MEI ser ligado, que o Balcão não somou.
 */
export const GET = comSessao(async (sessao) => {
  const perfil = await prisma.meiPerfil.findUnique({ where: { larId: sessao.larId } })
  if (!perfil) return ok({ ativo: false })

  const lar = await prisma.lar.findUnique({ where: { id: sessao.larId }, select: { fusoHorario: true } })
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
    prisma.meiCompetencia.findMany({ where: { larId: sessao.larId }, orderBy: { competencia: "asc" } }),
    // Todos os negócios do lar: o MEI tem um CNPJ só, e a capinha vendida no
    // segundo negócio soma no mesmo limite da assistência (passo 38).
    prisma.loja.findMany({ where: { larId: sessao.larId }, select: { id: true } }),
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

  return ok({
    ativo: true,
    hoje,
    perfil: { ...perfil, limiteAnualEfetivoCentavos: limiteAnualCentavos, limiteProporcional: abriuNesteAno },
    meses,
    situacao,
  })
})

/** Liga o modo MEI ou atualiza o perfil. */
export const PUT = comSessao(async (sessao, requisicao) => {
  const dados = await corpo<{
    cnpj?: string
    razaoSocial?: string
    atividade?: string
    dataAbertura?: string
    limiteAnualCentavos?: number
    dasMensalCentavos?: number
    diaVencimentoDas?: number
    proLaboreCentavos?: number
  }>(requisicao)

  // Limite zero ou dia 40 quebrariam a tela inteira (divisão por zero, DAS
  // vencendo em dia que não existe); recusa aqui, com a mensagem do campo.
  const centavosValidos = (valor: number | undefined) => valor === undefined || (Number.isInteger(valor) && valor >= 0)
  if (dados.limiteAnualCentavos !== undefined && (!Number.isInteger(dados.limiteAnualCentavos) || dados.limiteAnualCentavos <= 0)) throw new ErroDeUso("Informe o limite anual.")
  if (!centavosValidos(dados.dasMensalCentavos) || !centavosValidos(dados.proLaboreCentavos)) throw new ErroDeUso("Confira o valor do DAS e do pró-labore.")
  if (dados.diaVencimentoDas !== undefined && (!Number.isInteger(dados.diaVencimentoDas) || dados.diaVencimentoDas < 1 || dados.diaVencimentoDas > 31)) throw new ErroDeUso("O dia do DAS vai de 1 a 31.")
  if (dados.dataAbertura && Number.isNaN(Date.parse(dados.dataAbertura))) throw new ErroDeUso("Data de abertura inválida.")

  const comum = {
    ...(dados.cnpj !== undefined ? { cnpj: dados.cnpj.replace(/\D/g, "") || null } : {}),
    ...(dados.razaoSocial !== undefined ? { razaoSocial: dados.razaoSocial } : {}),
    ...(dados.atividade !== undefined ? { atividade: dados.atividade as never } : {}),
    ...(dados.dataAbertura !== undefined ? { dataAbertura: dados.dataAbertura ? new Date(dados.dataAbertura) : null } : {}),
    ...(dados.limiteAnualCentavos !== undefined ? { limiteAnualCentavos: dados.limiteAnualCentavos } : {}),
    ...(dados.dasMensalCentavos !== undefined ? { dasMensalCentavos: dados.dasMensalCentavos } : {}),
    ...(dados.diaVencimentoDas !== undefined ? { diaVencimentoDas: dados.diaVencimentoDas } : {}),
    ...(dados.proLaboreCentavos !== undefined ? { proLaboreCentavos: dados.proLaboreCentavos } : {}),
  }

  const perfil = await prisma.meiPerfil.upsert({
    where: { larId: sessao.larId },
    update: comum,
    create: { larId: sessao.larId, ...comum },
  })

  return ok(perfil)
})

/** Lança o faturamento e a baixa do DAS de uma competência. */
export const POST = comSessao(async (sessao, requisicao) => {
  const dados = await corpo<{
    competencia: string
    receitaComercioCentavos?: number
    receitaServicosCentavos?: number
    dasPago?: boolean
    dasValorCentavos?: number
    observacao?: string
  }>(requisicao)

  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(dados.competencia ?? "")) {
    throw new ErroDeUso("Competência inválida. Use o formato AAAA-MM.")
  }

  for (const valor of [dados.receitaComercioCentavos, dados.receitaServicosCentavos, dados.dasValorCentavos]) {
    if (valor !== undefined && (!Number.isInteger(valor) || valor < 0)) throw new ErroDeUso("Valores do mês precisam ser zero ou mais.")
  }

  const conteudo = {
    receitaComercioCentavos: dados.receitaComercioCentavos ?? 0,
    receitaServicosCentavos: dados.receitaServicosCentavos ?? 0,
    dasPago: dados.dasPago ?? false,
    dasPagoEm: dados.dasPago ? new Date() : null,
    dasValorCentavos: dados.dasValorCentavos ?? 0,
    observacao: dados.observacao ?? null,
  }

  const competencia = await prisma.meiCompetencia.upsert({
    where: { larId_competencia: { larId: sessao.larId, competencia: dados.competencia } },
    update: conteudo,
    create: { larId: sessao.larId, competencia: dados.competencia, ...conteudo },
  })

  return ok(competencia)
})

export const DELETE = comSessao(async (sessao) => {
  // Desligar o modo MEI apaga o perfil, mas nunca o histórico de faturamento:
  // ele é a prova do que foi declarado, e pode ser preciso anos depois.
  await prisma.meiPerfil.deleteMany({ where: { larId: sessao.larId } })
  return ok({ desativado: true })
})
