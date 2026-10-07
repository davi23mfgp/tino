import { prisma } from "@/lib/prisma"
import { comSessao, corpo, ok, ErroDeUso } from "@/lib/api"
import { anoDoMei } from "@/lib/loja/mei-ano"

/** O MEI do ano (a conta mora em `anoDoMei`, que a ajuda tributária também usa). */
export const GET = comSessao(async (sessao) => {
  const ano = await anoDoMei(sessao.larId)
  return ok(ano ? { ativo: true, ...ano } : { ativo: false })
})

/** Liga o modo MEI ou atualiza o perfil. */
export const PUT = comSessao(async (sessao, requisicao) => {
  const dados = await corpo<{
    cnpj?: string
    razaoSocial?: string
    atividade?: string
    dataAbertura?: string
    limiteAnualCentavos?: number
    dasMensalCentavos?: number | null
    diaVencimentoDas?: number
    proLaboreCentavos?: number
  }>(requisicao)

  // Limite zero ou dia 40 quebrariam a tela inteira (divisão por zero, DAS
  // vencendo em dia que não existe); recusa aqui, com a mensagem do campo.
  const centavosValidos = (valor: number | undefined) => valor === undefined || (Number.isInteger(valor) && valor >= 0)
  if (dados.limiteAnualCentavos !== undefined && (!Number.isInteger(dados.limiteAnualCentavos) || dados.limiteAnualCentavos <= 0)) throw new ErroDeUso("Informe o limite anual.")
  if ((dados.dasMensalCentavos !== null && !centavosValidos(dados.dasMensalCentavos)) || !centavosValidos(dados.proLaboreCentavos)) throw new ErroDeUso("Confira o valor do DAS e do pró-labore.")
  if (dados.diaVencimentoDas !== undefined && (!Number.isInteger(dados.diaVencimentoDas) || dados.diaVencimentoDas < 1 || dados.diaVencimentoDas > 31)) throw new ErroDeUso("O dia do DAS vai de 1 a 31.")
  if (dados.dataAbertura && Number.isNaN(Date.parse(dados.dataAbertura))) throw new ErroDeUso("Data de abertura inválida.")

  const comum = {
    ...(dados.cnpj !== undefined ? { cnpj: dados.cnpj.replace(/\D/g, "") || null } : {}),
    ...(dados.razaoSocial !== undefined ? { razaoSocial: dados.razaoSocial } : {}),
    ...(dados.atividade !== undefined ? { atividade: dados.atividade as never } : {}),
    ...(dados.dataAbertura !== undefined ? { dataAbertura: dados.dataAbertura ? new Date(dados.dataAbertura) : null } : {}),
    ...(dados.limiteAnualCentavos !== undefined ? { limiteAnualCentavos: dados.limiteAnualCentavos } : {}),
    // `null` volta para a tabela do ano: quem apaga o campo não quer um DAS zero.
    ...(dados.dasMensalCentavos !== undefined ? { dasMensalCentavos: dados.dasMensalCentavos || null } : {}),
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
