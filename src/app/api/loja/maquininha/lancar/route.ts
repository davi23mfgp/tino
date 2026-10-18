import { prisma } from "@/lib/prisma"
import { comSessao, corpo, ErroDeUso, ok } from "@/lib/api"
import { lojaDoLar, proximoNumero } from "@/lib/loja/dados"
import { competenciaDaVenda } from "@/lib/loja/contas"
import { instanteNoFuso } from "@/lib/loja/pedido-agenda"
import { campo, validar, z } from "@/lib/validar"

export const dynamic = "force-dynamic"

const dia = () => z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

/**
 * Lança no Balcão a venda que passou na maquininha e ficou esquecida (passo
 * 51, D e F). A venda nasce na data e hora da maquininha, não agora: é a
 * competência da venda que conta para o limite do MEI. Valor, taxa e quando
 * cai vêm da planilha, que é o que a maquininha cobrou de fato.
 *
 * Entra como comércio no MEI: a planilha não diz se foi peça ou serviço, e
 * a pessoa corrige na tela MEI se foi serviço. O código da venda fica na
 * observação, e lançar duas vezes o mesmo código é recusado.
 */
export const POST = comSessao(async (sessao, requisicao) => {
  const dados = validar(z.object({
    dia: dia(),
    hora: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
    forma: z.enum(["DEBITO", "CREDITO_VISTA", "CREDITO_PARCELADO", "PIX"]).nullable(),
    parcelas: campo.inteiro(1, 24),
    brutoCentavos: campo.centavos().refine((valor) => valor > 0),
    liquidoCentavos: campo.centavos().nullable(),
    previsao: dia().nullable(),
    codigo: campo.texto(60).nullable(),
  }), await corpo(requisicao))
  if (dados.liquidoCentavos !== null && dados.liquidoCentavos > dados.brutoCentavos) throw new ErroDeUso("O líquido não pode passar do valor da venda.")

  const loja = await lojaDoLar(sessao.larId)
  const [lar, perfilMei] = await Promise.all([
    prisma.lar.findUnique({ where: { id: sessao.larId }, select: { fusoHorario: true } }),
    prisma.meiPerfil.findUnique({ where: { larId: sessao.larId }, select: { larId: true } }),
  ])
  const fuso = lar?.fusoHorario ?? "America/Sao_Paulo"
  const observacao = dados.codigo ? `Lançada pela conferência da maquininha · código ${dados.codigo}` : "Lançada pela conferência da maquininha"
  if (dados.codigo && await prisma.vendaLoja.count({ where: { lojaId: loja.id, observacao, cancelada: false } })) {
    throw new ErroDeUso("Esta venda da maquininha já foi lançada.", 409)
  }

  const vendidoEm = instanteNoFuso(dados.dia, dados.hora ?? "12:00", fuso)
  const forma = dados.forma ?? (dados.parcelas > 1 ? "CREDITO_PARCELADO" : "CREDITO_VISTA")
  const liquido = dados.liquidoCentavos ?? dados.brutoCentavos
  const competencia = competenciaDaVenda(vendidoEm, fuso)
  const venda = await prisma.$transaction(async (transacao) => {
    const criada = await transacao.vendaLoja.create({
      data: {
        lojaId: loja.id,
        numero: await proximoNumero(loja.id),
        totalCentavos: dados.brutoCentavos,
        observacao,
        criadoEm: vendidoEm,
        itens: { create: [{ descricao: "Venda na maquininha", quantidade: 1, precoUnitarioCentavos: dados.brutoCentavos, totalCentavos: dados.brutoCentavos }] },
        pagamentos: { create: [{
          forma,
          valorCentavos: dados.brutoCentavos,
          taxaBps: Math.round(((dados.brutoCentavos - liquido) * 10_000) / dados.brutoCentavos),
          valorLiquidoCentavos: liquido,
          previsaoRecebimentoEm: dados.previsao ? instanteNoFuso(dados.previsao, "12:00", fuso) : vendidoEm,
          parcelas: dados.parcelas,
        }] },
      },
      select: { id: true, numero: true },
    })
    if (perfilMei) await transacao.meiCompetencia.upsert({
      where: { larId_competencia: { larId: sessao.larId, competencia } },
      update: { receitaComercioCentavos: { increment: dados.brutoCentavos } },
      create: { larId: sessao.larId, competencia, receitaComercioCentavos: dados.brutoCentavos, receitaServicosCentavos: 0 },
    })
    return criada
  })
  return ok({ venda }, 201)
})
